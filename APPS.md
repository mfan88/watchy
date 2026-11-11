# Watchy apps

Watchy lets you watch live hockey games on your TV or computer. Open it, pick a game,
and choose which broadcast (stream) you want. You can also browse what's on now and
next in a TV-style guide.

**You need a Watchy account** (a username and password) to sign in. Ask the person
who gave you Watchy for one.

Downloads are on the [Releases page](../../releases/latest). Pick the file for your
device from the table below.

| Device | File to download |
|---|---|
| Android TV, Google TV, Chromecast with Google TV, Nvidia Shield, Mi Box, Fire TV | `…-androidtv.apk` |
| Samsung smart TV (2016 or newer) | `…-samsung-tizen.wgt` |
| Mac | `…-macos.dmg` |
| Windows 10 / 11 | `…-windows-x64-setup.exe` |
| Linux (Ubuntu, Debian, Fedora, Arch, …) | `…-linux-x86_64.AppImage` |

---

## Installing

### Android TV / Google TV

Android TVs don't let you install apps from outside the Play Store until you allow it.

**Easiest: with the free *Downloader* app**
1. On the TV, install **Downloader** (by AFTVnews) from the Play Store.
2. Go to **Settings → Device Preferences → Security & restrictions → Unknown sources**
   and turn it on for **Downloader**. On Google TV it's under **Settings → System →
   Developer options**: first turn on Developer options by clicking **About → Android TV
   OS build** seven times.
3. Open Downloader, type the address of the `.apk` from the Releases page, and choose
   **Install** when it finishes downloading.

**From a computer (adb)**
```bash
adb connect <tv-ip-address>:5555
adb install -r Watchy-<version>-androidtv.apk
```

Watchy then appears in your TV's apps row.

### Samsung smart TV

Samsung TVs only install apps from outside their store in **Developer mode**, using
Samsung's free Tizen Studio on a computer. If someone set this up for you, ask them to
install or update it. If you're doing it yourself, follow
[tizen/README.md](tizen/README.md).

### Mac

Open the `.dmg` and drag **Watchy** onto **Applications**, then open it from
Applications like any other app.

### Windows

1. Run `Watchy-<version>-windows-x64-setup.exe`.
2. If Windows shows **"Windows protected your PC"**, click **More info → Run anyway**.
   This appears because the installer isn't from a big-name publisher.
3. Watchy installs for your user only (no administrator password) and adds a Start menu
   entry.

Prefer not to install? Download the `…-portable.zip`, unzip it anywhere and run
`Watchy.exe`. The portable version doesn't update itself.

### Linux

1. Download the `.AppImage` and make it runnable, either with right-click →
   **Properties → Allow executing as program**, or from a terminal:
   ```bash
   chmod +x Watchy-*-linux-x86_64.AppImage
   ./Watchy-*-linux-x86_64.AppImage
   ```
2. If it doesn't start, install FUSE 2 (AppImages need it):
   - Ubuntu 24.04+: `sudo apt install libfuse2t64`
   - Ubuntu 22.04 / Debian: `sudo apt install libfuse2`
   - Arch: `sudo pacman -S fuse2`
   - Fedora: `sudo dnf install fuse-libs`

Keep the AppImage somewhere permanent (for example `~/Applications`), because updates
replace that file. A `.tar.gz` is also available if you'd rather unpack it yourself; that
version doesn't update itself.

---

## Using Watchy

**Signing in:** enter your Watchy username and password. You only do this once on each
device. If your account is removed or changed, Watchy asks you to sign in again.

**Home** lists every game that's live or about to start:
- The big picture plays the game's main stream.
- The buttons next to it are the other broadcasts of that game (different channels,
  languages, home/away feeds). Pick one to jump straight in.

**Guide** is a TV-guide grid showing every stream and what's on over the next three
hours. The blue line marks the current time. Select any block to watch that stream.

**While watching**

| | TV remote | Computer |
|---|---|---|
| Next / previous stream | ▲ ▼ or CH+ / CH− | ↑ ↓ (or click a stream at the bottom) |
| Show title / retry | OK | Enter |
| Pause | Play/Pause | Space (or click) |
| Back to the list | Back | Esc |

The list refreshes itself every couple of minutes, so new games appear on their own.

**Signing out:** the **Sign out** button is at the top right on TVs; on computers it's
the arrow-out icon.

---

## Updates

Watchy keeps itself up to date. You don't need to download it again:

- **Android TV:** when a new version is out, Watchy shows **Update available** on
  launch. Choose **Update** and confirm the install. The first time, Android asks you
  to allow Watchy to install apps; turn it on and choose **Update** again.
- **Samsung TV:** new versions download quietly in the background and take effect the
  next time you open Watchy.
- **Mac, Windows, Linux (AppImage):** an **Update to x.y.z** button appears at the top of
  the window. Click it, and Watchy downloads the new version, installs it and reopens.

You keep your sign-in through updates.

---

## Troubleshooting

| Problem | Try this |
|---|---|
| "Invalid username or password." | Check for typos. Usernames aren't case-sensitive; passwords are. |
| "Too many attempts." | Wait 15 minutes and try again. |
| "Can't reach the Watchy server" | Check the device's internet connection. |
| "No live games right now" | Games appear here about when they start. |
| A stream says it's unavailable | Press OK/Enter to retry, or pick another stream for the same game. Streams sometimes end early or start late. |
| Video stutters | Try another stream for the same game, or use a wired connection. |
