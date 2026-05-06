# TulparLang installer - Windows
#
# Usage (one-liner):
#   iwr -useb https://tulparlang.dev/install.ps1 | iex
#
# What this does:
#   1. Queries the latest GitHub release.
#   2. Fetches SHA256SUMS.txt and verifies every download against it.
#   3. Downloads tulpar-windows-x64.exe + libtulpar_runtime-windows-x64.a +
#      the three MinGW runtime DLLs (libwinpthread-1.dll, zlib1.dll,
#      libzstd.dll) into %LOCALAPPDATA%\Programs\Tulpar\.
#   4. Adds that directory to the user-level PATH (no admin required).
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

$Repo            = 'hamer1818/TulparLang'
$AssetName       = 'tulpar-windows-x64.exe'
$RuntimeAssetName = 'libtulpar_runtime-windows-x64.a'
# MinGW / LLVM runtime DLLs that don't ship with stock Windows. Tulpar's
# Inno Setup installer bundles these too (see Tulpar PR #52); the
# one-line `iwr | iex` path used to skip them, so users who installed
# this way still hit STATUS_DLL_NOT_FOUND on a fresh box. Listed by the
# filename Windows expects at runtime (loaded from tulpar.exe's own
# directory before walking PATH).
$DllNames        = @(
    'libwinpthread-1.dll',
    'zlib1.dll',
    'libzstd.dll'
)
$InstallDir      = Join-Path $env:LOCALAPPDATA 'Programs\Tulpar'
$BinaryPath      = Join-Path $InstallDir 'tulpar.exe'
# AOT (`tulpar build` and the default `tulpar file.tpr` pipeline) links
# user binaries against this archive at runtime. The compiler probes the
# directory of the running tulpar.exe first, so dropping it next to the
# binary is enough — no extra LIB/PATH switches needed.
$RuntimePath     = Join-Path $InstallDir 'libtulpar_runtime.a'

function Write-Step($msg)    { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Note($msg)    { Write-Host "     $msg" -ForegroundColor DarkGray }
function Write-Warn($msg)    { Write-Host "[!]  $msg" -ForegroundColor Yellow }

# Compute SHA-256 of a file via the .NET BCL directly. We avoid
# `Get-FileHash` because it's been observed to fail with
# `CommandNotFoundException` in restricted PowerShell sessions —
# Constrained Language Mode, AppLocker / WDAC policies, and some
# image-locked corp builds where Microsoft.PowerShell.Utility is
# stripped or its commands aren't whitelisted. The BCL types loaded
# here are part of mscorlib and are always available, so this path
# stays robust regardless of the host's cmdlet inventory.
function Get-Sha256Hex {
    param([string]$Path)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $stream = [System.IO.File]::OpenRead($Path)
        try {
            $bytes = $sha.ComputeHash($stream)
        } finally {
            $stream.Dispose()
        }
    } finally {
        $sha.Dispose()
    }
    # PS 5.1's StringBuilder is the simplest portable hex encoder.
    $sb = New-Object System.Text.StringBuilder ($bytes.Length * 2)
    foreach ($b in $bytes) {
        [void]$sb.AppendFormat('{0:x2}', $b)
    }
    return $sb.ToString()
}

