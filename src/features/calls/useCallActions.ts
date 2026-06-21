import { useCallback } from "react";
import type { MutableRefObject } from "react";
import { supabase } from "@/lib/supabase";
import { useCallCleanup } from "@/features/calls/useCallCleanup";
import { useCallPeerConnection } from "@/features/calls/useCallPeerConnection";
import type { CallSignal, CallSignalType, CallStatus } from "@/shared/types";
import { applyCallAudioQuality, speechAudioConstraints } from "@/shared/utils/audio";
import { isSessionDescriptionPayload } from "@/shared/utils/callSignals";
import { getCenteredCallPanelPosition } from "@/shared/utils/viewport";

type CallPanelPosition = {
  left: number;
  top: number;
};

type CallPanelProfileSnapshot = {
  avatarUrl: string | null;
  name: string;
  userId: string | null;
};

type CallSignalPayload =
  | Record<string, unknown>
  | RTCSessionDescriptionInit
  | RTCIceCandidateInit
  | null;

type UseCallActionsParams = {
  blockedByMeProfileIds: string[];
  blockedMeProfileIds: string[];
  callPartnerIdRef: MutableRefObject<string | null>;
  callStartedAtRef: MutableRefObject<number | null>;
  callStatusRef: MutableRefObject<CallStatus>;
  friendUserId: string | null;
  getCallPanelProfileSnapshot: (userId: string | null) => CallPanelProfileSnapshot;
  hasSavedCallSummaryRef: MutableRefObject<boolean>;
  incomingCall: CallSignal | null;
  isCallMicMuted: boolean;
  localCallStreamRef: MutableRefObject<MediaStream | null>;
  pendingIceCandidatesRef: MutableRefObject<RTCIceCandidateInit[]>;
  peerConnectionRef: MutableRefObject<RTCPeerConnection | null>;
  remoteAudioRef: MutableRefObject<HTMLAudioElement | null>;
  remoteCallStreamRef: MutableRefObject<MediaStream | null>;
  saveCallSummaryMessage: () => Promise<void>;
  setCallDuration: (duration: number) => void;
  setCallPanelPosition: (position: CallPanelPosition) => void;
  setCallPanelProfileSnapshot: (snapshot: CallPanelProfileSnapshot | null) => void;
  setCallStartedAt: (startedAt: number | null) => void;
  setCallStatus: (status: CallStatus) => void;
  setErrorMessage: (message: string) => void;
  setIncomingCall: (incomingCall: CallSignal | null) => void;
  setIsCallMicMuted: (isMuted: boolean) => void;
  setIsCallPanelCollapsed: (isCollapsed: boolean) => void;
  userId: string | undefined;
};

