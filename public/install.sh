#!/usr/bin/env bash
# TulparLang installer — Linux / macOS
#
# Usage (one-liner):
#   curl -fsSL https://tulparlang.dev/install.sh | bash
#
# What this does:
#   1. Detects OS (Linux / macOS).
#   2. Fetches SHA256SUMS.txt from the latest GitHub release and
#      verifies every download against it.
#   3. (Optional) If `gpg` is available AND the TulparLang Release public
#      key is already in your keyring, verifies the manifest's detached
#      signature (SHA256SUMS.txt.asc) too. Skipped silently otherwise —
#      SHA-256 verification is unaffected.
#   4. Installs the binary + runtime archive into ~/.local/bin (creating
#      the dir if needed).
#   5. Tells you how to add ~/.local/bin to PATH if it isn't already.
#
# Re-running this script upgrades to the latest release.

set -euo pipefail

REPO="hamer1818/TulparLang"
INSTALL_DIR="${TULPAR_INSTALL_DIR:-${HOME}/.local/bin}"
BINARY_PATH="${INSTALL_DIR}/tulpar"
# AOT (`tulpar build` and the default `tulpar file.tpr` pipeline) links
# user binaries against this archive at runtime. The compiler probes the
# directory of the running tulpar binary first, so dropping it alongside
# the executable is enough — no extra PATH/LD switches needed.
RUNTIME_PATH="${INSTALL_DIR}/libtulpar_runtime.a"

c_cyan="$(printf '\033[36m')"
c_green="$(printf '\033[32m')"
c_yellow="$(printf '\033[33m')"
c_dim="$(printf '\033[2m')"
c_reset="$(printf '\033[0m')"

step()    { printf "%s→ %s%s\n" "$c_cyan"  "$*" "$c_reset"; }
success() { printf "%s✓ %s%s\n" "$c_green" "$*" "$c_reset"; }
note()    { printf "%s  %s%s\n" "$c_dim"   "$*" "$c_reset"; }
warn()    { printf "%s! %s%s\n" "$c_yellow" "$*" "$c_reset"; }

# Stylized winged-horse (Tulpar) silhouette printed as a "completion
# flourish" on success — same idea as Claude Code dropping its robot
# logo at the end. Single-quoted heredoc (<<'__ART__') keeps every
# character literal; the art uses only +/=/- so no escaping concerns.
#
# Derived from public/favicon.svg: the SVG was rasterized to a 40x16
# bitmap and binarized into two ink levels (`=` for edge / `+` for
# solid stroke). Keep the silhouette in sync with the favicon when
# either changes, otherwise the brand identity drifts. Total height
# is ~16 lines / ~40 cols so it fits in an 80-col terminal without
# the wraparound the previous 37-line design suffered from.
show_art() {
    printf "\n%s" "$c_cyan"
    cat <<'__ART__'
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
__ART__
    printf "%s" "$c_reset"
}

echo ""
printf "%sTulparLang installer%s\n" "$c_cyan" "$c_reset"
echo "===================="

# 0. Pre-flight detection — surface whether tulpar is already on this
#    box BEFORE we hit the network. The user sees "fresh install" vs
#    "upgrading X.Y.Z" in the very first few lines, so re-running the
#    one-liner is never a silent action. We probe two locations: the
#    install dir we'd write to (so a previous run of this same
#    installer is detected even when not on PATH), and `command -v
#    tulpar` (so a binary placed manually somewhere else still gets
#    reported). `--version` is the source of truth for the version
#    string.
probe_tulpar_version() {
    local p="$1"
    [ -x "$p" ] || return 1
    local out
    if out="$("$p" --version 2>&1)" && [ -n "$out" ]; then
        printf '%s' "$out"
        return 0
    fi
    printf '%s' '<bilinmeyen sürüm>'
}

existing_path=""
existing_version=""
if [ -x "$BINARY_PATH" ]; then
    existing_path="$BINARY_PATH"
    existing_version="$(probe_tulpar_version "$BINARY_PATH")"
elif command -v tulpar >/dev/null 2>&1; then
    existing_path="$(command -v tulpar)"
    existing_version="$(probe_tulpar_version "$existing_path")"
