import type { ComponentProps } from "react";

/** Native navigation remains usable if hydration or client routing fails. */
export default function SiteLink(props: ComponentProps<"a">) {
  return <a {...props} />;
}
