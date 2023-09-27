#!/usr/bin/env pwsh
# Based on Flyctl installer.
# Copyright 2018 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

$ErrorActionPreference = 'Stop'

$Version = if ($v) {
  $v
}
elseif ($args.Length -eq 1) {
  $args.Get(0)
}
else {
  "latest"
}

$WokwiInstall = $env:WOKWI_INSTALL
$BinDir = if ($WokwiInstall) {
  "$WokwiInstall\bin"
}
else {
  "$Home\.wokwi\bin"
}

$TempExe = "$BinDir\wokwi-cli.exe.new"
$WokwiCLIExe = "$BinDir\wokwi-cli.exe"

# GitHub require TLS 1.2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Determine the URL for downloading wokwi-cli
$WokwiUri = if ($Version -eq "latest") {
  "https://github.com/wokwi/wokwi-cli/releases/latest/download/wokwi-cli-win-x64.exe"
}
else {
  "https://github.com/wokwi/wokwi-cli/releases/download/v$Version/wokwi-cli-win-x64.exe"
}

# Check if the URL is valid
try {
  Invoke-WebRequest $WokwiUri -Method Head -UseBasicParsing | Out-Null
}
catch {
  $StatusCode = $_.Exception.Response.StatusCode.value__
  if ($StatusCode -eq 404) {
    Write-Error "Unable to find a wokwi-cli release on GitHub for version: $Version - see https://github.com/wokwi/wokwi-cli/releases for all versions"
    Exit 1
  }
  else {
    $Request = $_.Exception
    Write-Error "Error while fetching releases: $Request"
    Exit 1
  }
}

if (!(Test-Path $BinDir)) {
  New-Item $BinDir -ItemType Directory | Out-Null
}

$prevProgressPreference = $ProgressPreference
try {
  # Invoke-WebRequest on older powershell versions has severe transfer
  # performance issues due to progress bar rendering - the screen updates
  # end up throttling the download itself. Disable progress on these older
  # versions.
  if ($PSVersionTable.PSVersion.Major -lt 7) {
    Write-Output "Downloading wokwi-cli..."
    $ProgressPreference = "SilentlyContinue"
  }

  Invoke-WebRequest $WokwiUri -OutFile $TempExe -UseBasicParsing
}
finally {
  $ProgressPreference = $prevProgressPreference
}

if (Test-Path $WokwiCLIExe) {
  Remove-Item $WokwiCLIExe
}
Copy-Item $TempExe $WokwiCLIExe
Remove-Item $TempExe

$User = [EnvironmentVariableTarget]::User
$Path = [Environment]::GetEnvironmentVariable('Path', $User)
if (!(";$Path;".ToLower() -like "*;$BinDir;*".ToLower())) {
  [Environment]::SetEnvironmentVariable('Path', "$Path;$BinDir", $User)
  $Env:Path += ";$BinDir"
}

Write-Output "wokwi-cli was installed successfully to $WokwiCLIExe"
Write-Output "Run 'wokwi-cli --help' to get started"
Write-Output ""
Write-Output "Stuck? Join our Discord at https://wokwi.com/discord"
