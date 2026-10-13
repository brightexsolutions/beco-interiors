#!/usr/bin/env bash
# Renders the handbook HTML in this folder to PDF with headless Chrome.
# The diagrams are drawn by Mermaid in the page, so Chrome is given time to
# load it from the CDN and lay them out before it prints.
#
#   docs/handbook/render.sh            both documents
#   docs/handbook/render.sh technical  one of them
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
chrome="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
if [ $# -eq 0 ]; then docs=(technical summary); else docs=("$@"); fi

for doc in "${docs[@]}"; do
  src="$here/beco-platform-$doc.html"
  out="$here/beco-platform-$doc.pdf"
  "$chrome" --headless=new --disable-gpu --no-pdf-header-footer \
    --virtual-time-budget=20000 --run-all-compositor-stages-before-draw \
    --print-to-pdf="$out" "file://$src" 2>/dev/null
  echo "$out"
done
