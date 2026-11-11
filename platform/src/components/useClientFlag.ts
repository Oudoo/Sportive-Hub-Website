"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * A browser capability check (camera, NFC, push…) that is false while rendering on the
 * server and during hydration, then the real answer. Keeps server and client markup equal.
 */
export function useClientFlag(check: () => boolean): boolean {
  return useSyncExternalStore(subscribe, check, () => false);
}
