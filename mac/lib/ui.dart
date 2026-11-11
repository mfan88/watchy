import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'assets.dart';
import 'models.dart';

class C {
  static const bg = Color(0xFF0B0E13);
  static const surface = Color(0xFF151A22);
  static const surfaceHi = Color(0xFF1E2530);
  static const stroke = Color(0xFF2A3240);
  static const text = Color(0xFFF2F4F8);
  static const dim = Color(0xFF9AA4B2);
  static const faint = Color(0xFF5F6978);
  static const accent = Color(0xFF4C8DFF);
  static const accentDim = Color(0xFF1F3A66);
  static const live = Color(0xFFE5484D);
  static const soon = Color(0xFFF0A93B);
}

/// Titles use DM Sans; all other text uses IBM Plex Sans (the theme default).
const titleFont = 'DMSans';

ThemeData watchyTheme() => ThemeData(
      brightness: Brightness.dark,
      fontFamily: 'IBMPlexSans',
      scaffoldBackgroundColor: C.bg,
      colorScheme: const ColorScheme.dark(primary: C.accent, surface: C.surface, onSurface: C.text),
      focusColor: C.accent.withValues(alpha: .25),
      textTheme: const TextTheme(bodyMedium: TextStyle(color: C.text)),
      tooltipTheme: const TooltipThemeData(decoration: BoxDecoration(color: C.surfaceHi, borderRadius: BorderRadius.all(Radius.circular(6)))),
    );

String fmtTime(DateTime t) {
  final h = t.hour % 12 == 0 ? 12 : t.hour % 12;
  return '$h:${t.minute.toString().padLeft(2, '0')} ${t.hour < 12 ? 'AM' : 'PM'}';
}

class Wordmark extends StatelessWidget {
  final double size;
  const Wordmark({super.key, this.size = 30});
  @override
  Widget build(BuildContext context) => Text('watchy', style: TextStyle(fontFamily: 'Anxler', fontSize: size, color: C.text, height: 1));
}

class LiveBadge extends StatelessWidget {
  final bool live;
  const LiveBadge(this.live, {super.key});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
        decoration: BoxDecoration(color: live ? C.live : C.soon, borderRadius: BorderRadius.circular(4)),
        child: Text(live ? 'LIVE' : 'SOON', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: live ? C.text : C.bg)),
      );
}

Widget assetImage(String path, {BoxFit fit = BoxFit.cover, Widget Function()? fallback}) {
  final fb = fallback ?? () => const SizedBox.shrink();
  if (path.endsWith('.svg')) return SvgPicture.asset(path, fit: fit, placeholderBuilder: (_) => const SizedBox.shrink());
  return Image.asset(path, fit: fit, errorBuilder: (_, __, ___) => fb(), filterQuality: FilterQuality.medium);
}

class ProviderAvatar extends StatelessWidget {
  final String provider;
  final double size;
  const ProviderAvatar(this.provider, {super.key, this.size = 36});

  String get _initials {
    final w = provider.trim().split(RegExp(r'\s+')).where((s) => s.isNotEmpty).take(2);
    final s = w.map((e) => e[0].toUpperCase()).join();
    return s.isEmpty ? '?' : s;
  }

  @override
  Widget build(BuildContext context) {
    Widget initials() => Center(child: Text(_initials, style: TextStyle(fontSize: size / 2.8, fontWeight: FontWeight.w600, color: C.text)));
    final logo = providerLogo(provider);
    return Container(
      width: size,
      height: size,
      clipBehavior: Clip.antiAlias,
      decoration: const BoxDecoration(shape: BoxShape.circle, color: C.stroke),
      child: logo == null ? initials() : assetImage(logo, fallback: initials),
    );
  }
}

/// Matchup art, or both team logos when there is no picture for the pairing.
class MatchupArt extends StatelessWidget {
  final Game game;
  const MatchupArt(this.game, {super.key});
  @override
  Widget build(BuildContext context) {
    Widget pair() => Container(
          color: C.surfaceHi,
          alignment: Alignment.center,
          child: isTeam(game.away) && isTeam(game.home)
              ? Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  SizedBox(width: 72, height: 72, child: assetImage(teamLogo(game.away)!, fit: BoxFit.contain)),
                  const Padding(padding: EdgeInsets.symmetric(horizontal: 18), child: Text('@', style: TextStyle(fontSize: 22, color: C.faint))),
                  SizedBox(width: 72, height: 72, child: assetImage(teamLogo(game.home)!, fit: BoxFit.contain)),
                ])
              : const Wordmark(size: 34),
        );
    final img = matchupImage(game.away, game.home);
    return img == null ? pair() : assetImage(img, fallback: pair);
  }
}

/// Hover/focus feedback for clickable cards: lifts and outlines.
class Pressable extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;
  final BorderRadius radius;
  final Color color, hoverColor;
  final Color? hoverBorder;
  final bool autofocus;
  final ValueChanged<bool>? onFocus;
  const Pressable({super.key, required this.child, required this.onTap, this.radius = const BorderRadius.all(Radius.circular(12)), this.color = C.surface, this.hoverColor = C.surfaceHi, this.hoverBorder = C.text, this.autofocus = false, this.onFocus});
  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _hover = false, _focus = false;
  @override
  Widget build(BuildContext context) {
    final on = _hover || _focus;
    return FocusableActionDetector(
      autofocus: widget.autofocus,
      mouseCursor: SystemMouseCursors.click,
      onShowHoverHighlight: (v) => setState(() => _hover = v),
      onShowFocusHighlight: (v) {
        setState(() => _focus = v);
        widget.onFocus?.call(v);
      },
      onFocusChange: (v) {
        if (v) Scrollable.ensureVisible(context, alignment: .5, duration: const Duration(milliseconds: 200));
      },
      actions: {ActivateIntent: CallbackAction<ActivateIntent>(onInvoke: (_) => widget.onTap())},
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: on ? 1.03 : 1,
          duration: const Duration(milliseconds: 140),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 140),
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              color: on ? widget.hoverColor : widget.color,
              borderRadius: widget.radius,
              border: Border.all(color: on && widget.hoverBorder != null ? widget.hoverBorder! : C.stroke, width: on && widget.hoverBorder != null ? 2 : 1),
              boxShadow: on ? const [BoxShadow(color: Color(0x66000000), blurRadius: 18, offset: Offset(0, 8))] : null,
            ),
            child: widget.child,
          ),
        ),
      ),
    );
  }
}
