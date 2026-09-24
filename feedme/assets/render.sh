#!/bin/sh
# Re-render the PNG assets from render.html with headless Chrome.
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --default-background-color=00000000 \
  --virtual-time-budget=6000 --window-size="$2" --screenshot="$PWD/$3" "file://$PWD/render.html?$1" 2>/dev/null; }
shot pfp 1000,1000 pfp.png
shot pfp-kaiju 1000,1000 pfp-kaiju.png
shot banner 1500,500 x-banner.png
shot og 1200,630 og.png
shot icon 256,256 favicon.png
ls -la *.png
