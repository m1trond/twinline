import { useCallback } from "react";
import type { MutableRefObject } from "react";
import type { CallSignalType, CallStatus } from "@/shared/types";

type CallSignalPayload =
  | Record<string, unknown>
  | RTCSessionDescriptionInit
  | RTCIceCandidateInit
  | null;

type UseCallPeerConnectionParams = {
  callPartnerIdRef: MutableRefObject<string | null>;
  callStartedAtRef: MutableRefObject<number | null>;
  callStatusRef: MutableRefObject<CallStatus>;
  closeCall: (notifyPartner: boolean) => Promise<void>;
  hasSavedCallSummaryRef: MutableRefObject<boolean>;
  peerConnectionRef: MutableRefObject<RTCPeerConnection | null>;
  remoteAudioRef: MutableRefObject<HTMLAudioElement | null>;
  remoteCallStreamRef: MutableRefObject<MediaStream | null>;
  sendCallSignal: (
    receiverId: string,
    type: CallSignalType,
    payload: CallSignalPayload,
  ) => Promise<void>;
  setCallDuration: (duration: number) => void;
  setCallStartedAt: (startedAt: number | null) => void;
  setCallStatus: (status: CallStatus) => void;
  setErrorMessage: (message: string) => void;
};

export function useCallPeerConnection({
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
}: UseCallPeerConnectionParams) {
  const playRemoteAudio = useCallback(async () => {
    const audioElement = remoteAudioRef.current;

    if (!audioElement) {
      return;
    }

    audioElement.muted = false;
    audioElement.volume = 1;

    try {
      await audioElement.play();
      setErrorMessage("");
    } catch {
      setErrorMessage("Нажми «Включить звук», чтобы браузер разрешил аудио звонка.");
    }
  }, [remoteAudioRef, setErrorMessage]);

  const markCallConnected = useCallback(() => {
    if (callStatusRef.current !== "connected") {
      const startedAt = Date.now();

      setCallDuration(0);
      setCallStartedAt(startedAt);
      callStartedAtRef.current = startedAt;
      hasSavedCallSummaryRef.current = false;
    }

    callStatusRef.current = "connected";
    setCallStatus("connected");
  }, [
    callStartedAtRef,
    callStatusRef,
    hasSavedCallSummaryRef,
    setCallDuration,
    setCallStartedAt,
    setCallStatus,
  ]);

  const createPeerConnection = useCallback(
    (receiverId: string) => {
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          void sendCallSignal(receiverId, "ice", event.candidate.toJSON());
        }
      };

      peerConnection.ontrack = (event) => {
        const remoteStream =
          event.streams[0] ?? remoteCallStreamRef.current ?? new MediaStream();

        if (event.streams.length === 0) {
          remoteStream.addTrack(event.track);
        }

        remoteCallStreamRef.current = remoteStream;

        if (remoteAudioRef.current && remoteStream) {
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1;
          remoteAudioRef.current.srcObject = remoteStream;
          void playRemoteAudio();
        }

        event.track.onunmute = () => {
          void playRemoteAudio();
        };
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") {
          markCallConnected();
        }

        if (
          peerConnection.connectionState === "disconnected" ||
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "closed"
        ) {
          void closeCall(false);
        }
      };

      peerConnectionRef.current = peerConnection;
      callPartnerIdRef.current = receiverId;

      return peerConnection;
    },
    [
      callPartnerIdRef,
      closeCall,
      markCallConnected,
      peerConnectionRef,
      playRemoteAudio,
      remoteAudioRef,
      remoteCallStreamRef,
      sendCallSignal,
    ],
  );

  return {
    createPeerConnection,
    markCallConnected,
    playRemoteAudio,
  };
}
