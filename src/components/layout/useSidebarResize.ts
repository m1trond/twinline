import { useCallback } from "react";
import type { PointerEvent, RefObject } from "react";

const minSidebarWidth = 72;
const defaultSidebarWidth = 270;
const sidebarGridGap = 8;

export function getMaxSidebarWidth(availableWidth?: number) {
  const gridWidth =
    availableWidth ??
    (typeof window === "undefined" ? defaultSidebarWidth * 2 + sidebarGridGap : window.innerWidth);

  const halfGridWidth = Math.floor((gridWidth - sidebarGridGap) / 2);

  return Math.max(minSidebarWidth, halfGridWidth);
}

export function getCurrentMaxSidebarWidth(gridElement: HTMLElement | null) {
  if (gridElement) {
    return getMaxSidebarWidth(gridElement.clientWidth);
  }

  if (typeof window === "undefined") {
    return defaultSidebarWidth;
  }

  return getMaxSidebarWidth();
}

export function clampSidebarWidth(width: number, gridElement: HTMLElement | null = null) {
  return Math.min(Math.max(width, minSidebarWidth), getCurrentMaxSidebarWidth(gridElement));
}

type UseSidebarResizeProps = {
  sidebarWidth: number;
  setSidebarWidth: (width: number | ((curr: number) => number)) => void;
  sidebarGridRef: RefObject<HTMLElement | null>;
};

export function useSidebarResize({
  sidebarWidth,
  setSidebarWidth,
  sidebarGridRef,
}: UseSidebarResizeProps) {
  const startSidebarResize = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = sidebarWidth;
      const pointerId = event.pointerId;

      event.currentTarget.setPointerCapture(pointerId);

      function resizeSidebar(nextEvent: globalThis.PointerEvent) {
        setSidebarWidth(
          clampSidebarWidth(startWidth + nextEvent.clientX - startX, sidebarGridRef.current)
        );
      }

      function stopSidebarResize() {
        window.removeEventListener("pointermove", resizeSidebar);
        window.removeEventListener("pointerup", stopSidebarResize);
        window.removeEventListener("pointercancel", stopSidebarResize);
      }

      window.addEventListener("pointermove", resizeSidebar);
      window.addEventListener("pointerup", stopSidebarResize);
      window.addEventListener("pointercancel", stopSidebarResize);
    },
    [sidebarWidth, setSidebarWidth, sidebarGridRef]
  );

  return { startSidebarResize };
}
