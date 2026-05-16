import { useState } from "react";
import type { CallSignal, CallStatus } from "@/shared/types";

export function useCallState() {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null);
  const [isCallMicMuted, setIsCallMicMuted] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallPanelCollapsed, setIsCallPanelCollapsed] = useState(false);
  const [callPanelPosition, setCallPanelPosition] = useState({ left: 0, top: 0 });

  return {
    callStatus,
    setCallStatus,
    incomingCall,
    setIncomingCall,
    isCallMicMuted,
    setIsCallMicMuted,
    callStartedAt,
    setCallStartedAt,
    callDuration,
    setCallDuration,
    isCallPanelCollapsed,
    setIsCallPanelCollapsed,
    callPanelPosition,
    setCallPanelPosition,
  };
}
