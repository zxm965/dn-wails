param([Parameter(Mandatory = $true)][string]$ConfigPath)

$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Write-UpdateLog {
  param([string]$Message)
  # Logging must never prevent rollback. The launcher also captures stderr.
  [Console]::Error.WriteLine("$([DateTime]::UtcNow.ToString('o')) $Message")
}

function Write-UpdateResult {
  param([string]$Status, [string]$Message = '')
  $result = @{ status = $Status; version = $config.version; message = $Message; logPath = $config.logPath }
  $temporary = "$($config.resultPath).tmp"
  [IO.File]::WriteAllText($temporary, ($result | ConvertTo-Json -Compress), $utf8)
  Move-Item -LiteralPath $temporary -Destination $config.resultPath -Force
}

function Get-UpdateHash {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return '' }
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

function Test-UpdateParentRunning {
  return $null -ne (Get-Process -Id $config.processId -ErrorAction SilentlyContinue)
}

function Restore-UpdateExecutable {
  param([string]$Backup, [string]$Destination)
  # A newly failed process can briefly retain its executable image lock too.
  for ($attempt = 1; $attempt -le 10; $attempt++) {
    try {
      Copy-Item -LiteralPath $Backup -Destination $Destination -Force
      if ((Get-UpdateHash $Backup) -ne (Get-UpdateHash $Destination)) { throw 'restored executable hash mismatch' }
      return
    } catch {
      if ($attempt -eq 10) { throw }
      Start-Sleep -Milliseconds 250
    }
  }
}

function Start-UpdateProcess {
  param([string]$Path, [string]$Arguments, [string]$Directory)
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $Path
  $startInfo.Arguments = $Arguments
  $startInfo.WorkingDirectory = $Directory
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  return [Diagnostics.Process]::Start($startInfo)
}

function Stop-UpdateProcessTree {
  param($Process)
  if ($Process.HasExited) { return }
  $killer = Start-UpdateProcess -Path "$env:SystemRoot\System32\taskkill.exe" -Arguments "/PID $($Process.Id) /T /F" -Directory $config.workDirectory
  try {
    if (-not $killer.WaitForExit(10000)) { throw 'taskkill timed out; installer may still be running' }
    if ($killer.ExitCode -ne 0) { throw "taskkill failed with exit code $($killer.ExitCode)" }
    if (-not $Process.WaitForExit(10000)) { throw 'installer did not stop after taskkill' }
  } finally {
    $killer.Dispose()
  }
}

$parentExited = $false
$installationStarted = $false
$safeToRecover = $true
$installer = $null
$restarted = $null
$targetExisted = $false
$targetBackup = Join-Path $config.workDirectory 'previous-target.exe'
$currentBackup = Join-Path $config.workDirectory 'previous-current.exe'
$applicationDirectory = Split-Path -Parent $config.targetPath

