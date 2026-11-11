#!/usr/bin/env bash
# Builds the Tizen app into build/ and packages it as Watchy.wgt.
#   ./package.sh                 -> build/Watchy.wgt (unsigned unless the Tizen CLI is installed)
#   ./package.sh <profile>       -> signs with that Tizen Studio security profile
# Env: VERSION (e.g. 2.0.0), AUTH_URL, UPDATE_REPO. Also writes watchy-tizen-ota.json,
# the over-the-air code update attached to each GitHub release.
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

# Version comes from $VERSION (CI passes the release tag); no stream key is built in.
VERSION=${VERSION:-0.0.0}; VERSION=${VERSION#v}
AUTH_URL=${AUTH_URL:-https://tv.zuxi.me/auth/key}
UPDATE_REPO=${UPDATE_REPO:-mfan88/watchy}
cp js/boot.js "$OUT/js/"
node -e 'process.stdout.write("var WATCHY_CONFIG = " + JSON.stringify({ auth: process.argv[1], version: process.argv[2], repo: process.argv[3], img: process.argv[4] }) + ";\n")' "$AUTH_URL" "$VERSION" "$UPDATE_REPO" "$IMG_EXT" > "$OUT/js/config.js"
node -e 'process.stdout.write("var WATCHY_MISSING = " + require("fs").readFileSync(process.argv[1], "utf8").trim() + ";\n")' ../src/lib/matchups-missing.json > "$OUT/js/missing.js"
sed -i.bak "s/version=\"[0-9.]*\" viewmodes/version=\"$VERSION\" viewmodes/" "$OUT/config.xml" && rm -f "$OUT/config.xml.bak"
# Over-the-air code update published with each release (see js/boot.js).
node -e '
const fs = require("fs");
const css = fs.readFileSync(process.argv[2] + "/css/style.css", "utf8").replace(/url\(\.\.\//g, "url(");
fs.writeFileSync(process.argv[3], JSON.stringify({ version: process.argv[1], js: fs.readFileSync(process.argv[2] + "/js/app.js", "utf8"), css }));
' "$VERSION" "$OUT" watchy-tizen-ota.json
echo "Version $VERSION"

if command -v tizen >/dev/null 2>&1; then
  if [ $# -ge 1 ]; then tizen package -t wgt -s "$1" -- "$OUT" -o .
  else tizen package -t wgt -- "$OUT" -o .; fi
  mv -f ./*.wgt Watchy.wgt 2>/dev/null || true
else
  (cd "$OUT" && rm -f ../Watchy.wgt && zip -qr ../Watchy.wgt .)
  echo "Tizen CLI not found: Watchy.wgt is unsigned. Sign it with: tizen package -t wgt -s <profile> -- build"
fi
echo "Done: $(pwd)/Watchy.wgt"
