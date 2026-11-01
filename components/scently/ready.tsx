"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
/** Prevent early input from being lost while the server HTML hydrates. */
export function Ready({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <div className="app-ready" data-app-ready={ready} inert={!ready}>
      {children}
    </div>
  );
}
