# TulparLang installer - Windows
#
# Usage (one-liner):
#   iwr -useb https://tulparlang.dev/install.ps1 | iex
#
# What this does:
#   1. Queries the latest GitHub release.
#   2. Fetches SHA256SUMS.txt and verifies every download against it.
#   3. (Optional) If `gpg` is available (Git for Windows ships it) AND the
#      TulparLang Release public key is already in your keyring, verifies
#      the manifest's detached signature (SHA256SUMS.txt.asc) too. Skipped
#      silently otherwise — SHA-256 verification is unaffected.
#   4. Downloads tulpar-windows-x64.exe + libtulpar_runtime-windows-x64.a +
#      the three MinGW runtime DLLs (libwinpthread-1.dll, zlib1.dll,
#      libzstd.dll) into %LOCALAPPDATA%\Programs\Tulpar\.
#   5. Adds that directory to the user-level PATH (no admin required).
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
# Non-system DLLs Tulpar's Windows binary loads at startup. Tulpar's
# Inno Setup installer bundles the same set; the one-line `iwr | iex`
# path used to skip them, so users who installed this way hit
# STATUS_DLL_NOT_FOUND on a fresh box. Listed by the filename Windows
# expects at runtime (loaded from tulpar.exe's own directory before
# walking PATH).
#   * libwinpthread-1.dll, zlib1.dll, libzstd.dll — MinGW + LLVM
#     transitive deps (PR #52, PR #54).
#   * libssl-3-x64.dll, libcrypto-3-x64.dll — OpenSSL 3, linked into
#     tulpar.exe so `tulpar update`, `tulpar pkg install`, and
#     `http_client` can talk HTTPS. Discovered missing on a fresh
#     Win10 box where the binary refused to start at all.
$DllNames        = @(
    'libwinpthread-1.dll',
    'zlib1.dll',
    'libzstd.dll',
    'libssl-3-x64.dll',
    'libcrypto-3-x64.dll'
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

# Optional GPG verification of SHA256SUMS.txt. Strictly additive: SHA-256
# still gates each downloaded asset. This block only adds a stronger
# attestation that the manifest itself is authentic.
#
# We deliberately don't auto-import the public key — if the key isn't
# already in the local keyring, "imza gecerli" would be meaningless
# because both files would have come over the same channel. Users who
# want this layer import the key out-of-band:
#   curl -fsSL https://raw.githubusercontent.com/hamer1818/TulparLang/main/release-public.asc | gpg --import
$TulparReleaseKeyFp = "CE5C22BDEA6158BC82213A7E439641B30E8DFDEE"
$gpgVerifyEnabled = $false
$gpgExe = Get-Command gpg -ErrorAction SilentlyContinue
if ($verifyEnabled -and $gpgExe) {
    $ascAsset = $release.assets | Where-Object { $_.name -eq 'SHA256SUMS.txt.asc' } | Select-Object -First 1
    if ($ascAsset) {
        $sumsTmp = New-TemporaryFile
        $ascTmp  = New-TemporaryFile
        try {
            # Persist both files for gpg --verify to read off disk; in-memory
            # piping is fragile across PS / Git-Bash gpg invocations.
            [System.IO.File]::WriteAllText($sumsTmp.FullName, $sumsContent, [System.Text.UTF8Encoding]::new($false))
            $ascResp = Invoke-WebRequest -Uri $ascAsset.browser_download_url `
                -UseBasicParsing -Headers @{ 'User-Agent' = 'tulpar-installer' }
            $ascContent = $ascResp.Content
            if ($ascContent -is [byte[]]) {
                $ascContent = [System.Text.Encoding]::UTF8.GetString($ascContent)
            }
            [System.IO.File]::WriteAllText($ascTmp.FullName, $ascContent, [System.Text.UTF8Encoding]::new($false))
            $gpgOut = & $gpgExe.Source --status-fd 1 --verify $ascTmp.FullName $sumsTmp.FullName 2>&1
            $gpgText = ($gpgOut | Out-String)
            if ($gpgText -match "VALIDSIG\s+$TulparReleaseKeyFp") {
                $gpgVerifyEnabled = $true
                Write-Note "GPG imzasi dogrulandi (anahtar $TulparReleaseKeyFp)."
            } elseif ($gpgText -match "NO_PUBKEY") {
                Write-Warn "GPG anahtari yerel keyring'de yok; release-public.asc'i import edip yeniden calistirin."
            } elseif ($gpgText -match "GOODSIG") {
                Write-Warn "GPG imzasi gecerli ama beklenen TulparLang Release anahtarindan degil."
            } else {
                Write-Warn "GPG dogrulamasi basarisiz; SHA-256 ile devam edilecek."
            }
        } catch {
            Write-Warn "GPG dogrulamasi sirasinda hata: $_"
        } finally {
            Remove-Item $sumsTmp.FullName -Force -ErrorAction SilentlyContinue
            Remove-Item $ascTmp.FullName -Force -ErrorAction SilentlyContinue
        }
    }
} elseif ($verifyEnabled -and -not $gpgExe) {
    Write-Note "GPG bulunamadi; SHA-256 dogrulamasi yine de uygulanacak. Daha guclu dogrulama icin gpg yukleyin (Git for Windows ile gelir)."
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

# 6. Smoke test — actually verify the installed binary loads. The old
#    version of this block did `& $BinaryPath --version 2>$null` and
#    fell back to `$tag` on empty output, which silently masked
#    STATUS_DLL_NOT_FOUND: a fresh Windows box without the right MinGW
#    DLLs would print "kuruldu" while the binary couldn't even start.
#    Now we capture stdout+stderr, check the exit code, and decode the
#    well-known NTSTATUS values. Failure here aborts loudly so the user
#    knows to re-run / file a report instead of sitting on a broken
#    install. We don't try to repair — the install dir is already in
#    place and our caller can re-run the same one-liner.
Write-Step "Kurulum dogrulaniyor (smoke test)..."
$smokeOutput = ''
$smokeExit   = 0
try {
    $smokeOutput = & $BinaryPath --version 2>&1 | Out-String
    $smokeExit   = $LASTEXITCODE
} catch {
    # `& $exe` throws when the OS refuses to launch the process at all
    # (e.g. STATUS_DLL_NOT_FOUND on systems where ntdll's loader fails
    # before we can attach the standard streams). Surface the underlying
    # exception so the user sees it.
    $smokeOutput = "$_"
    $smokeExit   = -1
}
$smokeText = $smokeOutput.Trim()

# NTSTATUS values surfaced as PowerShell exit codes (high bit makes
# them negative as signed int32):
#   0xC0000135 = -1073741515  STATUS_DLL_NOT_FOUND
#   0xC0000139 = -1073741511  STATUS_ENTRYPOINT_NOT_FOUND
#   0xC000007B = -1073741701  STATUS_INVALID_IMAGE_FORMAT
$ntDetail = switch ($smokeExit) {
    -1073741515 { 'STATUS_DLL_NOT_FOUND (0xC0000135) — bir DLL eksik / yuklenemedi.' }
    -1073741511 { 'STATUS_ENTRYPOINT_NOT_FOUND (0xC0000139) — bir DLL eski surum.' }
    -1073741701 { 'STATUS_INVALID_IMAGE_FORMAT (0xC000007B) — 32/64-bit uyumsuzluk.' }
    default     { $null }
}

if ($smokeExit -ne 0 -or [string]::IsNullOrWhiteSpace($smokeText)) {
    Write-Host ""
    Write-Warn "tulpar.exe baslatilamadi."
    if ($ntDetail) {
        Write-Host "  Hata: $ntDetail" -ForegroundColor Red
    } else {
        Write-Host "  Cikis kodu: $smokeExit" -ForegroundColor Red
    }
    if ($smokeText) {
        Write-Host "  Cikti: $smokeText" -ForegroundColor DarkGray
    }
    Write-Host ""
    Write-Host "Bu kurulum bozuk: ikili dosya yuklendi ama acilmiyor." -ForegroundColor Yellow
    Write-Host "Cozum onerileri:" -ForegroundColor Yellow
    Write-Host "  * Komutu yeniden calistirin (eksik bir indirme olmus olabilir)."
    Write-Host "  * Sorun devam ederse github.com/hamer1818/TulparLang/issues"
    Write-Host "    adresine bu cikis kodunu ($smokeExit) ile birlikte rapor edin."
    throw "Kurulum dogrulamasi basarisiz."
}

$version = $smokeText

Write-Host ""
Write-Success "TulparLang $tag kuruldu -> $BinaryPath"
if (Test-Path $RuntimePath) {
    Write-Note "Runtime kutuphanesi -> $RuntimePath"
}
if ($verifyEnabled) {
    if ($gpgVerifyEnabled) {
        Write-Note "Tum indirmeler SHA256SUMS.txt ile dogrulandi (manifest GPG imzali)."
    } else {
        Write-Note "Tum indirmeler SHA256SUMS.txt ile dogrulandi."
    }
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
