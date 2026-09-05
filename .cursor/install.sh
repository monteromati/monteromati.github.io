#!/usr/bin/env bash
set -euo pipefail

# Idempotent install script for the Quarto website.
# The site's only build dependency is the Quarto CLI. R-based posts are
# committed with a `_freeze` cache (posts/_metadata.yml sets `freeze: true`),
# so R is not required to render the site.

QUARTO_VERSION="1.8.25"

current_version="$(quarto --version 2>/dev/null || echo "none")"

if [ "${current_version}" != "${QUARTO_VERSION}" ]; then
  echo "Installing Quarto ${QUARTO_VERSION} (found: ${current_version})..."
  tmp_deb="$(mktemp --suffix=.deb)"
  curl -fsSL -o "${tmp_deb}" \
    "https://github.com/quarto-dev/quarto-cli/releases/download/v${QUARTO_VERSION}/quarto-${QUARTO_VERSION}-linux-amd64.deb"
  sudo dpkg -i "${tmp_deb}"
  rm -f "${tmp_deb}"
else
  echo "Quarto ${QUARTO_VERSION} already installed."
fi

echo "Quarto version: $(quarto --version)"
