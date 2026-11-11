#!/usr/bin/env bash
# Signs, packages and installs Watchy on a Samsung TV in Developer Mode.
#   ./install.sh <tv-ip> <tizen-security-profile>
set -euo pipefail
cd "$(dirname "$0")"
TV=${1:?usage: ./install.sh <tv-ip> <security-profile>}
PROFILE=${2:?usage: ./install.sh <tv-ip> <security-profile>}
command -v tizen >/dev/null || { echo "Install Tizen Studio and add tizen-studio/tools/ide/bin to PATH"; exit 1; }
SDB=$(command -v sdb || echo "$(dirname "$(dirname "$(dirname "$(command -v tizen)")")")/sdb")
./package.sh "$PROFILE"
"$SDB" connect "$TV"
TARGET=$("$SDB" devices | awk -v ip="$TV" 'index($1, ip) == 1 { print $3 }' | head -1)
[ -n "$TARGET" ] || { echo "TV not found in 'sdb devices'"; exit 1; }
tizen install -n Watchy.wgt -t "$TARGET"
tizen run -p WatchyTV01.Watchy -t "$TARGET" || true
