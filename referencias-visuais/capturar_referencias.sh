#!/usr/bin/env bash
set -euo pipefail

mkdir -p referencias-visuais/screenshots

refs=(
  "webflow|https://webflow.com"
  "framer|https://www.framer.com"
  "wix-studio|https://www.wix.com/studio"
  "squarespace|https://www.squarespace.com"
  "vercel|https://vercel.com"
  "stripe|https://stripe.com"
)

for item in "${refs[@]}"; do
  name="${item%%|*}"
  url="${item#*|}"
  out="referencias-visuais/screenshots/${name}.png"
  echo "[shot] $name -> $url"
  if npx playwright screenshot \
      --browser=chromium \
      --full-page \
      --wait-for-timeout=10000 \
      --timeout=180000 \
      "$url" "$out"; then
    echo "[ok] $out"
  else
    echo "[retry] $name"
    npx playwright screenshot \
      --browser=chromium \
      --channel=chrome \
      --full-page \
      --wait-for-timeout=12000 \
      --timeout=180000 \
      "$url" "$out" || echo "[fail] $name"
  fi
  sleep 1
done
