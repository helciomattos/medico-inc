#!/usr/bin/env bash
set -euo pipefail

urls=(
  "citypubli|https://crm.citypubli.com.br/criacao-de-site-para-medicos/"
  "time4u|https://time4u.com.br/"
  "greatpages|https://www.greatpages.com.br/"
  "futuremarketing|https://www.futuremarketing.com.br/site-para-medico"
  "agenciadomedico|https://agenciadomedico.com.br/site-medico/"
  "sitemedicos|https://www.sitemedicos.com.br/"
  "doctorapp|https://www.doctorapp.com.br/sites-para-medicos-criacao-de-website-medico"
)

for item in "${urls[@]}"; do
  name="${item%%|*}"
  url="${item#*|}"
  out="concorrentes/screenshots/${name}.png"
  echo "[shot] $name -> $url"
  if npx playwright screenshot \
      --browser=chromium \
      --full-page \
      --wait-for-timeout=9000 \
      --timeout=180000 \
      "$url" "$out"; then
    echo "[ok] $out"
  else
    echo "[retry] $name with channel chrome"
    npx playwright screenshot \
      --browser=chromium \
      --channel=chrome \
      --full-page \
      --wait-for-timeout=10000 \
      --timeout=180000 \
      "$url" "$out" || echo "[fail] $name"
  fi
  sleep 1
done
