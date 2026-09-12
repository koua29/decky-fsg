import type { FocusEvent } from "react";

/** The quick-access list does not always follow the stick: scroll the focused row in ourselves. */
export function scrollIntoView(block: ScrollLogicalPosition = "nearest") {
  return (e: FocusEvent<HTMLDivElement>) => {
    e.currentTarget.scrollIntoView({ block, inline: "nearest", behavior: "smooth" });
  };
}
