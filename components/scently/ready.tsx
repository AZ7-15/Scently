"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
/** Expose hydration readiness without disabling server-rendered navigation. */
export function Ready({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <div className="app-ready" data-app-ready={ready}>
      {children}
    </div>
  );
}
