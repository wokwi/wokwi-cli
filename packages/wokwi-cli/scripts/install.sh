#!/bin/sh
# Based on Flyctl installer.
# Based on Deno installer: Copyright 2019 the Deno authors. All rights reserved. MIT license.
# TODO(everyone): Keep this script simple and easily auditable.

set -e

main() {
  os=$(uname -s)
  arch=$(uname -m)
  version=${1:-latest}

  # Map to the expected values for the URLs
  case "$os" in
  Darwin) os="macos" ;;
  Linux) os="linuxstatic" ;;
  *) echo "Unsupported OS: $os"; exit 1 ;;
  esac

  case "$arch" in
  x86_64) arch="x64" ;;
  aarch64) arch="arm64" ;;
  arm64) ;;
  *) echo "Unsupported architecture: $arch"; exit 1 ;;
  esac

  # URL based on detected values and version
  if [ "$version" = "latest" ]; then
    wokwi_cli_uri="https://github.com/wokwi/wokwi-cli/releases/latest/download/wokwi-cli-$os-$arch"
  else
    wokwi_cli_uri="https://github.com/wokwi/wokwi-cli/releases/download/v$version/wokwi-cli-$os-$arch"
  fi

  wokwi_cli_install="${WOKWI_CLI_INSTALL:-$HOME/.wokwi}"

  bin_dir="$wokwi_cli_install/bin"
  tmp_dir="$wokwi_cli_install/tmp"
  exe="$bin_dir/wokwi-cli"

  mkdir -p "$bin_dir"
  mkdir -p "$tmp_dir"

  curl -q --fail --location --progress-bar --output "$tmp_dir/wokwi-cli" "$wokwi_cli_uri"
  chmod +x "$tmp_dir/wokwi-cli"
  
  # atomically rename into place:
  mv "$tmp_dir/wokwi-cli" "$exe"

  mkdir -p "$HOME/bin"
  ln -s -f "$exe" "$HOME/bin/wokwi-cli"

  VERSION=$($exe --short-version)
  echo "wokwi-cli version ${VERSION} was installed successfully to $HOME/bin/wokwi-cli"

  if command -v wokwi-cli >/dev/null; then
    echo "Run 'wokwi-cli --help' to get started"
  else
    case $SHELL in
    /bin/zsh) shell_profile="$HOME/.zshrc" ;;
    *) shell_profile="$HOME/.bashrc" ;;
    esac
    echo "export PATH=\"$HOME/bin:\$PATH\"" >> "$shell_profile"
    echo "Path updated! You may need to restart your shell or run 'source $shell_profile' to refresh your PATH."
    echo "Run '$exe --help' to get started"

    # if $GITHUB_PATH is defined, add $HOME/bin to it
    if [ -n "$GITHUB_PATH" ]; then
      echo "$HOME/bin" >> "$GITHUB_PATH" | true
    fi
  fi


  echo
  echo "Stuck? Join our Discord at https://wokwi.com/discord"
}

main "$1"