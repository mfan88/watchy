import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:watchy_mac/streams.dart';

void main() {
  const ts = 'https://tv.example/s3cr3t/ch_0a1b/index.m3u8';

  test('fMP4 URL inserts fmp4/ after the key', () {
    expect(streamUrl(ts, StreamFormat.fmp4, 's3cr3t'), 'https://tv.example/s3cr3t/fmp4/ch_0a1b/index.m3u8');
    expect(streamUrl('$ts?x=1', StreamFormat.fmp4, 's3cr3t'), 'https://tv.example/s3cr3t/fmp4/ch_0a1b/index.m3u8?x=1');
    expect(streamUrl(ts, StreamFormat.ts, 's3cr3t'), ts);
  });

  test('only {secret}/ch_xxx/ URLs are rewritten', () {
    expect(streamUrl(ts, StreamFormat.fmp4, 'other'), ts);
    const odd = 'https://tv.example/s3cr3t/live/index.m3u8';
    expect(streamUrl(odd, StreamFormat.fmp4, 's3cr3t'), odd);
    const upper = 'https://tv.example/s3cr3t/ch_XYZ/index.m3u8';
    expect(streamUrl(upper, StreamFormat.fmp4, 's3cr3t'), upper);
  });

  test('channel key never includes the secret', () {
    expect(channelKey(ts), 'ch_0a1b');
    expect(channelKey(streamUrl(ts, StreamFormat.fmp4, 's3cr3t')), 'ch_0a1b');
  });

  test('platform table', () {
    for (final os in ['macos', 'windows', 'linux']) {
      expect(preferredFormat(os), StreamFormat.fmp4);
    }
  });

  test('setting overrides Auto; Auto remembers what worked', () async {
    SharedPreferences.setMockInitialValues({});
    final p = await SharedPreferences.getInstance();
    expect(Streams.setting(p), StreamFormat.auto);
    expect(Streams.choose(p, 'ch_1').$2, 'platform default');
    Streams.remember('ch_1', StreamFormat.ts);
    expect(Streams.choose(p, 'ch_1'), (StreamFormat.ts, 'worked earlier this session'));
    await Streams.setSetting(p, StreamFormat.fmp4);
    expect(Streams.choose(p, 'ch_1'), (StreamFormat.fmp4, 'setting'));
  });
}
