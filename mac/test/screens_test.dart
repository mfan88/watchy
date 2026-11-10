// Renders Home and Guide with the repo's fixture playlist/guide:
//   flutter test --update-goldens test/screens_test.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:watchy_mac/api.dart';
import 'package:watchy_mac/guide.dart';
import 'package:watchy_mac/home.dart';
import 'package:watchy_mac/models.dart';
import 'package:watchy_mac/ui.dart';

Future<void> _font(String family, List<String> files) async {
  final l = FontLoader(family);
  for (final f in files) {
    if (File(f).existsSync()) l.addFont(Future.value(ByteData.sublistView(File(f).readAsBytesSync())));
  }
  await l.load();
}

void main() {
  late List<Channel> channels;
  late List<Programme> programmes;

  setUpAll(() async {
    await _font('Roboto', ['/usr/share/fonts/opentype/inter/Inter-Regular.otf', '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf']);
    await _font('Anxler', ['assets/fonts/anxler.ttf']);
    final flutterRoot = Platform.environment['FLUTTER_ROOT'] ?? '/opt/flutter';
    await _font('MaterialIcons', ['$flutterRoot/bin/cache/artifacts/material_fonts/MaterialIcons-Regular.otf']);
    channels = parseM3U(File('../tests/fixtures/playlist.m3u').readAsStringSync());
    // Shift the fixture guide so 2026-10-23T02:00Z is "now".
    final shift = DateTime.now().difference(DateTime.utc(2026, 10, 23, 2));
    programmes = [
      for (final p in parseXmltv(File('../tests/fixtures/guide.xml').readAsStringSync()))
        Programme(c: p.c, s: p.s.add(shift), e: p.e.add(shift), t: p.t, d: p.d, soon: p.soon),
    ];
  });

  test('parsers match the website on the fixtures', () {
    expect(channels.length, 9);
    expect(programmes.length, 18);
    expect(programmes.where((p) => p.soon).length, 9);
    expect(parseXmltvTime('20261022130000 +0000')!.millisecondsSinceEpoch, 1792674000000);
  });

  Widget frame(Widget child) => MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: watchyTheme().copyWith(textTheme: watchyTheme().textTheme.apply(fontFamily: 'Roboto')),
        home: Scaffold(body: DefaultTextStyle.merge(style: const TextStyle(fontFamily: 'Roboto'), child: child)),
      );

  for (final screen in ['home', 'guide']) {
    testWidgets(screen, (t) async {
      t.view.physicalSize = const Size(2880, 1800);
      t.view.devicePixelRatio = 2;
      addTearDown(t.view.reset);
      final body = screen == 'home'
          ? HomeView(games: buildGames(channels, programmes), onPlay: (_) {})
          : GuideView(channels: channels, programmes: programmes, onPlay: (_) {});
      await t.runAsync(() async {
        await t.pumpWidget(frame(Column(children: [
          const Padding(padding: EdgeInsets.fromLTRB(36, 22, 36, 10), child: Row(children: [Wordmark(size: 28), SizedBox(width: 32), Text('Home      Guide', style: TextStyle(fontSize: 15, color: C.dim))])),
          Expanded(child: body),
        ])));
        for (final e in find.byType(Image).evaluate()) {
          await precacheImage((e.widget as Image).image, e);
        }
        await Future<void>.delayed(const Duration(milliseconds: 300));
      });
      await t.pumpAndSettle();
      await expectLater(find.byType(MaterialApp), matchesGoldenFile('goldens/$screen.png'));
    });
  }
}