fi
if [ -n "$existing_path" ]; then
    step "Mevcut TulparLang tespit edildi"
    note "Konum: $existing_path"
    note "Sürüm: $existing_version"
    note "Bu kurulum mevcut sürümü son release ile değiştirecek."
else
    step "TulparLang sistemde bulunamadı — yeni kurulum yapılacak"
fi

# 1. Detect OS / asset name. Only x64 / universal builds are published.
case "$(uname -s)" in
    Linux)  asset="tulpar-linux-x64";       runtime_asset="libtulpar_runtime-linux-x64.a" ;;
    Darwin) asset="tulpar-macos-universal"; runtime_asset="libtulpar_runtime-macos-universal.a" ;;
    *)      echo "Desteklenmeyen işletim sistemi: $(uname -s)" >&2; exit 1 ;;
esac

# 2. Find the latest release. We avoid jq dependency by grepping the
#    tag_name out of the JSON — fragile but standard for one-liner
#    installers (this is what rustup/uv/etc. do too).
step "GitHub'dan son sürüm sorgulanıyor..."
api_url="https://api.github.com/repos/${REPO}/releases/latest"
release_json="$(curl -fsSL -H "User-Agent: tulpar-installer" "$api_url")" \
    || { echo "Sürüm bilgisi alınamadı: $api_url" >&2; exit 1; }

tag="$(printf '%s' "$release_json" \
       | grep -m1 '"tag_name"' \
       | sed -E 's/.*"tag_name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')"
if [ -z "$tag" ]; then
    echo "tag_name parse edilemedi." >&2
    exit 1
fi
note "Son sürüm: $tag"

# 3. Pull SHA256SUMS.txt and parse it. Format is `sha256sum -b` style:
#    `<64 hex>  *<filename>` (binary mode) or `<64 hex>  <filename>`
#    (text mode). When the release predates the manifest (older tags),
#    we fall back to unverified install with a loud warning — matches
#    the policy `tulpar update` implements on the same path.
sums_url="https://github.com/${REPO}/releases/download/${tag}/SHA256SUMS.txt"
manifest_file=""
verify_enabled=0
manifest_tmp="$(mktemp "${TMPDIR:-/tmp}/tulpar-sums.XXXXXX")"
if curl -fsSL -o "$manifest_tmp" "$sums_url" 2>/dev/null; then
    if [ -s "$manifest_tmp" ]; then
        manifest_file="$manifest_tmp"
        verify_enabled=1
        note "Manifest doğrulaması aktif."
    fi
fi
if [ "$verify_enabled" = "0" ]; then
    rm -f "$manifest_tmp"
    warn "SHA256SUMS.txt bulunamadı; indirmeler doğrulanmadan kurulacak."
fi

# Pick a SHA-256 implementation. macOS ships `shasum -a 256`, Linux
# ships `sha256sum`. Both produce the same `<hex>  <name>` format.
sha256_tool=""
if command -v sha256sum >/dev/null 2>&1; then
    sha256_tool="sha256sum"
elif command -v shasum >/dev/null 2>&1; then
    sha256_tool="shasum_a256"
fi
if [ "$verify_enabled" = "1" ] && [ -z "$sha256_tool" ]; then
    warn "sha256sum / shasum bulunamadı; doğrulama atlanacak."
    verify_enabled=0
    rm -f "$manifest_tmp"
    manifest_file=""
fi

