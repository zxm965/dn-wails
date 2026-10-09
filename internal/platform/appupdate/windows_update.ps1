param([Parameter(Mandatory = $true)][string]$ConfigPath)

$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8

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
  # Get-FileHash is a module function in Windows PowerShell 5.1. A process
  # launched from pwsh can inherit a PSModulePath that cannot resolve it.
  $algorithm = [Security.Cryptography.SHA256]::Create()
  $stream = $null
  try {
    $stream = [IO.File]::OpenRead($Path)
    return [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-', '')
  } finally {
    if ($null -ne $stream) { $stream.Dispose() }
    $algorithm.Dispose()
  }
}

function Test-UpdateParentRunning {
  return $null -ne (Get-Process -Id $config.processId -ErrorAction SilentlyContinue)
}

function Restore-UpdateExecutable {
  param([string]$Backup, [string]$Destination)
  $expected = Get-UpdateHash $Backup
  if ($expected -eq '') { throw 'rollback backup is missing' }
  try { if ((Get-UpdateHash $Destination) -eq $expected) { return } }
  catch { Write-UpdateLog "cannot read current image before rollback: $($_.Exception.Message)" }
  # Stage on the destination volume, then move the failed image aside rather
  # than truncating an executable Windows may still have mapped after exit.
  $staged = "$Destination.restore-$([Guid]::NewGuid().ToString('N'))"
  Copy-Item -LiteralPath $Backup -Destination $staged
  if ((Get-UpdateHash $staged) -ne $expected) { throw 'staged rollback executable hash mismatch' }
  $aside = "$Destination.failed-$([Guid]::NewGuid().ToString('N'))"
  for ($attempt = 1; $attempt -le 10; $attempt++) {
    try {
      # Once moved, retry only verification if a scanner temporarily prevents
      # reading the restored image; never move the valid image away again.
      if (Test-Path -LiteralPath $staged) {
        if (Test-Path -LiteralPath $Destination) { [IO.File]::Move($Destination, $aside) }
        try { [IO.File]::Move($staged, $Destination) }
        catch {
          if (Test-Path -LiteralPath $aside) { [IO.File]::Move($aside, $Destination) }
          throw
        }
      }
      if ((Get-UpdateHash $Destination) -ne $expected) { throw 'restored executable hash mismatch' }
      if (Test-Path -LiteralPath $aside) {
        try { Remove-Item -LiteralPath $aside -Force }
        catch { Write-UpdateLog "restored executable; old image cleanup deferred: $($_.Exception.Message)" }
      }
      return
    } catch {
      if ($attempt -eq 10) { throw }
      Start-Sleep -Milliseconds 250
    }
  }
}

function Start-UpdateProcess {
  param([string]$Path, [string]$Arguments, [string]$Directory, [bool]$Visible = $false)
  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $Path
  $startInfo.Arguments = $Arguments
  $startInfo.WorkingDirectory = $Directory
  $startInfo.UseShellExecute = $Visible
  $startInfo.CreateNoWindow = -not $Visible
  if ($Visible) { $startInfo.WindowStyle = [Diagnostics.ProcessWindowStyle]::Normal }
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
    if (-not $config.interactive -and $remaining -le 0) { throw 'installer deadline exceeded' }
    Write-UpdateLog "starting installer attempt $attempt"
    # Production uses a visible Next/Install/Finish wizard. /S is retained
    # solely for isolated headless NSIS tests and older-client compatibility.
    # NSIS /D must remain unquoted and last, including paths with spaces.
    $arguments = "/UPDATE /D=$applicationDirectory"
    if (-not $config.interactive) { $arguments = "/S $arguments" }
    $installer = Start-UpdateProcess -Path $config.installerPath -Arguments $arguments -Directory $config.workDirectory -Visible ([bool]$config.interactive)
    $installationStarted = $true
    if ($config.interactive) {
      Write-UpdateLog 'installation wizard opened; waiting for user completion without an interaction deadline'
      $installer.WaitForExit()
    } elseif (-not $installer.WaitForExit($remaining)) {
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
    if ($exitCode -eq 1) { throw 'installation was cancelled; keeping the previous version' }
    if ($config.interactive -or $exitCode -ne 73) { throw "installer failed with exit code $exitCode" }
    Start-Sleep -Milliseconds 750
  }
  if (-not $installed) { throw 'installer could not replace the executable after bounded retries' }

  $launchRequested = -not $config.interactive -or (Test-Path -LiteralPath (Join-Path $config.workDirectory 'launch-requested'))
  Write-UpdateLog "verified installed executable; launch requested=$launchRequested"
  # Persist before launch so the new application's first Info call never sees
  # a stale "installing" result. Launch failure replaces it with "failed".
  Write-UpdateResult 'succeeded'
  if ($launchRequested) {
    $restarted = Start-UpdateProcess -Path $config.targetPath -Arguments '' -Directory $applicationDirectory
    if ($restarted.WaitForExit(1500)) { throw "updated application exited early with code $($restarted.ExitCode)" }
    $restarted.Dispose()
    $restarted = $null
    Write-UpdateLog 'update succeeded; application restarted'
  } else {
    Write-UpdateLog 'update succeeded; user chose not to launch the application'
  }
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