# Stylized winged-horse (Tulpar) silhouette printed as a "completion
# flourish" on success — same idea as Claude Code dropping its robot
# logo at the end. Single-quoted here-string keeps every character
# literal; the art uses only +/=/- so no escaping concerns. Closing
# '@ MUST be at column 0.
#
# Derived from public/favicon.svg: the SVG was rasterized to a 40x16
# bitmap and binarized into two ink levels (`=` for edge / `+` for
# solid stroke). Keep the silhouette in sync with the favicon when
# either changes, otherwise the brand identity drifts. Total height
# is ~16 lines / ~40 cols so it fits in an 80-col PowerShell window
# without the wraparound the previous 37-line design suffered from.
function Show-TulparArt {
    $art = @'
              ==
              =++=
               ++==+==             ===++=
               =++=  ==++=       ++=   =+=
               =+++++===  ++=  =+    +   +=
                =++= =====  ++ +    ++=++=+=
                  ==++====   ++     +=   =
                       =+=++= ++==++=+
                  ====+==+= ++==   =++
                +++++=   +    ++=   +===+
            ==+++  +=   ++      ======++=
            =++=  =+  =++           ==+=
                 =++=+=             +=
                +++
               ++
               +
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
# Runtime archive is shipped from v2.1.0.x onwards. Older tags don't
# have it — leave $runtimeAsset null and skip the runtime install in
# that case (only `tulpar build` / AOT will be unavailable then).
$runtimeAsset = $release.assets | Where-Object { $_.name -eq $RuntimeAssetName } | Select-Object -First 1
$dllAssets = @{}
foreach ($n in $DllNames) {
    $a = $release.assets | Where-Object { $_.name -eq $n } | Select-Object -First 1
    if ($a) { $dllAssets[$n] = $a }
}
$sumsAsset = $release.assets | Where-Object { $_.name -eq 'SHA256SUMS.txt' } | Select-Object -First 1
Write-Note "Son surum: $tag"

# Probe for curl.exe once — we use it for the actual binary downloads
# (5-10x faster than IWR even with the progress bar suppressed because
# its HTTP stack is tighter and it doesn't materialise the response in
# PowerShell's pipeline). IWR is the fallback for legacy systems.
$curlExe = Get-Command curl.exe -ErrorAction SilentlyContinue

# 2. Pull SHA256SUMS.txt and parse it. Each line is `<64 hex>  *<name>`
#    (`sha256sum -b` format) or `<64 hex>  <name>` (text mode). When the
#    release predates the manifest (older tags), we fall back to
#    unverified install with a loud warning — matches the policy the
#    `tulpar update` command implements on the same path.
$expected = @{}
$verifyEnabled = $false
if ($sumsAsset) {
    Write-Step "Imza listesi indiriliyor (SHA256SUMS.txt)..."
    try {
        $sumsResp = Invoke-WebRequest -Uri $sumsAsset.browser_download_url `
            -UseBasicParsing -Headers @{ 'User-Agent' = 'tulpar-installer' }
        $sumsContent = $sumsResp.Content
        if ($sumsContent -is [byte[]]) {
            $sumsContent = [System.Text.Encoding]::UTF8.GetString($sumsContent)
        }
        foreach ($line in ($sumsContent -split "`r?`n")) {
            $line = $line.Trim()
            if (-not $line -or $line.StartsWith('#')) { continue }
            if ($line -match '^([0-9a-fA-F]{64})\s+\*?(.+)$') {
                $expected[$matches[2]] = $matches[1].ToLower()
            }
        }
        if ($expected.Count -gt 0) {
            $verifyEnabled = $true
            Write-Note "Manifest dogrulamasi aktif ($($expected.Count) dosya)."
        }
    } catch {
        Write-Warn "SHA256SUMS.txt indirilemedi: $_"
    }
}
if (-not $verifyEnabled) {
    Write-Warn "Bu surumde dogrulama yapilamiyor; indirmeler dogrudan kurulacak."
}

# Helper: download a release asset to $DestPath and (when the manifest
# is available) verify its SHA-256. Throws on any failure so the caller
# never moves a corrupted file into the install dir.
function Download-Verified {
    param(
        [string]$Url,
        [string]$DestPath,
        [string]$AssetName
    )
    if (Test-Path $DestPath) {
        Remove-Item $DestPath -Force -ErrorAction SilentlyContinue
    }
    if ($curlExe) {
        & curl.exe --fail --location --silent --show-error --retry 3 `
            --output $DestPath $Url
        if ($LASTEXITCODE -ne 0) {
            throw "curl.exe exit $LASTEXITCODE ($AssetName)"
        }
    } else {
        Invoke-WebRequest -Uri $Url -OutFile $DestPath -UseBasicParsing `
            -Headers @{ 'User-Agent' = 'tulpar-installer' }
    }
    if ($verifyEnabled) {
        if (-not $expected.ContainsKey($AssetName)) {
            throw "Manifest'te yok: $AssetName"
        }
        $want   = $expected[$AssetName]
        $actual = (Get-Sha256Hex -Path $DestPath).ToLower()
        if ($actual -ne $want) {
            throw "SHA-256 uyusmazligi: $AssetName`n  beklenen: $want`n  bulunan : $actual"
        }
    }
}

# Helper: move $SrcPath into place at $DestPath. For files Windows holds
# open while tulpar.exe runs (the exe itself + any of its loaded DLLs)
# we rename the existing file to .old first — Windows allows
# rename-while-loaded but rejects overwrite-while-loaded. Same dance as
# `tulpar update` uses; mirrored here so the one-line installer stays
# robust if the user re-runs it while another tulpar.exe process holds
# the directory open.
function Install-FileAtomic {
    param(
        [string]$SrcPath,
        [string]$DestPath,
        [bool]$LoadLocked
    )
    if ($LoadLocked) {
        $oldPath = "$DestPath.old"
        if (Test-Path $oldPath) {
            Remove-Item $oldPath -Force -ErrorAction SilentlyContinue
        }
        if (Test-Path $DestPath) {
            try { Move-Item -Path $DestPath -Destination $oldPath -Force }
            catch {
                throw "Mevcut dosya .old olarak tasinamadi ($DestPath): $_"
            }
        }
    }
    Move-Item -Path $SrcPath -Destination $DestPath -Force
    if ($LoadLocked) {
        # Best-effort cleanup; harmless if still mapped (we'll get it
        # next run).
        if (Test-Path "$DestPath.old") {
            Remove-Item "$DestPath.old" -Force -ErrorAction SilentlyContinue
        }
    }
}

# 3. Download every artifact into a per-tag staging dir under TEMP and
#    verify each one BEFORE touching the install dir. A failed
#    verification here aborts cleanly — we never partial-install.
$staging = Join-Path $env:TEMP ("tulpar-install-" + ($tag -replace '[^A-Za-z0-9_.-]','_'))
New-Item -ItemType Directory -Path $staging -Force | Out-Null
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

Write-Step "Indiriliyor: $($asset.name)"
$stagedBin = Join-Path $staging $asset.name
Download-Verified -Url $asset.browser_download_url -DestPath $stagedBin -AssetName $asset.name

if ($runtimeAsset) {
    Write-Step "Runtime kutuphanesi indiriliyor: $($runtimeAsset.name)"
    $stagedRt = Join-Path $staging $runtimeAsset.name
    Download-Verified -Url $runtimeAsset.browser_download_url -DestPath $stagedRt -AssetName $runtimeAsset.name
} else {
    Write-Warn "Runtime kutuphanesi bu surumde yok; sadece VM modu kullanilabilir."
    $stagedRt = $null
}

$stagedDlls = @{}
$missingDlls = @()
foreach ($n in $DllNames) {
    if ($dllAssets.ContainsKey($n)) {
        Write-Step "DLL indiriliyor: $n"
        $stagedDlls[$n] = Join-Path $staging $n
        Download-Verified -Url $dllAssets[$n].browser_download_url -DestPath $stagedDlls[$n] -AssetName $n
    } else {
        $missingDlls += $n
    }
}
if ($missingDlls.Count -gt 0) {
    Write-Warn "Bu surumde bazi DLL'ler yok: $($missingDlls -join ', ')"
    Write-Note "Eski bir release'den kurum yapiyorsunuz; daha yeni bir release'e gecmek icin tekrar deneyin."
}

# 4. Place verified files into the install dir. Order: tulpar.exe first
#    (so a failure here aborts before we touch the runtime archive); DLLs
#    next; runtime archive last (it's not load-locked, fast to swap).
Write-Step "Yerlestiriliyor: $InstallDir"
Install-FileAtomic -SrcPath $stagedBin -DestPath $BinaryPath -LoadLocked $true
Write-Note "  + tulpar.exe"
foreach ($n in $DllNames) {
    if ($stagedDlls.ContainsKey($n)) {
        Install-FileAtomic -SrcPath $stagedDlls[$n] -DestPath (Join-Path $InstallDir $n) -LoadLocked $true
        Write-Note "  + $n"
    }
}
if ($stagedRt) {
    Install-FileAtomic -SrcPath $stagedRt -DestPath $RuntimePath -LoadLocked $false
    Write-Note "  + libtulpar_runtime.a"
}

# Cleanup staging dir (best effort — leftover files are harmless).
try { Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue } catch {}

# 5. Wire the install dir into the user PATH if it isn't already there.
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

# 6. Smoke test.
$version = & $BinaryPath --version 2>$null
if (-not $version) { $version = $tag }

Write-Host ""
Write-Success "TulparLang $tag kuruldu -> $BinaryPath"
if (Test-Path $RuntimePath) {
    Write-Note "Runtime kutuphanesi -> $RuntimePath"
}
if ($verifyEnabled) {
    Write-Note "Tum indirmeler SHA256SUMS.txt ile dogrulandi."
}
Show-TulparArt
Write-Host ""
Write-Host "Deneme:" -ForegroundColor Cyan
Write-Host "  tulpar --version"
Write-Host "  tulpar --repl"
Write-Host ""
Write-Host "Guncellemek icin:" -ForegroundColor Cyan
Write-Host "  tulpar update            # built-in (varsa)"
Write-Host "  veya bu installer'i yeniden calistir."