export function useCallActions({
  blockedByMeProfileIds,
  blockedMeProfileIds,
  callPartnerIdRef,
  callStartedAtRef,
  callStatusRef,
  friendUserId,
  getCallPanelProfileSnapshot,
  hasSavedCallSummaryRef,
  incomingCall,
  isCallMicMuted,
  localCallStreamRef,
  pendingIceCandidatesRef,
  peerConnectionRef,
  remoteAudioRef,
  remoteCallStreamRef,
  saveCallSummaryMessage,
  setCallDuration,
  setCallPanelPosition,
  setCallPanelProfileSnapshot,
  setCallStartedAt,
  setCallStatus,
  setErrorMessage,
  setIncomingCall,
  setIsCallMicMuted,
  setIsCallPanelCollapsed,
  userId,
}: UseCallActionsParams) {
  const sendCallSignal = useCallback(
    async (
      receiverId: string,
      type: CallSignalType,
      payload: CallSignalPayload,
    ) => {
      if (!userId) {
        return;
      }

      await supabase.from("call_signals").insert({
        payload,
        receiver_id: receiverId,
        sender_id: userId,
        type,
      });
    },
    [userId],
  );

  const { closeCall } = useCallCleanup({
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
  });

  const { createPeerConnection, markCallConnected } = useCallPeerConnection({
    callPartnerIdRef,
    callStartedAtRef,
    callStatusRef,
    closeCall,
    hasSavedCallSummaryRef,
    peerConnectionRef,
    remoteAudioRef,
    remoteCallStreamRef,
    sendCallSignal,
    setCallDuration,
    setCallStartedAt,
    setCallStatus,
    setErrorMessage,
  });

  const setLocalMicrophoneMuted = useCallback(
    (isMuted: boolean) => {
      localCallStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
      setIsCallMicMuted(isMuted);
    },
    [localCallStreamRef, setIsCallMicMuted],
  );

  const toggleCallMicrophone = useCallback(() => {
    setLocalMicrophoneMuted(!isCallMicMuted);
  }, [isCallMicMuted, setLocalMicrophoneMuted]);

  const getLocalCallStream = useCallback(async () => {
    if (localCallStreamRef.current) {
      return localCallStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: speechAudioConstraints,
      video: false,
    });

    localCallStreamRef.current = stream;

    return stream;
  }, [localCallStreamRef]);

  const prepareCallPanel = useCallback(
    (targetUserId: string, status: Extract<CallStatus, "calling" | "connecting">) => {
      setErrorMessage("");
      setCallPanelProfileSnapshot(getCallPanelProfileSnapshot(targetUserId));
      callStatusRef.current = status;
      setIsCallPanelCollapsed(false);
      setCallPanelPosition(getCenteredCallPanelPosition(false));
      setCallStatus(status);
      setCallDuration(0);
      setCallStartedAt(null);
      callStartedAtRef.current = null;
      hasSavedCallSummaryRef.current = false;
      setIsCallMicMuted(false);
    },
    [
      callStartedAtRef,
      callStatusRef,
      getCallPanelProfileSnapshot,
      hasSavedCallSummaryRef,
      setCallDuration,
      setCallPanelPosition,
      setCallPanelProfileSnapshot,
      setCallStartedAt,
      setCallStatus,
      setErrorMessage,
      setIsCallMicMuted,
      setIsCallPanelCollapsed,
    ],
  );

  const attachLocalStream = useCallback(
    async (peerConnection: RTCPeerConnection) => {
      const stream = await getLocalCallStream();

      stream.getTracks().forEach((track) => {
        const sender = peerConnection.addTrack(track, stream);

        void applyCallAudioQuality(sender);
      });
    },
    [getLocalCallStream],
  );

  const startCall = useCallback(
    async (targetUserId = friendUserId) => {
      if (!userId) {
        return;
      }

      if (!targetUserId || targetUserId === userId) {
        setErrorMessage("Чтобы позвонить, сначала нужен хотя бы один вход друга в чат.");
        return;
      }

      if (blockedByMeProfileIds.includes(targetUserId)) {
        setErrorMessage("Сначала разблокируй пользователя, чтобы позвонить ему.");
        return;
      }

      if (blockedMeProfileIds.includes(targetUserId)) {
        setErrorMessage("Ты не можешь позвонить: пользователь тебя заблокировал.");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
        setErrorMessage("Этот браузер не поддерживает звонки.");
        return;
      }

      try {
        prepareCallPanel(targetUserId, "calling");

        const peerConnection = createPeerConnection(targetUserId);
        await attachLocalStream(peerConnection);

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await sendCallSignal(targetUserId, "offer", offer);
      } catch {
        void closeCall(false);
        setErrorMessage("Не получилось начать звонок. Проверь доступ к микрофону.");
      }
    },
    [
      attachLocalStream,
      blockedByMeProfileIds,
      blockedMeProfileIds,
      closeCall,
      createPeerConnection,
      friendUserId,
      prepareCallPanel,
      sendCallSignal,
      setErrorMessage,
      userId,
    ],
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !isSessionDescriptionPayload(incomingCall.payload)) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setErrorMessage("Этот браузер не поддерживает звонки.");
      return;
    }

    try {
      prepareCallPanel(incomingCall.sender_id, "connecting");

      const peerConnection = createPeerConnection(incomingCall.sender_id);
      await attachLocalStream(peerConnection);

      await peerConnection.setRemoteDescription(incomingCall.payload);
      const pendingCandidates = pendingIceCandidatesRef.current;
      pendingIceCandidatesRef.current = [];

      for (const candidate of pendingCandidates) {
        try {
          await peerConnection.addIceCandidate(candidate);
        } catch {
          pendingIceCandidatesRef.current.push(candidate);
        }
      }

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      await sendCallSignal(incomingCall.sender_id, "answer", answer);
      setIncomingCall(null);
      markCallConnected();
    } catch {
      void closeCall(false);
      setErrorMessage("Не получилось принять звонок. Проверь доступ к микрофону.");
    }
  }, [
    attachLocalStream,
    closeCall,
    createPeerConnection,
    incomingCall,
    markCallConnected,
    pendingIceCandidatesRef,
    prepareCallPanel,
    sendCallSignal,
    setErrorMessage,
    setIncomingCall,
  ]);

  return {
    acceptCall,
    closeCall,
    markCallConnected,
    sendCallSignal,
    startCall,
    toggleCallMicrophone,
  };
}
