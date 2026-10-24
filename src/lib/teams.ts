import codes from "./teams.json" with { type: "json" };

// NHL team logos live in /public/teams/<CODE>.svg (dark-background variants).
const CODES = new Set<string>(codes);

export const isTeam = (code?: string): code is string => !!code && CODES.has(code);

export function teamLogo(code?: string): string | undefined {
  return isTeam(code) ? `/teams/${code}.svg` : undefined;
}
