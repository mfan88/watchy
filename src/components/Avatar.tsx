function hue(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function initials(text: string) {
  const words = text.replace(/[()]/g, "").split(/[\s+]+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : text.slice(0, 2);
  return letters.toUpperCase();
}

// Initials fallback. To use real images later, add an `src` prop here (e.g.
// /teams/<code>.png) with fixed width/height and loading="lazy".
export function Avatar({ label, text }: { label: string; text?: string }) {
  const h = hue(label);
  return (
    <span className="avatar" aria-hidden style={{ background: `linear-gradient(135deg, hsl(${h} 65% 52%), hsl(${(h + 50) % 360} 70% 38%))` }}>
      {text ?? initials(label)}
    </span>
  );
}
