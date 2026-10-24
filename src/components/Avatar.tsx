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

// A provider logo when one exists, otherwise coloured initials.
export function Avatar({ label, text, src }: { label: string; text?: string; src?: string }) {
  if (src) return <img className="avatar logo-tile" src={src} alt="" width={38} height={38} loading="lazy" decoding="async" />;
  // Alternate Oilers blue / orange by label so neighbours differ.
  const orange = hue(label) % 2 === 0;
  return (
    <span className="avatar" aria-hidden style={{ background: orange ? "linear-gradient(135deg, #ff6a2a, #b53300)" : "linear-gradient(135deg, #1f6fe0, #0a3a7a)" }}>
      {text ?? initials(label)}
    </span>
  );
}