# Optional GPG verification of SHA256SUMS.txt. Strictly additive: the
# SHA-256 manifest gates every download regardless. This step only adds
# a stronger attestation that the manifest itself is authentic — useful
# when the user already trusts the release-signing key.
#
# We do NOT auto-import the public key. If the key isn't already in the
# local keyring, "imza geçerli" would mean nothing because the script
# could be downloading a forged key over the same channel as everything
# else. Users who want this layer import the key out-of-band:
#   curl -fsSL https://raw.githubusercontent.com/hamer1818/TulparLang/main/release-public.asc | gpg --import
TULPAR_RELEASE_KEY_FP="CE5C22BDEA6158BC82213A7E439641B30E8DFDEE"
gpg_verify_enabled=0
if [ "$verify_enabled" = "1" ] && command -v gpg >/dev/null 2>&1; then
    asc_url="https://github.com/${REPO}/releases/download/${tag}/SHA256SUMS.txt.asc"
    asc_tmp="$(mktemp "${TMPDIR:-/tmp}/tulpar-sums.asc.XXXXXX")"
    if curl -fsSL -o "$asc_tmp" "$asc_url" 2>/dev/null && [ -s "$asc_tmp" ]; then
        gpg_out="$(gpg --status-fd 1 --verify "$asc_tmp" "$manifest_file" 2>/dev/null || true)"
        if echo "$gpg_out" | grep -q "VALIDSIG ${TULPAR_RELEASE_KEY_FP}"; then
            gpg_verify_enabled=1
            note "GPG imzası doğrulandı (anahtar ${TULPAR_RELEASE_KEY_FP})."
        elif echo "$gpg_out" | grep -q "NO_PUBKEY"; then
            warn "GPG anahtarı yerel keyring'de yok; release-public.asc'i import edip yeniden çalıştırın."
        elif echo "$gpg_out" | grep -q "GOODSIG"; then
            warn "GPG imzası geçerli ama beklenen TulparLang Release anahtarından değil."
        else
            warn "GPG doğrulaması başarısız; SHA-256 ile devam edilecek."
        fi
    fi
    rm -f "$asc_tmp"
elif [ "$verify_enabled" = "1" ]; then
    note "GPG bulunamadı; SHA-256 doğrulaması yine de uygulanacak. Daha güçlü doğrulama için gpg yükleyin."
fi

# Compute SHA-256 of $1, print lowercase hex digest to stdout.
compute_sha256() {
    local file="$1"
    case "$sha256_tool" in
        sha256sum)    sha256sum "$file" | awk '{print $1}' ;;
        shasum_a256)  shasum -a 256 "$file" | awk '{print $1}' ;;
        *)            return 1 ;;
    esac
}

# Look up expected hash for $1 in $manifest_file. Echoes the hash on
# stdout, returns non-zero if not present.
expected_sha256() {
    local name="$1"
    [ -n "$manifest_file" ] || return 1
    # Match either `<hash>  <name>` or `<hash> *<name>` (binary mode).
    awk -v want="$name" '
        /^[0-9a-fA-F]{64}[[:space:]]+\*?[^[:space:]]/ {
            n = $0; sub(/^[0-9a-fA-F]{64}[[:space:]]+\*?/, "", n);
            if (n == want) { print $1; found=1; exit 0 }
        }
        END { if (!found) exit 1 }
    ' "$manifest_file"
}

# Download a release asset to $1 and verify its hash. Bail on any
# mismatch so we never stage a corrupted file into the install dir.
download_verified() {
    local dest="$1"
    local name="$2"
    local url="https://github.com/${REPO}/releases/download/${tag}/${name}"
    if ! curl -fsSL -o "$dest" "$url"; then
        echo "İndirme başarısız: $url" >&2
        return 1
    fi
    if [ "$verify_enabled" = "1" ]; then
        local want
        want="$(expected_sha256 "$name")" || {
            echo "Manifest'te yok: $name" >&2
            return 1
        }
        local got
        got="$(compute_sha256 "$dest")" || return 1
        if [ "$got" != "$want" ]; then
            echo "SHA-256 uyuşmazlığı: $name" >&2
            echo "  beklenen: $want" >&2
            echo "  bulunan : $got"  >&2
            return 1
        fi
    fi
    return 0
}

# 4. Download the binary + runtime archive into staging files. We swap
#    them into place only after every download has been verified, so a
#    failed integrity check leaves the existing install untouched.
mkdir -p "$INSTALL_DIR"
tmp_bin="$(mktemp "${TMPDIR:-/tmp}/tulpar.XXXXXX")"
tmp_lib="$(mktemp "${TMPDIR:-/tmp}/tulpar-rt.XXXXXX")"
trap 'rm -f "$tmp_bin" "$tmp_lib" "$manifest_tmp"' EXIT

