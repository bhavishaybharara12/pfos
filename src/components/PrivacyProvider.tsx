"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

const KEY = "pfos-privacy";
const EVENT = "pfos-privacy-change";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
const getSnapshot = () => localStorage.getItem(KEY) === "1";
const getServerSnapshot = () => false;

const PrivacyContext = createContext<{ hidden: boolean; toggle: () => void }>({
  hidden: false,
  toggle: () => {},
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const hidden = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = () => {
    localStorage.setItem(KEY, hidden ? "0" : "1");
    window.dispatchEvent(new Event(EVENT));
  };
  return (
    <PrivacyContext.Provider value={{ hidden, toggle }}>
      <div className={hidden ? "privacy-on" : ""}>{children}</div>
    </PrivacyContext.Provider>
  );
}

export const usePrivacy = () => useContext(PrivacyContext);
