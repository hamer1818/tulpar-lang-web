#!/usr/bin/env bash
# TulparLang installer — Linux / macOS
#
# Usage (one-liner):
#   curl -fsSL https://tulparlang.dev/install.sh | bash
#
# What this does:
#   1. Detects OS (Linux / macOS).
#   2. Downloads the matching binary from the latest GitHub release.
#   3. Installs it to ~/.local/bin/tulpar (creating the dir if needed).
#   4. Tells you how to add ~/.local/bin to PATH if it isn't already.
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
show_art() {
    printf "\n%s" "$c_cyan"
    cat <<'__ART__'
                      =++
                      +++++
                      -=++++=+
                       +++ =+++=                                           +=++
                       ++++  =+++++=                                  +==++++=
                        =+++    +++++++                          =+==+++++  +=
                         ===+=      +++++++=                   ++++++      +=+==
                        == +++++        =+++++==             +++=+           ++++
                        =++++++++++          =+++++         ++++      =++     ++==
                         ++++++++++++++=        ==++=      +++        ++=      =+++
                          +++=   ++++++++=++      ++=+    +++         =++++     ++=+
                           +++=         =++++=      =++  =+=         +++==+++++   +++
                             +=+++           ++-     ++=  +          +++     ++=++++=
                               +=+++++==              ++=            ==+      =+=++
                                   +==+++++++-        -++=+++=-      +++
                                         +++=++++-     =+++++++++==   =+=
                                              ==+=++    ++=    =++++= +++
                                         =+++=   +++=+   ++=      ==++++=
                                     =+++++=++=+   -+++=  =+        ++=++
                             +++++++++++=    +++     +++++          =+++=
                          -+++++==++++       +++       +++++        ++++     +=
                         ++++++  ==++       =++=         ++==++          +++++++
                       =+++++=   +++        +=+            =++++++++++++++++=+=
               =    ++++++++    +++        +++=                =+++=+++=   +++
                ==+++++++=+     +++       +++=                            +++
                  ==+++=+       +++      +++=                           ++++
                               +++     ++++                         +=+++==
                              +++= -+++++=                          +++++
                           =++++++++++=
                          +++++++++
                          +++++=
                         ++++=
                         +++=
                        =+++
                       =++=
                       +++
__ART__
    printf "%s" "$c_reset"
}

echo ""
printf "%sTulparLang installer%s\n" "$c_cyan" "$c_reset"
echo "===================="

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

# 3. Download the binary + runtime archive into temp files first so we
#    never leave half-written artifacts at the install path on failure.
download_url="https://github.com/${REPO}/releases/download/${tag}/${asset}"
runtime_url="https://github.com/${REPO}/releases/download/${tag}/${runtime_asset}"
mkdir -p "$INSTALL_DIR"
tmp_bin="$(mktemp "${TMPDIR:-/tmp}/tulpar.XXXXXX")"
tmp_lib="$(mktemp "${TMPDIR:-/tmp}/tulpar-rt.XXXXXX")"
trap 'rm -f "$tmp_bin" "$tmp_lib"' EXIT

step "İndiriliyor: $download_url"
curl -fsSL "$download_url" -o "$tmp_bin" \
    || { echo "Binary indirme başarısız." >&2; exit 1; }

# The runtime archive is consumed only by `tulpar build` / AOT, so a
# missing asset is non-fatal for `tulpar --vm` users — but every
# release since v2.1.0.x ships it. Warn loudly and continue if the
# server returns 404 so older releases can still be installed.
step "Runtime kütüphanesi indiriliyor: $runtime_url"
if curl -fsSL "$runtime_url" -o "$tmp_lib"; then
    install_runtime=1
else
    warn "Runtime kütüphanesi bulunamadı; sadece VM modu kullanılabilir olacak."
    install_runtime=0
fi

chmod +x "$tmp_bin"
mv -f "$tmp_bin" "$BINARY_PATH"
if [ "$install_runtime" = "1" ]; then
    mv -f "$tmp_lib" "$RUNTIME_PATH"
fi
trap - EXIT

# 4. PATH advice. We don't auto-modify shell rc files — too easy to corrupt
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

echo ""
success "TulparLang $tag kuruldu → $BINARY_PATH"
if [ "$install_runtime" = "1" ]; then
    note "Runtime kütüphanesi → $RUNTIME_PATH"
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
