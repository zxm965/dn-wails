package appupdate

// windowsUpdateScript is run by a detached PowerShell process after the
// current application has been asked to quit. It deliberately keeps the
// installer orchestration outside the application process: NSIS must be able
// to replace the installed executable after Windows releases its image lock.
const windowsUpdateScript = `param(
  [int]$ProcessId,
  [string]$InstallerPath,
  [string]$ExecutablePath,
  [string]$LogPath
)

$ErrorActionPreference = 'Stop'

function Write-UpdateLog {
  param([string]$Message)
  $timestamp = [DateTime]::UtcNow.ToString('o')
  Add-Content -LiteralPath $LogPath -Value "$timestamp $Message" -Encoding utf8
}

function Wait-ForProcessExit {
  $deadline = [DateTime]::UtcNow.AddSeconds(60)
  while ($true) {
    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($null -eq $process) {
      break
    }
    if ([DateTime]::UtcNow -ge $deadline) {
      throw "timed out waiting for process $ProcessId to exit"
    }
    Start-Sleep -Milliseconds 250
  }

  # Windows can keep an executable image locked briefly after its process has
  # exited. Give the loader a short grace period before invoking NSIS.
  Start-Sleep -Milliseconds 1000
}

function Get-ExecutableHash {
  if (-not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) {
    return ''
  }
  return (Get-FileHash -LiteralPath $ExecutablePath -Algorithm SHA256).Hash
}

try {
  Write-UpdateLog "update helper started (pid=$ProcessId installer=$InstallerPath executable=$ExecutablePath)"
  $applicationDirectory = Split-Path -Parent $ExecutablePath
  if (-not (Test-Path -LiteralPath $applicationDirectory -PathType Container)) {
    throw "application directory does not exist: $applicationDirectory"
  }
  Write-UpdateLog "install target resolved to $applicationDirectory"
  Wait-ForProcessExit
  $oldHash = Get-ExecutableHash
  $installerDirectory = Split-Path -Parent $InstallerPath
  $installed = $false

  # NSIS may race with the Windows loader while the old executable is being
  # released. Retry only a bounded number of times and keep every exit code in
  # the log so a failed update is diagnosable without a visible console.
  for ($attempt = 1; $attempt -le 20; $attempt++) {
    # NSIS does not retain a directory selected by a previous installation in
    # silent mode. /D must be the final argument and deliberately remains
    # unquoted: NSIS consumes the rest of the command line as the directory,
    # including spaces. This keeps custom and non-system-drive installations
    # in place instead of silently writing the update to the default C: path.
    $installer = Start-Process -FilePath $InstallerPath -ArgumentList @('/S', "/D=$applicationDirectory") -WorkingDirectory $installerDirectory -Wait -PassThru
    Write-UpdateLog "installer attempt $attempt exited with code $($installer.ExitCode)"
    if ($installer.ExitCode -eq 0) {
      $newHash = Get-ExecutableHash
      if ($newHash -and $newHash -ne $oldHash) {
        $installed = $true
        break
      }
      Write-UpdateLog "installer reported success but executable hash did not change"
    }
    if ($attempt -lt 20) {
      Start-Sleep -Milliseconds 750
    }
  }

  if (-not $installed) {
    throw 'installer did not replace the installed executable'
  }

  # Let NSIS and the single-instance cleanup finish before starting the new
  # process. Start-Process returns after launch, so verify that it did not
  # immediately terminate with a startup error.
  Start-Sleep -Milliseconds 1000
  $restarted = $null
  for ($attempt = 1; $attempt -le 3; $attempt++) {
    $restarted = Start-Process -FilePath $ExecutablePath -WorkingDirectory $applicationDirectory -PassThru
    Start-Sleep -Milliseconds 1500
    if (-not $restarted.HasExited) {
      Write-UpdateLog "update helper restarted application successfully on attempt $attempt"
      exit 0
    }
    Write-UpdateLog "restart attempt $attempt exited with code $($restarted.ExitCode)"
    if ($attempt -lt 3) {
      Start-Sleep -Milliseconds 1500
    }
  }
  throw "restarted application exited with code $($restarted.ExitCode)"
} catch {
  Write-UpdateLog "update helper failed: $($_.Exception.Message)"
  # A failed silent update must not leave the user with an application that
  # simply disappeared. Best-effort recovery reopens the existing executable;
  # the retained log still contains the actual installer failure.
  try {
    if (Test-Path -LiteralPath $ExecutablePath -PathType Leaf) {
      $applicationDirectory = Split-Path -Parent $ExecutablePath
      Start-Process -FilePath $ExecutablePath -WorkingDirectory $applicationDirectory | Out-Null
      Write-UpdateLog "restarted existing application after update failure"
    }
  } catch {
    Write-UpdateLog "failed to restart existing application: $($_.Exception.Message)"
  }
  exit 1
}
`
