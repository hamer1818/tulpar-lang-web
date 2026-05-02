# TulparLang installer - Windows
#
# Usage (one-liner):
#   iwr -useb https://tulparlang.dev/install.ps1 | iex
#
# What this does:
#   1. Queries the latest GitHub release.
#   2. Downloads tulpar-windows-x64.exe to %LOCALAPPDATA%\Programs\Tulpar\tulpar.exe.
#   3. Adds that directory to the user-level PATH (no admin required).
#
# Re-running this script upgrades the installed tulpar to the latest release.
#
# NOTE on output: this script intentionally uses ASCII-only characters
# (=> [OK] [!]) and ASCII-transliterated Turkish (Surum, Indirme, ...).
# When invoked via `iwr | iex`, the script runs in the host session whose
# console encoding setup we can't fully change from inside the script —
# unicode glyphs and diacritics are unreliable there. Installed tulpar.exe
# itself displays full Turkish correctly via its own UTF-8 console setup.

#Requires -Version 5
$ErrorActionPreference = 'Stop'

# CRITICAL for download speed: Invoke-WebRequest's progress bar re-renders
# on every chunk and tanks throughput by 10-50x on Windows PowerShell 5.1.
# Suppressing it here turns a ~30s download into ~2s on a fast connection.
# This MUST be set before any Invoke-WebRequest call below.
$ProgressPreference = 'SilentlyContinue'

# Belt-and-suspenders: try to set UTF-8 anyway in case the host honours
# it. Safe to fail silently — we use ASCII-only characters below either way.
try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding           = [System.Text.Encoding]::UTF8
} catch {}

$Repo       = 'hamer1818/TulparLang'
$AssetName  = 'tulpar-windows-x64.exe'
$InstallDir = Join-Path $env:LOCALAPPDATA 'Programs\Tulpar'
$BinaryPath = Join-Path $InstallDir 'tulpar.exe'

function Write-Step($msg)    { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Note($msg)    { Write-Host "     $msg" -ForegroundColor DarkGray }
function Write-Warn($msg)    { Write-Host "[!]  $msg" -ForegroundColor Yellow }

# Stylized winged-horse (Tulpar) silhouette printed as a "completion
# flourish" on success — same idea as Claude Code dropping its robot
# logo at the end. Single-quoted here-string keeps every backslash and
# tilde literal; closing '@ MUST be at column 0.
function Show-TulparArt {
    $art = @'
            ,~~~,
        ,~~'     `~,
     ,~'   ___      `~,
   ,'   ,~'   `,       `,
  /  ,~'   o    `,       \,
 / ,~'            `,       \,
/_~'                `,       \,
                      `,       \,___
                        `,           \,
                          `,           \,
                            `,___________\,
                                /\      /\
                               /  \    /  \
                              /____\  /____\
'@
    Write-Host ""
    Write-Host $art -ForegroundColor Cyan
}

Write-Host ""
Write-Host "TulparLang installer" -ForegroundColor Cyan
Write-Host "===================="

# 1. Find the latest release.
Write-Step "GitHub'dan son surum sorgulaniyor..."
$apiUrl = "https://api.github.com/repos/$Repo/releases/latest"
try {
    $release = Invoke-RestMethod -Uri $apiUrl -Headers @{ 'User-Agent' = 'tulpar-installer' }
} catch {
    throw "Surum bilgisi alinamadi ($apiUrl): $_"
}
$tag = $release.tag_name
$asset = $release.assets | Where-Object { $_.name -eq $AssetName } | Select-Object -First 1
if (-not $asset) {
    throw "Release '$tag' icinde '$AssetName' bulunamadi."
}
Write-Note "Son surum: $tag"

# 2. Download the binary. Windows can't overwrite a running .exe, so if a
#    previous install is on-disk we rename it out of the way first; that
#    rename works even while the process is running, and the .old file is
#    removed on success.
Write-Step "Indiriliyor: $BinaryPath"
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
$oldPath = "$BinaryPath.old"
if (Test-Path $oldPath) { Remove-Item $oldPath -Force -ErrorAction SilentlyContinue }
if (Test-Path $BinaryPath) {
    try { Move-Item -Path $BinaryPath -Destination $oldPath -Force }
    catch {
        throw "Mevcut tulpar.exe tasinamadi (baska bir process tarafindan kilitleniyor olabilir): $_"
    }
}
try {
    # Prefer curl.exe (bundled with Windows 10 1803+ and all Windows 11)
    # for the actual binary download — it's typically 5-10x faster than
    # Invoke-WebRequest even with the progress bar suppressed, because it
    # uses a tighter HTTP stack and doesn't materialise the response in
    # PowerShell's pipeline. We fall back to IWR for older systems.
    $curlExe = Get-Command curl.exe -ErrorAction SilentlyContinue
    if ($curlExe) {
        & curl.exe --fail --location --silent --show-error --retry 3 `
            --output $BinaryPath $asset.browser_download_url
        if ($LASTEXITCODE -ne 0) {
            throw "curl.exe exit $LASTEXITCODE"
        }
    } else {
        Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $BinaryPath -UseBasicParsing
    }
} catch {
    # Restore previous on download failure so the user isn't left without a tulpar.
    if (Test-Path $oldPath) { Move-Item -Path $oldPath -Destination $BinaryPath -Force }
    throw "Indirme basarisiz: $_"
}
if (Test-Path $oldPath) { Remove-Item $oldPath -Force -ErrorAction SilentlyContinue }

# 3. Wire the install dir into the user PATH if it isn't already there.
#    We deliberately use the User scope (no admin needed) and update the
#    persistent registry value AND the current-session $env:Path so the
#    user can immediately run `tulpar` without restarting their terminal.
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
$entries  = if ($userPath) { $userPath -split ';' | Where-Object { $_ } } else { @() }
if ($entries -notcontains $InstallDir) {
    Write-Step "PATH guncelleniyor: $InstallDir"
    $newPath = if ($userPath) { "$userPath;$InstallDir" } else { $InstallDir }
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    $env:Path = "$env:Path;$InstallDir"
    Write-Note "Yeni terminallerde otomatik gecerli olur."
} else {
    Write-Step "PATH zaten ayarli."
}

# 4. Smoke test.
$version = & $BinaryPath --version 2>$null
if (-not $version) { $version = $tag }

Write-Host ""
Write-Success "TulparLang $tag kuruldu -> $BinaryPath"
Show-TulparArt
Write-Host ""
Write-Host "Deneme:" -ForegroundColor Cyan
Write-Host "  tulpar --version"
Write-Host "  tulpar --repl"
Write-Host ""
Write-Host "Guncellemek icin:" -ForegroundColor Cyan
Write-Host "  tulpar update            # built-in (varsa)"
Write-Host "  veya bu installer'i yeniden calistir."
