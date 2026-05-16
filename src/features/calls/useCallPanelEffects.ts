import { useEffect } from "react";
import type { CallStatus } from "@/shared/types";
import {
  clampPanelPosition,
  getCenteredCallPanelPosition,
} from "@/shared/utils/viewport";

type CallPanelPosition = {
  left: number;
  top: number;
};

type UseCallPanelEffectsParams = {
  callStartedAt: number | null;
  callStatus: CallStatus;
  isCallPanelCollapsed: boolean;
  setCallDuration: (duration: number) => void;
  setCallPanelPosition: (
    value:
      | CallPanelPosition
      | ((position: CallPanelPosition) => CallPanelPosition),
  ) => void;
  setIsCallPanelCollapsed: (isCollapsed: boolean) => void;
};

export function useCallPanelEffects({
  callStartedAt,
  callStatus,
  isCallPanelCollapsed,
  setCallDuration,
  setCallPanelPosition,
  setIsCallPanelCollapsed,
}: UseCallPanelEffectsParams) {
  useEffect(() => {
    let frameId = 0;

    if (callStatus === "idle") {
      frameId = window.requestAnimationFrame(() => {
        setIsCallPanelCollapsed(false);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    frameId = window.requestAnimationFrame(() => {
      setCallPanelPosition((position) => {
        if (position.left || position.top) {
          return clampPanelPosition(position, isCallPanelCollapsed);
        }

        return clampPanelPosition(
          getCenteredCallPanelPosition(isCallPanelCollapsed),
          isCallPanelCollapsed,
        );
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [
    callStatus,
    isCallPanelCollapsed,
    setCallPanelPosition,
    setIsCallPanelCollapsed,
  ]);

  useEffect(() => {
    if (callStatus === "idle") {
      return;
    }

    function keepCallPanelInsideScreen() {
      setCallPanelPosition((position) =>
        clampPanelPosition(position, isCallPanelCollapsed),
      );
    }

    window.addEventListener("resize", keepCallPanelInsideScreen);

    return () => {
      window.removeEventListener("resize", keepCallPanelInsideScreen);
    };
  }, [callStatus, isCallPanelCollapsed, setCallPanelPosition]);

  useEffect(() => {
    if (callStatus === "idle") {
      return;
    }

    const interval = window.setInterval(() => {
      if (!callStartedAt) {
        setCallDuration(0);
        return;
      }

      setCallDuration(Math.floor((Date.now() - callStartedAt) / 1000));
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [callStartedAt, callStatus, setCallDuration]);
}
