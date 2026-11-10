#!/usr/bin/env bash
# Builds the Tizen app into build/ and packages it as Watchy.wgt.
#   ./package.sh                 -> build/Watchy.wgt (unsigned unless the Tizen CLI is installed)
#   ./package.sh <profile>       -> signs with that Tizen Studio security profile
# The access key comes from ../android/secrets.properties or tizen/secrets.properties
# (htvSecret=..., htvBaseUrl=...). Without it the TV asks for the key on first launch.
set -euo pipefail
cd "$(dirname "$0")"
OUT=build
rm -rf "$OUT" && mkdir -p "$OUT/js"
cp -R config.xml index.html icon.png css fonts "$OUT"/
cp js/app.js "$OUT/js/"
cp -R ../public/teams ../public/providers ../public/matchups "$OUT"/
# Tizen 2.4's browser engine may not decode WebP: convert to JPEG/PNG when Pillow is available.
IMG_EXT=webp
if python3 -c "import PIL" 2>/dev/null; then
  python3 - "$OUT" <<'PY'
import os, sys
from PIL import Image
out = sys.argv[1]
for d in ("matchups", "providers"):
    for n in os.listdir(os.path.join(out, d)):
        if not n.endswith(".webp"): continue
        p = os.path.join(out, d, n)
        im = Image.open(p)
        if d == "matchups": im.convert("RGB").save(p[:-5] + ".jpg", quality=85)
        else: im.save(p[:-5] + ".png")
        os.remove(p)
PY
  IMG_EXT=jpg
else
  echo "Pillow not found: keeping WebP images (may not show on Tizen 2.4)"
fi

prop() { # prop <name> <default>
  local v=""
  for f in secrets.properties ../android/secrets.properties; do
    [ -f "$f" ] && v=$(grep -E "^$1=" "$f" | tail -1 | cut -d= -f2- || true)
    [ -n "$v" ] && break
  done
  echo "${v:-$2}"
}
SECRET=$(prop htvSecret "")
BASE=$(prop htvBaseUrl "https://tv.zuxi.me")
SECRET=${SECRET#/}; SECRET=${SECRET%/}
node -e 'process.stdout.write("var WATCHY_CONFIG = " + JSON.stringify({ base: process.argv[1], secret: process.argv[2], img: process.argv[3] }) + ";\n")' "$BASE" "$SECRET" "$IMG_EXT" > "$OUT/js/config.js"
node -e 'process.stdout.write("var WATCHY_MISSING = " + require("fs").readFileSync(process.argv[1], "utf8").trim() + ";\n")' ../src/lib/matchups-missing.json > "$OUT/js/missing.js"
[ -n "$SECRET" ] && echo "Access key: baked in" || echo "Access key: not set (the TV will ask on first launch)"

if command -v tizen >/dev/null 2>&1; then
  if [ $# -ge 1 ]; then tizen package -t wgt -s "$1" -- "$OUT" -o .
  else tizen package -t wgt -- "$OUT" -o .; fi
  mv -f ./*.wgt Watchy.wgt 2>/dev/null || true
else
  (cd "$OUT" && rm -f ../Watchy.wgt && zip -qr ../Watchy.wgt .)
  echo "Tizen CLI not found: Watchy.wgt is unsigned. Sign it with: tizen package -t wgt -s <profile> -- build"
fi
echo "Done: $(pwd)/Watchy.wgt"
