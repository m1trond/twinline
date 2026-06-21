import { useCallback } from "react";
import type { MutableRefObject } from "react";
import type { CallSignalType, CallStatus, CallSignal } from "@/shared/types";

type CallSignalPayload =
  | Record<string, unknown>
  | RTCSessionDescriptionInit
  | RTCIceCandidateInit
  | null;

type UseCallCleanupParams = {
  callPartnerIdRef: MutableRefObject<string | null>;
  callStartedAtRef: MutableRefObject<number | null>;
  callStatusRef: MutableRefObject<CallStatus>;
  localCallStreamRef: MutableRefObject<MediaStream | null>;
  pendingIceCandidatesRef: MutableRefObject<RTCIceCandidateInit[]>;
  peerConnectionRef: MutableRefObject<RTCPeerConnection | null>;
  remoteAudioRef: MutableRefObject<HTMLAudioElement | null>;
  remoteCallStreamRef: MutableRefObject<MediaStream | null>;
  saveCallSummaryMessage: () => Promise<void>;
  sendCallSignal: (
    receiverId: string,
    type: CallSignalType,
    payload: CallSignalPayload,
  ) => Promise<void>;
  setCallDuration: (duration: number) => void;
  setCallPanelProfileSnapshot: (
    snapshot: {
      avatarUrl: string | null;
      name: string;
      userId: string | null;
    } | null,
  ) => void;
  setCallStartedAt: (startedAt: number | null) => void;
  setCallStatus: (status: CallStatus) => void;
  setIncomingCall: (incomingCall: CallSignal | null) => void;
  setIsCallMicMuted: (isMuted: boolean) => void;
};

function stopMediaStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function useCallCleanup({
  callPartnerIdRef,
  callStartedAtRef,
  callStatusRef,
  localCallStreamRef,
  pendingIceCandidatesRef,
  peerConnectionRef,
  remoteAudioRef,
  remoteCallStreamRef,
  saveCallSummaryMessage,
  sendCallSignal,
  setCallDuration,
  setCallPanelProfileSnapshot,
  setCallStartedAt,
  setCallStatus,
  setIncomingCall,
  setIsCallMicMuted,
}: UseCallCleanupParams) {
  const closeCall = useCallback(
    async (notifyPartner: boolean) => {
      const partnerId = callPartnerIdRef.current;

      if (notifyPartner && callStatusRef.current === "connected") {
        await saveCallSummaryMessage();
      }

      if (notifyPartner && partnerId) {
        await sendCallSignal(partnerId, "end", { reason: "ended" });
      }

      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      callPartnerIdRef.current = null;
      pendingIceCandidatesRef.current = [];
      stopMediaStream(localCallStreamRef.current);
      localCallStreamRef.current = null;

      if (remoteAudioRef.current) {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
      }

      remoteCallStreamRef.current = null;
      setIncomingCall(null);
      setIsCallMicMuted(false);
      setCallStartedAt(null);
      callStartedAtRef.current = null;
      setCallDuration(0);
      callStatusRef.current = "idle";
      setCallStatus("idle");
      setCallPanelProfileSnapshot(null);
    },
    [
      callPartnerIdRef,
      callStartedAtRef,
      callStatusRef,
      localCallStreamRef,
      pendingIceCandidatesRef,
      peerConnectionRef,
      remoteAudioRef,
      remoteCallStreamRef,
      saveCallSummaryMessage,
      sendCallSignal,
      setCallDuration,
      setCallPanelProfileSnapshot,
      setCallStartedAt,
      setCallStatus,
      setIncomingCall,
      setIsCallMicMuted,
    ],
  );

  return { closeCall };
}
