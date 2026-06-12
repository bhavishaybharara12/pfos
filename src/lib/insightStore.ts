"use client";

// Client-side insight action store (localStorage). In the production architecture
// this is a server API + DB (pfos/06); for the static demo, act/dismiss state
// lives on the device — same UX contract, swappable backend.

const KEY = "pfos-insight-actions";
const EVENT = "pfos-insight-actions-change";
const EMPTY: Record<string, string> = {};

let cache: Record<string, string> = EMPTY;
let loaded = false;

function load(): Record<string, string> {
  if (!loaded) {
    try {
      cache = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {
      cache = {};
    }
    loaded = true;
  }
  return cache;
}

export const getActions = () => load();
export const getServerActions = () => EMPTY;

export function setAction(ruleCode: string, status: "acted" | "dismissed" | "open") {
  const next = { ...load() };
  if (status === "open") delete next[ruleCode];
  else next[ruleCode] = status;
  cache = next;
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

export function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
