# Watchy for Samsung TV (Tizen 2.4+)

A Tizen web app with the same Home and Guide screens as the Android TV app. It reads the
playlist and guide straight from the stream server (`HTV_BASE_URL/HTV_SECRET/...`) and plays
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
cp secrets.properties.example secrets.properties   # optional: fill in htvSecret
./install.sh <tv-ip> <profile-name>
```

Without `htvSecret` the TV asks for the access key on first launch (type it with the remote's
on-screen keyboard; it's remembered).

`./package.sh` alone builds `build/` and `Watchy.wgt` (unsigned if the Tizen CLI isn't
installed). It converts the WebP artwork to JPEG/PNG when Python Pillow is available,
since Tizen 2.4 may not decode WebP.

Developer-mode installs can disappear after a firmware update; just run `install.sh` again.

## Preview on a computer

Open `build/index.html` in a browser after `./package.sh`. Arrow keys / Enter / Esc work as
the remote. Video only plays on the TV (or in Safari, which plays HLS natively).