step "İndiriliyor: $asset"
if ! download_verified "$tmp_bin" "$asset"; then
    exit 1
fi

# The runtime archive is consumed only by `tulpar build` / AOT, so a
# missing asset is non-fatal for `tulpar --vm` users — but every
# release since v2.1.0.x ships it. Warn loudly and continue if the
# server returns 404 so older releases can still be installed.
step "Runtime kütüphanesi indiriliyor: $runtime_asset"
if download_verified "$tmp_lib" "$runtime_asset"; then
    install_runtime=1
else
    warn "Runtime kütüphanesi indirilemedi veya doğrulanamadı; sadece VM modu kullanılabilir olacak."
    install_runtime=0
fi

# 5. Stage → install. POSIX rename is atomic and works while the file
#    is open (Linux/macOS reference files by inode) so we don't need
#    the rename-to-.old dance Windows requires.
chmod +x "$tmp_bin"
mv -f "$tmp_bin" "$BINARY_PATH"
if [ "$install_runtime" = "1" ]; then
    mv -f "$tmp_lib" "$RUNTIME_PATH"
fi
rm -f "$manifest_tmp"
trap - EXIT

# 6. PATH advice. We don't auto-modify shell rc files — too easy to corrupt
#    them and too easy to surprise the user. Just print the line they need.
case ":${PATH}:" in
    *":${INSTALL_DIR}:"*)
        step "PATH zaten içeriyor: $INSTALL_DIR"
        ;;
    *)
        warn "$INSTALL_DIR PATH'inizde değil."
        note "Aşağıdaki satırı ~/.bashrc, ~/.zshrc veya ~/.profile dosyanıza ekleyin:"
        echo ""
        echo "    export PATH=\"\$PATH:${INSTALL_DIR}\""
        echo ""
        ;;
esac

# Smoke test — actually verify the binary loads. Surfaces missing
# shared libraries (libssl.so.3, glibc version skew, ...) instead of
# letting the user discover them on their first `tulpar` invocation.
# Failure aborts loudly so the user knows the install is broken.
step "Kurulum doğrulanıyor (smoke test)..."
smoke_output=$("$BINARY_PATH" --version 2>&1) || smoke_exit=$?
smoke_exit=${smoke_exit:-0}
if [ "$smoke_exit" -ne 0 ] || [ -z "$smoke_output" ]; then
    echo ""
    warn "tulpar başlatılamadı."
    if [ "$smoke_exit" -ne 0 ]; then
        echo "  Çıkış kodu: $smoke_exit" >&2
    fi
    if [ -n "$smoke_output" ]; then
        echo "  Çıktı: $smoke_output" >&2
    fi
    echo "" >&2
    echo "Bu kurulum bozuk: ikili dosya yüklendi ama açılmıyor." >&2
    echo "Olası sebep: eksik sistem kütüphanesi (libssl.so.3, glibc sürüm)." >&2
    echo "  * Linux: dağıtım paket yöneticinizle openssl/libssl3 yükleyin." >&2
    echo "  * macOS: brew install openssl@3" >&2
    echo "  * Sorun devamsa: github.com/hamer1818/TulparLang/issues" >&2
    exit 1
fi

echo ""
success "TulparLang $tag kuruldu → $BINARY_PATH"
if [ "$install_runtime" = "1" ]; then
    note "Runtime kütüphanesi → $RUNTIME_PATH"
fi
if [ "$verify_enabled" = "1" ]; then
    if [ "$gpg_verify_enabled" = "1" ]; then
        note "Tüm indirmeler SHA256SUMS.txt ile doğrulandı (manifest GPG imzalı)."
    else
        note "Tüm indirmeler SHA256SUMS.txt ile doğrulandı."
    fi
fi
show_art
echo ""
printf "%sDeneme:%s\n" "$c_cyan" "$c_reset"
echo "  tulpar --version"
echo "  tulpar --repl"
echo ""
printf "%sGüncellemek için:%s\n" "$c_cyan" "$c_reset"
echo "  tulpar update            # built-in (varsa)"
echo "  veya bu installer'ı yeniden çalıştır."
