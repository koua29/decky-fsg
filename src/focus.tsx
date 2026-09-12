import { Focusable } from "@decky/ui";
import type { CSSProperties, MutableRefObject, ReactNode } from "react";
import { useRef } from "react";

/**
 * A decorative block the gamepad can stop on, which pulls the panel to itself.
 *
 * Steam navigates with a *virtual* focus: the element never receives a DOM focus
 * event, so `onFocus` never fires and the quick-access list never scrolls to it.
 * `onGamepadFocus` is the event that does fire. Both are wired, in case a build
 * uses real focus instead.
 */
export function FocusRow({
  children,
  style,
  block = "nearest",
  onActivate,
  elementRef,
}: {
  children: ReactNode;
  style?: CSSProperties;
  block?: ScrollLogicalPosition;
  onActivate?: () => void;
  elementRef?: MutableRefObject<HTMLDivElement | null>;
}) {
  const own = useRef<HTMLDivElement | null>(null);

  const keep = (element: HTMLDivElement | null) => {
    own.current = element;
    if (elementRef) elementRef.current = element;
  };

  const show = () => own.current?.scrollIntoView({ block, inline: "nearest", behavior: "smooth" });

  return (
    <Focusable
      ref={keep}
      style={style}
      onActivate={onActivate ?? (() => {})}
      onGamepadFocus={show}
      onFocus={show}
    >
      {children}
    </Focusable>
  );
}
