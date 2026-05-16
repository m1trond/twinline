import { useEffect } from "react";
import type { MutableRefObject } from "react";
import { supabase } from "@/lib/supabase";
import { fetchCallSignalsAfter } from "@/features/messages/queries";
import type { CallSignal, CallSignalType, CallStatus } from "@/shared/types";
import {
  isIceCandidatePayload,
  isSessionDescriptionPayload,
} from "@/shared/utils/callSignals";
import { getCenteredCallPanelPosition } from "@/shared/utils/viewport";

type CallPanelPosition = {
  left: number;
  top: number;
};

type UseCallSignalsParams = {
  blockedProfileIdsRef: MutableRefObject<Set<string>>;
  callPartnerIdRef: MutableRefObject<string | null>;
  callStatusRef: MutableRefObject<CallStatus>;
  closeCall: (shouldNotifyPeer: boolean) => void | Promise<void>;
  latestCallSignalCreatedAtRef: MutableRefObject<string>;
  markCallConnected: () => void;
  peerConnectionRef: MutableRefObject<RTCPeerConnection | null>;
  pendingIceCandidatesRef: MutableRefObject<RTCIceCandidateInit[]>;
  processedCallSignalIdsRef: MutableRefObject<Set<string>>;
  sendCallSignal: (
    receiverId: string,
    type: CallSignalType,
    payload:
      | Record<string, unknown>
      | RTCSessionDescriptionInit
      | RTCIceCandidateInit
      | null,
  ) => Promise<void>;
  setCallPanelPosition: (position: CallPanelPosition) => void;
  setCallStatus: (status: CallStatus) => void;
  setIncomingCall: (signal: CallSignal | null) => void;
  setIsCallPanelCollapsed: (isCollapsed: boolean) => void;
  userId: string | null | undefined;
};

export function useCallSignals({
  blockedProfileIdsRef,
  callPartnerIdRef,
  callStatusRef,
  closeCall,
  latestCallSignalCreatedAtRef,
  markCallConnected,
  peerConnectionRef,
  pendingIceCandidatesRef,
  processedCallSignalIdsRef,
  sendCallSignal,
  setCallPanelPosition,
  setCallStatus,
  setIncomingCall,
  setIsCallPanelCollapsed,
  userId,
}: UseCallSignalsParams) {
  useEffect(() => {
    if (!userId) {
      return;
    }

    const signedInUserId = userId;
    let isMounted = true;

    latestCallSignalCreatedAtRef.current = new Date().toISOString();

    async function addIceCandidate(candidate: RTCIceCandidateInit) {
      const peerConnection = peerConnectionRef.current;

      if (!peerConnection) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await peerConnection.addIceCandidate(candidate);
      } catch {
        pendingIceCandidatesRef.current.push(candidate);
      }
    }

    async function flushPendingIceCandidates() {
      const pendingCandidates = pendingIceCandidatesRef.current;

      pendingIceCandidatesRef.current = [];

      for (const candidate of pendingCandidates) {
        await addIceCandidate(candidate);
      }
    }

    async function handleCallSignal(signal: CallSignal) {
      if (processedCallSignalIdsRef.current.has(signal.id)) {
        return;
      }

      processedCallSignalIdsRef.current.add(signal.id);
      latestCallSignalCreatedAtRef.current = signal.created_at;

      if (signal.sender_id === signedInUserId) {
        return;
      }

      if (blockedProfileIdsRef.current.has(signal.sender_id)) {
        if (signal.type === "offer") {
          await sendCallSignal(signal.sender_id, "end", { reason: "blocked" });
        }

        return;
      }

      if (signal.type === "offer") {
        if (!isSessionDescriptionPayload(signal.payload)) {
          return;
        }

        if (callStatusRef.current !== "idle") {
          await sendCallSignal(signal.sender_id, "end", { reason: "busy" });
          return;
        }

        callPartnerIdRef.current = signal.sender_id;
        setIsCallPanelCollapsed(false);
        setCallPanelPosition(getCenteredCallPanelPosition(false));
        setIncomingCall(signal);
        setCallStatus("incoming");
        return;
      }

      if (signal.type === "answer") {
        const peerConnection = peerConnectionRef.current;

        if (!peerConnection || !isSessionDescriptionPayload(signal.payload)) {
          return;
        }

        await peerConnection.setRemoteDescription(signal.payload);
        await flushPendingIceCandidates();
        markCallConnected();
        return;
      }

      if (signal.type === "ice") {
        const peerConnection = peerConnectionRef.current;

        if (!isIceCandidatePayload(signal.payload)) {
          return;
        }

        if (!peerConnection || !peerConnection.remoteDescription) {
          pendingIceCandidatesRef.current.push(signal.payload);
          return;
        }

        await addIceCandidate(signal.payload);
        return;
      }

      if (signal.type === "end") {
        closeCall(false);
      }
    }

    async function syncMissedCallSignals() {
      const { data } = await fetchCallSignalsAfter(
        signedInUserId,
        latestCallSignalCreatedAtRef.current,
      );

      if (!isMounted || !data) {
        return;
      }

      for (const signal of data as CallSignal[]) {
        await handleCallSignal(signal);
      }
    }

    syncMissedCallSignals();

    const callSignalsInterval = window.setInterval(() => {
      syncMissedCallSignals();
    }, 1800);

    const channel = supabase
      .channel(`call-signals-${signedInUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          filter: `receiver_id=eq.${signedInUserId}`,
          schema: "public",
          table: "call_signals",
        },
        (payload) => {
          handleCallSignal(payload.new as CallSignal);
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.clearInterval(callSignalsInterval);
      supabase.removeChannel(channel);
    };
  }, [
    blockedProfileIdsRef,
    callPartnerIdRef,
    callStatusRef,
    closeCall,
    latestCallSignalCreatedAtRef,
    markCallConnected,
    peerConnectionRef,
    pendingIceCandidatesRef,
    processedCallSignalIdsRef,
    sendCallSignal,
    setCallPanelPosition,
    setCallStatus,
    setIncomingCall,
    setIsCallPanelCollapsed,
    userId,
  ]);
}