try {
  Write-UpdateLog "helper starting; parent=$($config.processId); target=$($config.targetPath); version=$($config.version)"
  if ((Get-UpdateHash $config.installerPath) -ne $config.installerSHA256) {
    throw 'staged installer SHA-256 mismatch'
  }
  if (-not (Test-Path -LiteralPath $config.executablePath -PathType Leaf)) {
    throw 'current executable is missing'
  }
  if ($config.executableSHA256 -notmatch '^[a-fA-F0-9]{64}$') {
    throw 'expected executable SHA-256 is invalid'
  }
  # Probe before asking the application to quit (including legacy Program
  # Files installations that cannot be updated by a per-user installer).
  $probe = Join-Path $applicationDirectory ([IO.Path]::GetRandomFileName())
  try { [IO.File]::WriteAllText($probe, 'probe', $utf8) }
  finally { if (Test-Path -LiteralPath $probe) { Remove-Item -LiteralPath $probe -Force } }
  Copy-Item -LiteralPath $config.executablePath -Destination $currentBackup -Force
  $targetExisted = Test-Path -LiteralPath $config.targetPath -PathType Leaf
  if ($targetExisted) {
    Copy-Item -LiteralPath $config.targetPath -Destination $targetBackup -Force
  }
  Write-UpdateResult 'prepared'
  [IO.File]::WriteAllText($config.readyPath, 'ready', $utf8)
  Write-UpdateLog 'helper ready; waiting for parent commit and exit'
  $parentDeadline = [DateTime]::UtcNow.AddSeconds($config.parentTimeoutSeconds)
  while ($true) {
    if ([DateTime]::UtcNow -ge $parentDeadline) { throw 'timed out waiting for parent commit and exit' }
    $committed = (Test-Path -LiteralPath $config.commitPath) -and (([IO.File]::ReadAllText($config.commitPath)) -eq 'commit')
    if ($committed -and -not (Test-UpdateParentRunning)) { break }
    Start-Sleep -Milliseconds 100
  }
  $parentExited = $true
  Start-Sleep -Milliseconds 1000
  Write-UpdateResult 'installing'
  $deadline = [DateTime]::UtcNow.AddSeconds($config.installTimeoutSeconds)
  $installed = $false
  for ($attempt = 1; $attempt -le 10; $attempt++) {
    $remaining = [int][Math]::Floor(($deadline - [DateTime]::UtcNow).TotalMilliseconds)
    if ($remaining -le 0) { throw 'installer deadline exceeded' }
    Write-UpdateLog "starting installer attempt $attempt"
    # NSIS /D is deliberately unquoted and last, including paths with spaces.
    # /UPDATE avoids running the WebView2 bootstrapper for an existing app.
    $installer = Start-UpdateProcess -Path $config.installerPath -Arguments "/S /UPDATE /D=$applicationDirectory" -Directory $config.workDirectory
    $installationStarted = $true
    if (-not $installer.WaitForExit($remaining)) {
      $safeToRecover = $false
      Stop-UpdateProcessTree $installer
      $safeToRecover = $true
      throw 'installer timed out and was stopped'
    }
    $exitCode = $installer.ExitCode
    $installer.Dispose()
    $installer = $null
    Write-UpdateLog "installer attempt $attempt exited with code $exitCode"
    if ($exitCode -eq 0) {
      if ((Get-UpdateHash $config.targetPath) -ne $config.executableSHA256) {
        throw 'installed executable SHA-256 does not match the requested release'
      }
      $installed = $true
      break
    }
    # Only retry the explicit NSIS file-write error; other failures need action.
    if ($exitCode -ne 73) { throw "installer failed with exit code $exitCode" }
    Start-Sleep -Milliseconds 750
  }
  if (-not $installed) { throw 'installer could not replace the executable after bounded retries' }

  Write-UpdateLog 'verified installed executable; restarting application'
  # Persist before launch so the new application's first Info call never sees
  # a stale "installing" result. Launch failure replaces it with "failed".
  Write-UpdateResult 'succeeded'
  $restarted = Start-UpdateProcess -Path $config.targetPath -Arguments '' -Directory $applicationDirectory
  if ($restarted.WaitForExit(1500)) { throw "updated application exited early with code $($restarted.ExitCode)" }
  $restarted.Dispose()
  $restarted = $null
  Write-UpdateLog 'update succeeded; application restarted'
  try { Remove-Item -LiteralPath $config.workDirectory -Recurse -Force }
  catch { Write-UpdateLog "update completed, but staging cleanup failed: $($_.Exception.Message)" }
  exit 0
} catch {
  $failure = $_.Exception.Message
  Write-UpdateLog "update failed: $failure"
  # Stop any process that may still be touching the target before rollback.
  try {
    if ($null -ne $installer -and -not $installer.HasExited) {
      $safeToRecover = $false
      Stop-UpdateProcessTree $installer
      $safeToRecover = $true
    }
    if ($null -ne $restarted -and -not $restarted.HasExited) {
      $safeToRecover = $false
      Stop-UpdateProcessTree $restarted
      $safeToRecover = $true
    }
  } catch {
    $failure += "; process cleanup failed: $($_.Exception.Message)"
    Write-UpdateLog $failure
  }
  try { Write-UpdateResult 'failed' $failure }
  catch { Write-UpdateLog "cannot persist update result: $($_.Exception.Message)" }

  if ($parentExited -and $safeToRecover) {
    try {
      if ($installationStarted) {
        if ($targetExisted) {
          Restore-UpdateExecutable $targetBackup $config.targetPath
        } elseif (Test-Path -LiteralPath $config.targetPath) {
          Remove-Item -LiteralPath $config.targetPath -Force
        }
        # Keep a directly launched/renamed executable as a usable fallback.
        if ($config.executablePath -ne $config.targetPath) {
          Restore-UpdateExecutable $currentBackup $config.executablePath
        }
      }
      $recovery = Start-UpdateProcess -Path $config.executablePath -Arguments '' -Directory (Split-Path -Parent $config.executablePath)
      if ($recovery.WaitForExit(1500)) { throw "previous application exited early with code $($recovery.ExitCode)" }
      $recovery.Dispose()
      Write-UpdateLog 'previous executable restored and restarted'
    } catch {
      $failure += "; recovery failed: $($_.Exception.Message)"
      Write-UpdateLog $failure
      try { Write-UpdateResult 'failed' $failure }
      catch { Write-UpdateLog "cannot persist recovery failure: $($_.Exception.Message)" }
    }
  }
  # Failed attempts retain backups and installer for diagnosis/manual recovery.
  exit 1
}
