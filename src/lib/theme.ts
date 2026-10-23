"use client";
import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";
const KEY = "watchy-theme";
const EVENT = "watchy-theme";

function read(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => { window.addEventListener(EVENT, cb); return () => window.removeEventListener(EVENT, cb); },
    read,
    () => "light",
  );
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch {}
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#ffffff" : "#000000");
  window.dispatchEvent(new Event(EVENT));
}

// Stored only in this browser (localStorage), never tied to the account.
// Light is the default when nothing is stored. Runs before first paint
// (inlined in <head>) so there is no flash.
export const THEME_INIT = `(function(){var t="light";try{var s=localStorage.getItem("${KEY}");if(s==="light"||s==="dark")t=s}catch(e){}document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"#ffffff":"#000000")})()`;
