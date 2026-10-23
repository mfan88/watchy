"use client";
import { setTheme, useTheme } from "@/lib/theme";
import { IconMoon, IconSun } from "./icons";

export function ThemeToggle() {
  const theme = useTheme();
  return (
    <div className="theme-toggle" role="group" aria-label="Appearance">
      <button aria-pressed={theme === "light"} aria-label="Light mode" onClick={() => setTheme("light")}><IconSun /><span className="lbl">Light mode</span></button>
      <button aria-pressed={theme === "dark"} aria-label="Dark mode" onClick={() => setTheme("dark")}><IconMoon /><span className="lbl">Dark mode</span></button>
    </div>
  );
}
