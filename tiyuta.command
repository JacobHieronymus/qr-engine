#!/bin/zsh
# tiyuta — double-click: serves this folder on this Mac only and opens the piece in Chrome.
# Close this window after the show.
cd "$(dirname "$0")"
URL="http://localhost:8792/tiyuta.html"
if /usr/bin/nc -z 127.0.0.1 8792 2>/dev/null; then open -a "Google Chrome" "$URL"; exit 0; fi
(sleep 1; open -a "Google Chrome" "$URL") &
exec /usr/bin/python3 -m http.server 8792 --bind 127.0.0.1
