# Watchy for Samsung TV (Tizen 2.4+)

A Tizen web app with the same Home and Guide screens as the Android TV app. Users sign in
with a Watchy account at the stream server's `/auth/key` endpoint, which returns the stream
key; the app then reads the playlist and guide straight from the stream server and plays
streams with Samsung's built-in AVPlay player. Plain ES5 JavaScript with no build step, so it
runs on 2016 (Tizen 2.4) models.

Remote: arrows + OK to browse, Back returns to the tabs / exits. In the player, Up/Down or
CH+/CH− change stream, OK shows the info / retries, Play/Pause pauses, Back stops.

## 1. Set up the TV and your computer (once)

1. Install [Tizen Studio](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html)
   with the **TV Extensions** and **Samsung Certificate Extension** (Package Manager →
   Extension SDK). Add `tizen-studio/tools/ide/bin` and `tizen-studio/tools` to your `PATH`.
2. On the TV: open **Apps**, press `1 2 3 4 5` on the remote, turn **Developer mode** on, enter
   your computer's IP, then restart the TV (hold the power button).
3. In Tizen Studio open **Tools → Certificate Manager**, create a **Samsung** certificate profile
   (sign in with a Samsung account). For the distributor certificate, connect to the TV first
   (Device Manager → Scan → connect) so its DUID is added. Remember the profile name.

## 2. Build and install

```bash
VERSION=2.0.0 ./install.sh <tv-ip> <profile-name>
```

Or download the `.wgt` from a GitHub release (CI signs it if the Samsung certificates are
stored as repository secrets, see `.github/workflows/apps.yml`) and install it with
`tizen install -n Watchy-*.wgt -t <tv>`.

## Updates

A packaged app can't reinstall itself on a TV, so `js/boot.js` updates the app's code
instead. On launch it checks the latest GitHub release for `watchy-tizen-ota.json`
(app.js + styles, built by `package.sh`), stores it, and runs it from the next launch on.
Images and fonts only change with a reinstall.

`./package.sh` alone builds `build/`, `Watchy.wgt` (unsigned if the Tizen CLI isn't
installed) and `watchy-tizen-ota.json`. It converts the WebP artwork to JPEG/PNG when Python Pillow is available,
since Tizen 2.4 may not decode WebP.

Developer-mode installs can disappear after a firmware update; just run `install.sh` again.

## Preview on a computer

Open `build/index.html` in a browser after `./package.sh`. Arrow keys / Enter / Esc work as
the remote. Video only plays on the TV (or in Safari, which plays HLS natively).
