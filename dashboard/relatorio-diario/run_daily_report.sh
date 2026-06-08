#!/usr/bin/env bash
# Roda o relatório diário da pecuária e envia no WhatsApp.
# Uso:  ./run_daily_report.sh [YYYY-MM-DD]   (default: hoje em GMT-3)
set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then set -a; source .env; set +a; fi

DATA="${1:-$(TZ=America/Sao_Paulo date +%F)}"
echo "== Relatório diário da pecuária — $DATA =="
python3 daily_report.py "$DATA" --send
