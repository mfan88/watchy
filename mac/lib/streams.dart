import 'dart:io' show Platform;
import 'package:shared_preferences/shared_preferences.dart';

/// Settings → Playback → Stream format. Persisted per device.
enum StreamFormat {
  auto('Auto', 'Picks the best format for this device and switches if a channel won\'t start.'),
  fmp4('fMP4', 'Fragmented MP4 HLS. Plays channels with more than one audio track.'),
  ts('MPEG-TS', 'Classic HLS. Channels with more than one audio track won\'t play.');

  final String label, hint;
  const StreamFormat(this.label, this.hint);
  StreamFormat get other => this == ts ? fmp4 : ts;
}

/// Auto's first choice per platform. All three desktop builds play through media_kit,
/// i.e. libmpv + FFmpeg (not AVPlayer on macOS), which handles fMP4 HLS: EXT-X-MAP init
/// segments and multiple EXT-X-MEDIA audio renditions. Same idea as Android
/// (android/.../Streams.kt) and Tizen (tizen/js/app.js preferredFormat).
StreamFormat preferredFormat([String? os]) {
  switch (os ?? Platform.operatingSystem) {
    case 'macos':
    case 'windows':
    case 'linux':
      return StreamFormat.fmp4;
    default:
      return StreamFormat.ts;
  }
}

/// MPEG-TS: {base}/{secret}/ch_xxx/index.m3u8 (what playlist.m3u lists)
/// fMP4:    {base}/{secret}/fmp4/ch_xxx/index.m3u8
/// Only URLs whose path matches ^/{secret}/ch_[0-9a-f]+/ are rewritten.
String streamUrl(String tsUrl, StreamFormat f, String secret) {
  if (f != StreamFormat.fmp4 || secret.isEmpty) return tsUrl;
  final m = RegExp(r'^([a-zA-Z][\w+.-]*://[^/?#]*)(/[^?#]*)(.*)$').firstMatch(tsUrl);
  if (m == null) return tsUrl;
  final prefix = '/$secret/', path = m[2]!;
  if (!path.startsWith(prefix) || !RegExp(r'^ch_[0-9a-f]+/').hasMatch(path.substring(prefix.length))) return tsUrl;
  return '${m[1]}${prefix}fmp4/${path.substring(prefix.length)}${m[3]}';
}

/// Channel slug (ch_xxx) of a stream URL, for logs and the per-channel memory. Never the key.
String channelKey(String url) => RegExp(r'/(ch_[0-9a-f]+)/').firstMatch(url)?[1] ?? url.split('/').last;

class Streams {
  static const _pref = 'streamFormat';

  /// Format that actually worked per channel this session (Auto only).
  static final _working = <String, StreamFormat>{};

  static StreamFormat setting(SharedPreferences p) =>
      StreamFormat.values.firstWhere((f) => f.name == p.getString(_pref), orElse: () => StreamFormat.auto);
  static Future<void> setSetting(SharedPreferences p, StreamFormat f) => p.setString(_pref, f.name);

  /// Concrete format (never auto) for [channel], and why (for the debug log).
  static (StreamFormat, String) choose(SharedPreferences p, String channel) {
    final s = setting(p);
    if (s != StreamFormat.auto) return (s, 'setting');
    final w = _working[channel];
    if (w != null) return (w, 'worked earlier this session');
    return (preferredFormat(), 'platform default');
  }

  static void remember(String channel, StreamFormat f) => _working[channel] = f;
}
