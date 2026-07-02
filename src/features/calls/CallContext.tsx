import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import type { Dispatch, SetStateAction, ReactNode, PointerEvent, RefObject } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useApp } from "@/shared/context/AppContext";
import { useProfiles } from "@/features/profile/ProfilesContext";
import { useChat } from "@/features/messages/contexts/ChatContext";
import { useCallState } from "@/features/calls/useCallState";
import { useCallSignals } from "@/features/calls/useCallSignals";
import { useCallActions } from "@/features/calls/useCallActions";
import { useCallPanelEffects } from "@/features/calls/useCallPanelEffects";
import { useCallPanelDrag } from "@/features/calls/useCallPanelDrag";
import type { CallSignal, CallStatus } from "@/shared/types";
import { translations } from "@/shared/i18n";

type CallPanelProfile = {
  avatarUrl: string | null;
  name: string;
};

type CallContextType = {
  callStatus: CallStatus;
  setCallStatus: Dispatch<SetStateAction<CallStatus>>;
  incomingCall: CallSignal | null;
  setIncomingCall: Dispatch<SetStateAction<CallSignal | null>>;
  isCallMicMuted: boolean;
  setIsCallMicMuted: Dispatch<SetStateAction<boolean>>;
  callStartedAt: number | null;
  setCallStartedAt: Dispatch<SetStateAction<number | null>>;
  callDuration: number;
  setCallDuration: Dispatch<SetStateAction<number>>;
  isCallPanelCollapsed: boolean;
  setIsCallPanelCollapsed: Dispatch<SetStateAction<boolean>>;
  callPanelPosition: { left: number; top: number };
  setCallPanelPosition: Dispatch<SetStateAction<{ left: number; top: number }>>;
  callPanelProfileSnapshot: { avatarUrl: string | null; name: string; userId: string | null } | null;
  setCallPanelProfileSnapshot: Dispatch<SetStateAction<{ avatarUrl: string | null; name: string; userId: string | null } | null>>;

  // Derived states
  callStatusText: string;
  callPanelProfile: CallPanelProfile;

  // Actions
  startCall: (targetUserId?: string | null) => Promise<void>;
  acceptCall: () => Promise<void>;
  closeCall: (notifyPartner: boolean) => Promise<void>;
  toggleCallMicrophone: () => void;
  dragCallPanel: (event: PointerEvent<HTMLElement>) => void;
  startCallPanelDrag: (event: PointerEvent<HTMLElement>) => void;
  stopCallPanelDrag: (event: PointerEvent<HTMLElement>) => void;
  remoteAudioRef: RefObject<HTMLAudioElement | null>;
};

const CallContext = createContext<CallContextType | null>(null);

export function CallContextProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { setErrorMessage, interfaceLanguage } = useApp();
  const { profilesByUserId } = useProfiles();
  const {
    blockedByMeProfileIds,
    blockedMeProfileIds,
    blockedProfileIds,
    friendProfile,
    saveCallSummaryMessage,
  } = useChat();

  const {
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
  } = useCallState();

  const [callPanelProfileSnapshot, setCallPanelProfileSnapshot] = useState<{
    avatarUrl: string | null;
    name: string;
    userId: string | null;
  } | null>(null);

  // WebRTC & Call Refs
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteCallStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callStatusRef = useRef<CallStatus>(callStatus);
  const callPartnerIdRef = useRef<string | null>(null);
  const localCallStreamRef = useRef<MediaStream | null>(null);
  const callStartedAtRef = useRef<number | null>(callStartedAt);
  const hasSavedCallSummaryRef = useRef(false);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const processedCallSignalIdsRef = useRef<Set<string>>(new Set());
  const latestCallSignalCreatedAtRef = useRef<string>("1970-01-01T00:00:00.000Z");

  const blockedProfileIdsRef = useRef<Set<string>>(new Set(blockedProfileIds));

  // Sync state/refs
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    callStartedAtRef.current = callStartedAt;
  }, [callStartedAt]);

  useEffect(() => {
    blockedProfileIdsRef.current = new Set(blockedProfileIds);
  }, [blockedProfileIds]);

  const getCallPanelProfileSnapshot = useCallback(
    (userId: string | null) => {
      if (!userId) {
        return { avatarUrl: null, name: "Пользователь", userId: null };
      }
      const profile = profilesByUserId.get(userId);
      return {
        avatarUrl: profile?.avatar_url ?? null,
        name: profile?.display_name ?? "Пользователь",
        userId,
      };
    },
    [profilesByUserId],
  );

  // Derive callStatusText and callPanelProfile
  const incomingCallerProfile = incomingCall
    ? profilesByUserId.get(incomingCall.sender_id)
    : null;

  const tr = translations[interfaceLanguage];

  const callStatusText =
    callStatus === "calling"
      ? tr.calling
      : callStatus === "incoming"
        ? `${tr.incomingCallFrom} ${incomingCallerProfile?.display_name ?? tr.user}`
        : callStatus === "connecting"
          ? tr.connecting
          : callStatus === "connected"
            ? tr.callActive
            : "";

  const callPanelProfile =
    callPanelProfileSnapshot ??
    (callStatus === "incoming"
      ? {
          avatarUrl: incomingCallerProfile?.avatar_url ?? null,
          name: incomingCallerProfile?.display_name ?? tr.user,
        }
      : {
          avatarUrl: friendProfile?.avatar_url ?? null,
          name: friendProfile?.display_name ?? tr.user,
        });

  // Call Actions Hook
  const {
    acceptCall,
    closeCall,
    markCallConnected,
    sendCallSignal,
    startCall,
    toggleCallMicrophone,
  } = useCallActions({
    blockedByMeProfileIds,
    blockedMeProfileIds,
    callPartnerIdRef,
    callStartedAtRef,
    callStatusRef,
    friendUserId: friendProfile?.user_id ?? null,
    getCallPanelProfileSnapshot,
    hasSavedCallSummaryRef,
    incomingCall,
    isCallMicMuted,
    localCallStreamRef,
    pendingIceCandidatesRef,
    peerConnectionRef,
    remoteAudioRef,
    remoteCallStreamRef,
    saveCallSummaryMessage: () =>
      saveCallSummaryMessage(callPartnerIdRef.current || "", callStartedAtRef.current || Date.now()),
    setCallDuration,
    setCallPanelPosition,
    setCallPanelProfileSnapshot,
    setCallStartedAt,
    setCallStatus,
    setErrorMessage,
    setIncomingCall,
    setIsCallMicMuted,
    setIsCallPanelCollapsed,
    userId: user?.id,
  });

  // Call Signals Hook
  useCallSignals({
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
    userId: user?.id,
  });

  // Call Panel Effects Hook
  useCallPanelEffects({
    callStartedAt,
    callStatus,
    isCallPanelCollapsed,
    setCallDuration,
    setCallPanelPosition,
    setIsCallPanelCollapsed,
  });

  // Call Panel Drag Hook
  const {
    dragCallPanel,
    startCallPanelDrag,
    stopCallPanelDrag,
  } = useCallPanelDrag({
    callPanelPosition,
    isCallPanelCollapsed,
    setCallPanelPosition,
  });

  return (
    <CallContext.Provider
      value={{
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
        callPanelProfileSnapshot,
        setCallPanelProfileSnapshot,

        callStatusText,
        callPanelProfile,

        startCall,
        acceptCall,
        closeCall,
        toggleCallMicrophone,
        dragCallPanel,
        startCallPanelDrag,
        stopCallPanelDrag,
        remoteAudioRef,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within a CallContextProvider");
  }
  return context;
}
