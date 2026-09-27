"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False on the server and during hydration, true afterwards. For UI that depends on
 * browser-only state which can resolve before hydration — the guest check in `useMe` needs
 * no request, so it can be settled before a Suspense boundary hydrates — so the first client
 * render still matches the server HTML and the real state paints one frame later.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
