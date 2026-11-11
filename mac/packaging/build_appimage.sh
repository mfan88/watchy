#!/usr/bin/env bash
# Wraps the Flutter Linux bundle into an AppImage (plus a .tar.gz), bundling libmpv and
# its dependencies. Build on the oldest distro you want to support (CI uses Ubuntu 22.04).
#   packaging/build_appimage.sh <version>
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=${1:-0.0.0}
BUNDLE=build/linux/x64/release/bundle
OUT=dist
TOOLS=build/appimage-tools
mkdir -p "$OUT" "$TOOLS"

fetch() { [ -x "$TOOLS/$1" ] || { curl -fsSL -o "$TOOLS/$1" "$2"; chmod +x "$TOOLS/$1"; }; }
fetch linuxdeploy https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage
fetch appimagetool https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage
export APPIMAGE_EXTRACT_AND_RUN=1 NO_STRIP=1

APPDIR=build/AppDir
rm -rf "$APPDIR" && mkdir -p "$APPDIR/usr/bin" "$APPDIR/usr/share/applications" "$APPDIR/usr/share/icons/hicolor/256x256/apps"
cp -R "$BUNDLE"/. "$APPDIR/usr/bin/"
cp packaging/watchy.desktop "$APPDIR/usr/share/applications/watchy.desktop"
cp macos/Runner/Assets.xcassets/AppIcon.appiconset/app_icon_256.png "$APPDIR/usr/share/icons/hicolor/256x256/apps/watchy.png"

# Copy shared-library dependencies of the app and its plugins (libmpv, ffmpeg, ...)
# into usr/lib; core system libs (glibc, GL, X11/Wayland) stay on the host per the
# AppImage exclude list, which is what keeps it portable across distros.
"$TOOLS/linuxdeploy" --appdir "$APPDIR" \
  --executable "$APPDIR/usr/bin/watchy" \
  $(for so in "$APPDIR"/usr/bin/lib/*.so; do echo --deploy-deps-only "$so"; done) \
  --desktop-file "$APPDIR/usr/share/applications/watchy.desktop" \
  --icon-file "$APPDIR/usr/share/icons/hicolor/256x256/apps/watchy.png"

# Flutter looks for data/ and lib/ next to the executable, so launch it from usr/bin.
cat > "$APPDIR/AppRun" <<'RUN'
#!/bin/sh
HERE="$(dirname "$(readlink -f "$0")")"
export LD_LIBRARY_PATH="$HERE/usr/lib:$HERE/usr/bin/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec "$HERE/usr/bin/watchy" "$@"
RUN
chmod +x "$APPDIR/AppRun"

ARCH=x86_64 "$TOOLS/appimagetool" --no-appstream "$APPDIR" "$OUT/Watchy-$VERSION-linux-x86_64.AppImage"
tar -C "$BUNDLE/.." -czf "$OUT/Watchy-$VERSION-linux-x86_64.tar.gz" --transform "s,^bundle,watchy-$VERSION," bundle
ls -la "$OUT"
