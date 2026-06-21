import type { PointerEvent } from "react";
import { useCallback, useRef } from "react";
import { clampPanelPosition } from "@/shared/utils/viewport";

type CallPanelPosition = {
  left: number;
  top: number;
};

type UseCallPanelDragParams = {
  callPanelPosition: CallPanelPosition;
  isCallPanelCollapsed: boolean;
  setCallPanelPosition: (position: CallPanelPosition) => void;
};

export function useCallPanelDrag({
  callPanelPosition,
  isCallPanelCollapsed,
  setCallPanelPosition,
}: UseCallPanelDragParams) {
  const callPanelDragRef = useRef({
    left: 0,
    pointerId: 0,
    startX: 0,
    startY: 0,
    top: 0,
  });

  const startCallPanelDrag = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }

      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      callPanelDragRef.current = {
        left: callPanelPosition.left,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        top: callPanelPosition.top,
      };
    },
    [callPanelPosition.left, callPanelPosition.top],
  );

  const dragCallPanel = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (callPanelDragRef.current.pointerId !== event.pointerId) {
        return;
      }

      const nextPosition = {
        left: callPanelDragRef.current.left + event.clientX - callPanelDragRef.current.startX,
        top: callPanelDragRef.current.top + event.clientY - callPanelDragRef.current.startY,
      };

      setCallPanelPosition(clampPanelPosition(nextPosition, isCallPanelCollapsed));
    },
    [isCallPanelCollapsed, setCallPanelPosition],
  );

  const stopCallPanelDrag = useCallback((event: PointerEvent<HTMLElement>) => {
    if (callPanelDragRef.current.pointerId !== event.pointerId) {
      return;
    }

    callPanelDragRef.current.pointerId = 0;
  }, []);

  return {
    dragCallPanel,
    startCallPanelDrag,
    stopCallPanelDrag,
  };
}
