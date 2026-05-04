"use client";

import {
  ChangeEvent,
  FormEvent,
  MouseEvent,
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type MessageRow = {
  id: number;
  author: string;
  text: string;
  created_at: string;
  user_id: string | null;
};

type GalleryItem = {
  id: number;
  user_id: string;
  author: string;
  file_url: string;
  file_type: "image" | "video";
  caption: string | null;
  created_at: string;
};

type IdeaRow = {
  id: number;
  user_id: string;
  author: string;
  text: string;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  name_changed_at: string | null;
  updated_at: string;
};

type CallSignalType = "offer" | "answer" | "ice" | "end";

type CallSignal = {
  id: string;
  sender_id: string;
  receiver_id: string;
  type: CallSignalType;
  payload: unknown;
  created_at: string;
};

type ReplyMessagePayload = {
  author: string;
  body: string;
  text: string;
};

type ActiveView = "profile" | "messages" | "gallery" | "ideas" | "settings";
type AuthMode = "sign-in" | "sign-up";
type CallStatus = "idle" | "calling" | "incoming" | "connecting" | "connected";

const navItems: Array<{ label: string; view: ActiveView }> = [
  { label: "Профиль", view: "profile" },
  { label: "Сообщения", view: "messages" },
  { label: "Галерея", view: "gallery" },
  { label: "Идеи", view: "ideas" },
];
const settingsNavItem: { label: string; view: ActiveView } = {
  label: "Настройки",
  view: "settings",
};

const imageMessagePrefix = "image::";
const videoMessagePrefix = "video::";
const audioMessagePrefix = "audio::";
const callMessagePrefix = "call::";
const stickerMessagePrefix = "sticker::";
const replyMessagePrefix = "reply::";
const maxAttachmentSize = 50 * 1024 * 1024;
const stickerOptions = ["😂", "❤️", "🔥", "🤝", "😎", "😭", "🥱", "😡", "🫡", "💀", "🥳", "🤯", "👍", "👎", "🍻", "✨"];

function formatMessageTime(createdAt: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function formatCallDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

function getDisplayName(user: User | null) {
  const metadataName = user?.user_metadata?.display_name;

  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  return user?.email?.split("@")[0] ?? "Гость";
}

function canChangeName(nameChangedAt: string | null) {
  if (!nameChangedAt) {
    return true;
  }

  const nextChangeTime = new Date(nameChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000;

  return Date.now() >= nextChangeTime;
}

function getNextNameChangeDate(nameChangedAt: string | null) {
  if (!nameChangedAt) {
    return null;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(new Date(nameChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000));
}

function getMessageImageUrl(text: string) {
  return text.startsWith(imageMessagePrefix)
    ? text.slice(imageMessagePrefix.length)
    : null;
}

function getMessageVideoUrl(text: string) {
  return text.startsWith(videoMessagePrefix)
    ? text.slice(videoMessagePrefix.length)
    : null;
}

function getMessageAudioUrl(text: string) {
  return text.startsWith(audioMessagePrefix)
    ? text.slice(audioMessagePrefix.length)
    : null;
}

function getMessageCallDuration(text: string) {
  if (!text.startsWith(callMessagePrefix)) {
    return null;
  }

  const duration = Number(text.slice(callMessagePrefix.length));

  return Number.isFinite(duration) ? duration : 0;
}

function getMessageSticker(text: string) {
  return text.startsWith(stickerMessagePrefix)
    ? text.slice(stickerMessagePrefix.length)
    : null;
}

function getMessageReply(text: string): ReplyMessagePayload | null {
  if (!text.startsWith(replyMessagePrefix)) {
    return null;
  }

  try {
    return JSON.parse(
      decodeURIComponent(text.slice(replyMessagePrefix.length)),
    ) as ReplyMessagePayload;
  } catch {
    return null;
  }
}

function getReadableMessageText(text: string) {
  const reply = getMessageReply(text);

  if (reply) {
    return reply.body;
  }

  if (text.startsWith(imageMessagePrefix)) {
    return "Изображение";
  }

  if (text.startsWith(videoMessagePrefix)) {
    return "Видео";
  }

  if (text.startsWith(audioMessagePrefix)) {
    return "Голосовое сообщение";
  }

  if (text.startsWith(callMessagePrefix)) {
    return "Звонок";
  }

  if (text.startsWith(stickerMessagePrefix)) {
    return getMessageSticker(text) ?? "Стикер";
  }

  return text;
}

function createReplyMessageText(replyTarget: MessageRow, body: string) {
  return `${replyMessagePrefix}${encodeURIComponent(
    JSON.stringify({
      author: replyTarget.author,
      body,
      text: getReadableMessageText(replyTarget.text).slice(0, 140),
    } satisfies ReplyMessagePayload),
  )}`;
}

function clampPanelPosition(
  position: { left: number; top: number },
  isCollapsed: boolean,
) {
  if (typeof window === "undefined") {
    return position;
  }

  const panelWidth = isCollapsed ? 260 : 350;
  const panelHeight = isCollapsed ? 92 : 310;

  return {
    left: Math.max(12, Math.min(position.left, window.innerWidth - panelWidth - 12)),
    top: Math.max(12, Math.min(position.top, window.innerHeight - panelHeight - 12)),
  };
}

function mergeMessages(currentMessages: MessageRow[], nextMessages: MessageRow[]) {
  const messagesById = new Map<number, MessageRow>();

  for (const message of currentMessages) {
    messagesById.set(message.id, message);
  }

  for (const message of nextMessages) {
    messagesById.set(message.id, message);
  }

  return Array.from(messagesById.values()).sort((firstMessage, secondMessage) => {
    return (
      new Date(firstMessage.created_at).getTime() -
      new Date(secondMessage.created_at).getTime()
    );
  });
}

async function fetchMessages() {
  return supabase
    .from("messages")
    .select("id, author, text, created_at, user_id")
    .order("created_at", { ascending: true });
}

async function fetchMessagesAfter(createdAt: string) {
  return supabase
    .from("messages")
    .select("id, author, text, created_at, user_id")
    .gt("created_at", createdAt)
    .order("created_at", { ascending: true });
}

async function fetchGalleryItems() {
  return supabase
    .from("gallery_items")
    .select("id, user_id, author, file_url, file_type, caption, created_at")
    .order("created_at", { ascending: false });
}

async function fetchIdeas() {
  return supabase
    .from("ideas")
    .select("id, user_id, author, text, created_at")
    .order("created_at", { ascending: false });
}

async function fetchProfiles() {
  return supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url, name_changed_at, updated_at");
}

async function fetchCallSignalsAfter(receiverId: string, createdAt: string) {
  return supabase
    .from("call_signals")
    .select("id, sender_id, receiver_id, type, payload, created_at")
    .eq("receiver_id", receiverId)
    .gt("created_at", createdAt)
    .order("created_at", { ascending: true });
}

function isSessionDescriptionPayload(
  payload: unknown,
): payload is RTCSessionDescriptionInit {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const maybePayload = payload as Record<string, unknown>;

  return (
    typeof maybePayload.type === "string" &&
    typeof maybePayload.sdp === "string"
  );
}

function isIceCandidatePayload(
  payload: unknown,
): payload is RTCIceCandidateInit {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return typeof (payload as Record<string, unknown>).candidate === "string";
}

function VoiceMessage({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  function togglePlayback() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  function seekAudio(event: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    const nextTime = Number(event.target.value);

    if (!audio) {
      return;
    }

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <div className="min-w-[240px] rounded-2xl bg-black/12 p-3">
      <audio
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        preload="metadata"
        ref={audioRef}
        src={src}
      />
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-bold opacity-75">Голосовое</p>
        <p className="text-xs font-semibold opacity-60">
          {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#041012] text-[#e3f4f4] transition hover:scale-105"
          onClick={togglePlayback}
          type="button"
        >
          {isPlaying ? (
            <span className="h-4 w-3 border-x-4 border-[#e3f4f4]" />
          ) : (
            <span className="ml-0.5 h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-[#e3f4f4]" />
          )}
        </button>
        <input
          aria-label="Позиция голосового сообщения"
          className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-[#041012]/25 accent-[#041012]"
          max={duration || 0}
          min="0"
          onChange={seekAudio}
          step="0.1"
          type="range"
          value={currentTime}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [profileName, setProfileName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [galleryCaption, setGalleryCaption] = useState("");
  const [ideaText, setIdeaText] = useState("");
  const [activeView, setActiveView] = useState<ActiveView>("profile");
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [viewedProfile, setViewedProfile] = useState<{
    avatarUrl: string | null;
    name: string;
    userId: string | null;
  } | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isUploadingGalleryItem, setIsUploadingGalleryItem] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null);
  const [isCallMicMuted, setIsCallMicMuted] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallPanelCollapsed, setIsCallPanelCollapsed] = useState(false);
  const [callPanelPosition, setCallPanelPosition] = useState({ left: 0, top: 0 });
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [stickerPickerPosition, setStickerPickerPosition] = useState({ left: 0, top: 0 });
  const [messageContextMenu, setMessageContextMenu] = useState<{
    left: number;
    message: MessageRow;
    top: number;
  } | null>(null);
  const [replyTarget, setReplyTarget] = useState<MessageRow | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageRow | null>(null);
  const [pinnedMessage, setPinnedMessage] = useState<MessageRow | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<number[]>([]);
  const [areNotificationsEnabled, setAreNotificationsEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("twinline-notifications") === "enabled";
  });
  const [errorMessage, setErrorMessage] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const stickerButtonRef = useRef<HTMLButtonElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteCallStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callStatusRef = useRef<CallStatus>("idle");
  const callPartnerIdRef = useRef<string | null>(null);
  const localCallStreamRef = useRef<MediaStream | null>(null);
  const callStartedAtRef = useRef<number | null>(null);
  const hasSavedCallSummaryRef = useRef(false);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const processedCallSignalIdsRef = useRef<Set<string>>(new Set());
  const latestCallSignalCreatedAtRef = useRef<string>("1970-01-01T00:00:00.000Z");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const latestMessageCreatedAtRef = useRef<string | null>(null);
  const notificationsEnabledRef = useRef(false);
  const isDeletingChatRef = useRef(false);
  const callPanelDragRef = useRef({
    left: 0,
    pointerId: 0,
    startX: 0,
    startY: 0,
    top: 0,
  });

  const currentProfile = useMemo(() => {
    return profiles.find((profile) => profile.user_id === user?.id) ?? null;
  }, [profiles, user?.id]);
  const activeUserName = useMemo(() => {
    return currentProfile?.display_name ?? getDisplayName(user);
  }, [currentProfile?.display_name, user]);
  const friendProfile = useMemo(() => {
    const profileFriend = profiles.find((profile) => {
      return profile.user_id !== user?.id;
    });

    if (profileFriend) {
      return {
        avatarUrl: profileFriend.avatar_url,
        name: profileFriend.display_name,
        userId: profileFriend.user_id,
      };
    }

    const friendMessage = messages.find((message) => {
      return message.user_id && message.user_id !== user?.id;
    });

    if (!friendMessage) {
      return null;
    }

    const profile = profiles.find((item) => item.user_id === friendMessage.user_id);

    return {
      avatarUrl: profile?.avatar_url ?? null,
      name: profile?.display_name ?? friendMessage.author,
      userId: friendMessage.user_id,
    };
  }, [messages, profiles, user?.id]);
  const isNameChangeAllowed = canChangeName(currentProfile?.name_changed_at ?? null);
  const nextNameChangeDate = getNextNameChangeDate(
    currentProfile?.name_changed_at ?? null,
  );
  const profileNameInputValue = profileName || activeUserName;
  const incomingCallerProfile = incomingCall
    ? profiles.find((profile) => profile.user_id === incomingCall.sender_id)
    : null;
  const callStatusText =
    callStatus === "calling"
      ? "Звоню..."
      : callStatus === "incoming"
        ? `Звонит ${incomingCallerProfile?.display_name ?? "Друг"}`
        : callStatus === "connecting"
          ? "Соединение..."
          : callStatus === "connected"
            ? "Звонок идет"
            : "";
  const callPanelProfile =
    callStatus === "incoming"
      ? {
          avatarUrl: incomingCallerProfile?.avatar_url ?? null,
          name: incomingCallerProfile?.display_name ?? "Друг",
        }
      : {
          avatarUrl: friendProfile?.avatarUrl ?? null,
          name: friendProfile?.name ?? "Друг",
        };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setMessages([]);
      setGalleryItems([]);
      setIdeas([]);
      setProfiles([]);
      latestMessageCreatedAtRef.current = null;
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    latestMessageCreatedAtRef.current =
      messages.filter((message) => message.id > 0).at(-1)?.created_at ?? null;
  }, [messages]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    notificationsEnabledRef.current = areNotificationsEnabled;
  }, [areNotificationsEnabled]);

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
          {
            left: window.innerWidth - 374,
            top: window.innerHeight - 338,
          },
          isCallPanelCollapsed,
        );
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [callStatus, isCallPanelCollapsed]);

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
  }, [callStatus, isCallPanelCollapsed]);

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
  }, [callStartedAt, callStatus]);

  useEffect(() => {
    if (!messageContextMenu) {
      return;
    }

    function closeMenu() {
      setMessageContextMenu(null);
    }

    function closeMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMessageContextMenu(null);
      }
    }

    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("keydown", closeMenuOnEscape);

    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, [messageContextMenu]);

  useEffect(() => {
    return () => {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      localCallStreamRef.current?.getTracks().forEach((track) => track.stop());
      peerConnectionRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const signedInUser = user;
    let isMounted = true;

    latestCallSignalCreatedAtRef.current = new Date().toISOString();

    async function handleCallSignal(signal: CallSignal) {
      if (processedCallSignalIdsRef.current.has(signal.id)) {
        return;
      }

      processedCallSignalIdsRef.current.add(signal.id);
      latestCallSignalCreatedAtRef.current = signal.created_at;

      if (signal.sender_id === signedInUser.id) {
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

    async function syncMissedCallSignals() {
      const { data } = await fetchCallSignalsAfter(
        signedInUser.id,
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
      .channel(`call-signals-${signedInUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          filter: `receiver_id=eq.${signedInUser.id}`,
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
    // Call helpers are function declarations below; refs keep this realtime handler fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const signedInUser = user;
    let isMounted = true;

    async function ensureCurrentProfile() {
      await supabase.from("profiles").upsert(
        {
          display_name: getDisplayName(signedInUser),
          user_id: signedInUser.id,
        },
        {
          onConflict: "user_id",
          ignoreDuplicates: true,
        },
      );
    }

    async function syncAllMessages(showLoading = false) {
      if (isDeletingChatRef.current) {
        setIsLoadingMessages(false);
        return;
      }

      if (showLoading) {
        setIsLoadingMessages(true);
      }

      const { data, error } = await fetchMessages();

      if (!isMounted || isDeletingChatRef.current) {
        setIsLoadingMessages(false);
        return;
      }

      if (error) {
        setErrorMessage("Не получилось загрузить сообщения.");
      } else {
        setMessages(data ?? []);
        setErrorMessage("");
      }

      setIsLoadingMessages(false);
    }

    async function syncNewMessages() {
      if (isDeletingChatRef.current) {
        return;
      }

      const latestMessageCreatedAt = latestMessageCreatedAtRef.current;

      if (!latestMessageCreatedAt) {
        await syncAllMessages();
        return;
      }

      const { data, error } = await fetchMessagesAfter(latestMessageCreatedAt);

      if (!isMounted || isDeletingChatRef.current) {
        return;
      }

      if (error) {
        setErrorMessage("Не получилось загрузить новые сообщения.");
      } else if (data?.length) {
        setMessages((currentMessages) => mergeMessages(currentMessages, data));
        setErrorMessage("");
      }
    }

    ensureCurrentProfile();
    syncAllMessages(true);

    const newMessagesInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        syncNewMessages();
      }
    }, 900);

    const fullSyncInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        syncAllMessages();
      }
    }, 10000);

    const channel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;

          if (isDeletingChatRef.current) {
            return;
          }

          setMessages((currentMessages) =>
            mergeMessages(currentMessages, [newMessage]),
          );

          if (
            notificationsEnabledRef.current &&
            newMessage.user_id !== signedInUser.id &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(newMessage.author, {
              body: newMessage.text.startsWith(imageMessagePrefix)
                ? "Отправлено изображение"
                : newMessage.text.startsWith(videoMessagePrefix)
                  ? "Отправлено видео"
                  : newMessage.text.startsWith(audioMessagePrefix)
                    ? "Голосовое сообщение"
                    : newMessage.text.startsWith(callMessagePrefix)
                      ? "Звонок завершен"
                      : newMessage.text.startsWith(stickerMessagePrefix)
                        ? "Стикер"
                        : newMessage.text,
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const deletedMessage = payload.old as Pick<MessageRow, "id">;

          setMessages((currentMessages) =>
            currentMessages.filter((message) => message.id !== deletedMessage.id),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const updatedMessage = payload.new as MessageRow;

          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === updatedMessage.id ? updatedMessage : message,
            ),
          );
          setPinnedMessage((currentPinnedMessage) =>
            currentPinnedMessage?.id === updatedMessage.id
              ? updatedMessage
              : currentPinnedMessage,
          );
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.clearInterval(newMessagesInterval);
      window.clearInterval(fullSyncInterval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;

    async function syncSharedSections() {
      const [galleryResult, ideasResult, profilesResult] = await Promise.all([
        fetchGalleryItems(),
        fetchIdeas(),
        fetchProfiles(),
      ]);

      if (!isMounted) {
        return;
      }

      if (galleryResult.error || ideasResult.error || profilesResult.error) {
        setErrorMessage("Не получилось загрузить общие разделы.");
        return;
      }

      setGalleryItems(galleryResult.data ?? []);
      setIdeas(ideasResult.data ?? []);
      setProfiles(profilesResult.data ?? []);
    }

    syncSharedSections();

    const sharedSectionsInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        syncSharedSections();
      }
    }, 5000);

    const channel = supabase
      .channel("shared-sections-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gallery_items",
        },
        (payload) => {
          const newItem = payload.new as GalleryItem;

          setGalleryItems((currentItems) => {
            if (currentItems.some((item) => item.id === newItem.id)) {
              return currentItems;
            }

            return [newItem, ...currentItems];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "gallery_items",
        },
        (payload) => {
          const deletedItem = payload.old as Pick<GalleryItem, "id">;

          setGalleryItems((currentItems) =>
            currentItems.filter((item) => item.id !== deletedItem.id),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ideas",
        },
        (payload) => {
          const newIdea = payload.new as IdeaRow;

          setIdeas((currentIdeas) => {
            if (currentIdeas.some((idea) => idea.id === newIdea.id)) {
              return currentIdeas;
            }

            return [newIdea, ...currentIdeas];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "ideas",
        },
        (payload) => {
          const deletedIdea = payload.old as Pick<IdeaRow, "id">;

          setIdeas((currentIdeas) =>
            currentIdeas.filter((idea) => idea.id !== deletedIdea.id),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const nextProfile = payload.new as ProfileRow;

          setProfiles((currentProfiles) => {
            const withoutProfile = currentProfiles.filter(
              (profile) => profile.user_id !== nextProfile.user_id,
            );

            return [...withoutProfile, nextProfile];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const nextProfile = payload.new as ProfileRow;

          setProfiles((currentProfiles) => {
            const withoutProfile = currentProfiles.filter(
              (profile) => profile.user_id !== nextProfile.user_id,
            );

            return [...withoutProfile, nextProfile];
          });
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.clearInterval(sharedSectionsInterval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (authMode === "sign-up") {
      const { error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          data: {
            display_name: authName.trim() || authEmail.trim().split("@")[0],
          },
        },
      });

      if (error) {
        setErrorMessage("Не получилось зарегистрироваться.");
      } else {
        setErrorMessage("Аккаунт создан. Если Supabase попросит, подтверди email.");
        setAuthMode("sign-in");
      }

      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });

    if (error) {
      setErrorMessage("Не получилось войти. Проверь email и пароль.");
    }
  }

  async function signOut() {
    await closeCall(true);
    await supabase.auth.signOut();
    setActiveView("profile");
  }

  async function sendCallSignal(
    receiverId: string,
    type: CallSignalType,
    payload: Record<string, unknown> | RTCSessionDescriptionInit | RTCIceCandidateInit | null,
  ) {
    if (!user) {
      return;
    }

    await supabase.from("call_signals").insert({
      payload,
      receiver_id: receiverId,
      sender_id: user.id,
      type,
    });
  }

  async function playRemoteAudio() {
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
  }

  function setLocalMicrophoneMuted(isMuted: boolean) {
    localCallStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
    setIsCallMicMuted(isMuted);
  }

  function toggleCallMicrophone() {
    setLocalMicrophoneMuted(!isCallMicMuted);
  }

  function markCallConnected() {
    if (callStatusRef.current !== "connected") {
      const startedAt = Date.now();

      setCallDuration(0);
      setCallStartedAt(startedAt);
      callStartedAtRef.current = startedAt;
      hasSavedCallSummaryRef.current = false;
    }

    callStatusRef.current = "connected";
    setCallStatus("connected");
  }

  function createPeerConnection(receiverId: string) {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendCallSignal(receiverId, "ice", event.candidate.toJSON());
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
        playRemoteAudio();
      }

      event.track.onunmute = () => {
        playRemoteAudio();
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
        closeCall(false);
      }
    };

    peerConnectionRef.current = peerConnection;
    callPartnerIdRef.current = receiverId;

    return peerConnection;
  }

  async function getLocalCallStream() {
    if (localCallStreamRef.current) {
      return localCallStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    });

    localCallStreamRef.current = stream;

    return stream;
  }

  async function startCall() {
    if (!user) {
      return;
    }

    if (!friendProfile?.userId) {
      setErrorMessage("Чтобы позвонить, сначала нужен хотя бы один вход друга в чат.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setErrorMessage("Этот браузер не поддерживает звонки.");
      return;
    }

    try {
      setErrorMessage("");
      callStatusRef.current = "calling";
      setCallStatus("calling");
      setCallDuration(0);
      setCallStartedAt(null);
      callStartedAtRef.current = null;
      hasSavedCallSummaryRef.current = false;
      setIsCallMicMuted(false);

      const stream = await getLocalCallStream();
      const peerConnection = createPeerConnection(friendProfile.userId);

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await sendCallSignal(friendProfile.userId, "offer", offer);
    } catch {
      closeCall(false);
      setErrorMessage("Не получилось начать звонок. Проверь доступ к микрофону.");
    }
  }

  async function acceptCall() {
    if (!incomingCall || !isSessionDescriptionPayload(incomingCall.payload)) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setErrorMessage("Этот браузер не поддерживает звонки.");
      return;
    }

    try {
      setErrorMessage("");
      callStatusRef.current = "connecting";
      setCallStatus("connecting");
      setCallDuration(0);
      setCallStartedAt(null);
      callStartedAtRef.current = null;
      hasSavedCallSummaryRef.current = false;
      setIsCallMicMuted(false);

      const stream = await getLocalCallStream();
      const peerConnection = createPeerConnection(incomingCall.sender_id);

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

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
      closeCall(false);
      setErrorMessage("Не получилось принять звонок. Проверь доступ к микрофону.");
    }
  }

  async function saveCallSummaryMessage() {
    if (!user || hasSavedCallSummaryRef.current || !callStartedAtRef.current) {
      return;
    }

    const duration = Math.max(
      1,
      Math.floor((Date.now() - callStartedAtRef.current) / 1000),
    );

    hasSavedCallSummaryRef.current = true;

    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      text: `${callMessagePrefix}${duration}`,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        text: `${callMessagePrefix}${duration}`,
        user_id: user.id,
      })
      .select("id, author, text, created_at, user_id")
      .single();

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      hasSavedCallSummaryRef.current = false;
      setErrorMessage("Не получилось сохранить запись о звонке.");
      return;
    }

    setMessages((currentMessages) => {
      const withoutOptimisticMessage = currentMessages.filter(
        (message) => message.id !== optimisticMessage.id,
      );

      return mergeMessages(withoutOptimisticMessage, data ? [data] : []);
    });
  }

  async function closeCall(notifyPartner: boolean) {
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
    localCallStreamRef.current?.getTracks().forEach((track) => track.stop());
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
  }

  async function toggleNotifications() {
    const nextValue = !areNotificationsEnabled;

    if (nextValue && "Notification" in window) {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setErrorMessage("Браузер не разрешил уведомления.");
        return;
      }
    }

    setAreNotificationsEnabled(nextValue);
    window.localStorage.setItem(
      "twinline-notifications",
      nextValue ? "enabled" : "disabled",
    );
    setErrorMessage("");
  }

  async function deleteChat() {
    if (isDeletingChat) {
      return;
    }

    const confirmed = window.confirm(
      "Вы точно хотите удалить переписку у обоих?",
    );

    if (!confirmed) {
      return;
    }

    const previousMessages = messages;

    isDeletingChatRef.current = true;
    latestMessageCreatedAtRef.current = null;
    flushSync(() => {
      setIsDeletingChat(true);
      setMessages([]);
    });

    const { error } = await supabase.from("messages").delete().gte("id", 0);

    if (error) {
      isDeletingChatRef.current = false;
      flushSync(() => {
        setMessages(previousMessages);
        setIsDeletingChat(false);
      });
      setErrorMessage("Не получилось удалить чат. Возможно, нужно разрешить удаление в Supabase.");
      return;
    }

    latestMessageCreatedAtRef.current = null;
    setMessages([]);
    setIsDeletingChat(false);
    isDeletingChatRef.current = false;
    setErrorMessage("");
  }

  function toggleStickerPicker() {
    const button = stickerButtonRef.current;

    if (button) {
      const rect = button.getBoundingClientRect();
      const pickerWidth = Math.min(300, window.innerWidth - 32);

      setStickerPickerPosition({
        left: Math.max(16, Math.min(rect.left, window.innerWidth - pickerWidth - 16)),
        top: Math.max(16, rect.top - 236),
      });
    }

    setIsStickerPickerOpen((isOpen) => !isOpen);
  }

  function openMessageContextMenu(
    event: MouseEvent<HTMLElement>,
    message: MessageRow,
  ) {
    if (!user || message.user_id !== user.id) {
      return;
    }

    event.preventDefault();
    setIsStickerPickerOpen(false);

    const menuWidth = 220;
    const menuHeight = 306;

    setMessageContextMenu({
      left: Math.max(
        8,
        Math.min(event.clientX, window.innerWidth - menuWidth - 8),
      ),
      message,
      top: Math.max(
        8,
        Math.min(event.clientY, window.innerHeight - menuHeight - 8),
      ),
    });
  }

  async function copyMessageText(message: MessageRow) {
    try {
      await navigator.clipboard.writeText(getReadableMessageText(message.text));
      setErrorMessage("");
    } catch {
      setErrorMessage("Не получилось скопировать текст.");
    }

    setMessageContextMenu(null);
  }

  function replyToMessage(message: MessageRow) {
    setReplyTarget(message);
    setEditingMessage(null);
    setMessageText("");
    setMessageContextMenu(null);
    setErrorMessage("");
  }

  function startEditingMessage(message: MessageRow) {
    if (!user || message.user_id !== user.id) {
      setErrorMessage("Можно изменять только свои сообщения.");
      setMessageContextMenu(null);
      return;
    }

    setEditingMessage(message);
    setReplyTarget(null);
    setMessageText(getReadableMessageText(message.text));
    setMessageContextMenu(null);
    setErrorMessage("");
  }

  function togglePinnedMessage(message: MessageRow) {
    setPinnedMessage((currentPinnedMessage) =>
      currentPinnedMessage?.id === message.id ? null : message,
    );
    setMessageContextMenu(null);
    setErrorMessage("");
  }

  function toggleSelectedMessage(message: MessageRow) {
    setSelectedMessageIds((currentIds) =>
      currentIds.includes(message.id)
        ? currentIds.filter((id) => id !== message.id)
        : [...currentIds, message.id],
    );
    setMessageContextMenu(null);
    setErrorMessage("");
  }

  function startCallPanelDrag(event: PointerEvent<HTMLElement>) {
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
  }

  function dragCallPanel(event: PointerEvent<HTMLElement>) {
    if (callPanelDragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const nextPosition = {
      left: callPanelDragRef.current.left + event.clientX - callPanelDragRef.current.startX,
      top: callPanelDragRef.current.top + event.clientY - callPanelDragRef.current.startY,
    };

    setCallPanelPosition(clampPanelPosition(nextPosition, isCallPanelCollapsed));
  }

  function stopCallPanelDrag(event: PointerEvent<HTMLElement>) {
    if (callPanelDragRef.current.pointerId !== event.pointerId) {
      return;
    }

    callPanelDragRef.current.pointerId = 0;
  }

  async function updateProfileName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    const nextName = profileName.trim();

    if (!nextName || nextName === activeUserName) {
      return;
    }

    if (nextName.length < 2 || nextName.length > 24) {
      setErrorMessage("Имя должно быть от 2 до 24 символов.");
      return;
    }

    if (!isNameChangeAllowed) {
      setErrorMessage(
        `Имя можно будет снова изменить ${nextNameChangeDate ?? "позже"}.`,
      );
      return;
    }

    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        avatar_url: currentProfile?.avatar_url ?? null,
        display_name: nextName,
        name_changed_at: updatedAt,
        updated_at: updatedAt,
        user_id: user.id,
      })
      .select("user_id, display_name, avatar_url, name_changed_at, updated_at")
      .single();

    if (error) {
      setErrorMessage("Не получилось изменить имя.");
      return;
    }

    if (data) {
      setProfiles((currentProfiles) => {
        const withoutProfile = currentProfiles.filter(
          (profile) => profile.user_id !== data.user_id,
        );

        return [...withoutProfile, data];
      });
    }

    await supabase.auth.updateUser({
      data: {
        display_name: nextName,
      },
    });

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.user_id === user.id ? { ...message, author: nextName } : message,
      ),
    );
    setProfileName("");
    setErrorMessage("");
  }

  async function updateAvatar(file: File) {
    if (!user) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Аватаркой может быть только изображение.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage("Аватарка должна быть меньше 8 МБ.");
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMessage("");

    const fileExtension = file.name.split(".").pop() ?? "jpg";
    const filePath = `${user.id}/avatars/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("message-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setIsUploadingAvatar(false);
      setErrorMessage("Не получилось загрузить аватарку.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("message-images")
      .getPublicUrl(filePath);

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        avatar_url: publicUrlData.publicUrl,
        display_name: activeUserName,
        name_changed_at: currentProfile?.name_changed_at ?? null,
        updated_at: new Date().toISOString(),
        user_id: user.id,
      })
      .select("user_id, display_name, avatar_url, name_changed_at, updated_at")
      .single();

    setIsUploadingAvatar(false);

    if (error) {
      setErrorMessage("Не получилось сохранить аватарку.");
      return;
    }

    if (data) {
      setProfiles((currentProfiles) => {
        const withoutProfile = currentProfiles.filter(
          (profile) => profile.user_id !== data.user_id,
        );

        return [...withoutProfile, data];
      });
    }

    setErrorMessage("");
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      updateAvatar(file);
    }

    event.target.value = "";
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    const trimmedText = messageText.trim();

    if (!trimmedText) {
      return;
    }

    if (editingMessage) {
      const previousMessages = messages;
      const updatedMessage: MessageRow = {
        ...editingMessage,
        text: trimmedText,
      };

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === editingMessage.id ? updatedMessage : message,
        ),
      );
      setPinnedMessage((currentPinnedMessage) =>
        currentPinnedMessage?.id === editingMessage.id ? updatedMessage : currentPinnedMessage,
      );
      setEditingMessage(null);
      setMessageText("");

      const { data, error } = await supabase
        .from("messages")
        .update({ text: trimmedText })
        .eq("id", editingMessage.id)
        .eq("user_id", user.id)
        .select("id, author, text, created_at, user_id")
        .maybeSingle();

      if (error || !data) {
        setMessages(previousMessages);
        setPinnedMessage((currentPinnedMessage) =>
          currentPinnedMessage?.id === editingMessage.id ? editingMessage : currentPinnedMessage,
        );
        setEditingMessage(editingMessage);
        setMessageText(trimmedText);
        setErrorMessage("Не получилось изменить сообщение. Возможно, нужно разрешить UPDATE в Supabase.");
      } else {
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === data.id ? data : message,
          ),
        );
        setPinnedMessage((currentPinnedMessage) =>
          currentPinnedMessage?.id === data.id ? data : currentPinnedMessage,
        );
        setErrorMessage("");
      }

      return;
    }

    const outgoingText = replyTarget
      ? createReplyMessageText(replyTarget, trimmedText)
      : trimmedText;

    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      text: outgoingText,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setMessageText("");
    setReplyTarget(null);
    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        text: outgoingText,
        user_id: user.id,
      })
      .select("id, author, text, created_at, user_id")
      .single();

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setMessageText(trimmedText);
      setReplyTarget(replyTarget);
      setErrorMessage("Не получилось отправить сообщение.");
    } else {
      setMessages((currentMessages) => {
        const withoutOptimisticMessage = currentMessages.filter(
          (message) => message.id !== optimisticMessage.id,
        );

        return mergeMessages(withoutOptimisticMessage, data ? [data] : []);
      });
      setErrorMessage("");
    }
  }

  async function sendSticker(sticker: string) {
    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    const stickerText = `${stickerMessagePrefix}${sticker}`;
    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      text: stickerText,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setIsStickerPickerOpen(false);
    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        text: stickerText,
        user_id: user.id,
      })
      .select("id, author, text, created_at, user_id")
      .single();

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setErrorMessage("Не получилось отправить стикер.");
      return;
    }

    setMessages((currentMessages) => {
      const withoutOptimisticMessage = currentMessages.filter(
        (message) => message.id !== optimisticMessage.id,
      );

      return mergeMessages(withoutOptimisticMessage, data ? [data] : []);
    });
    setErrorMessage("");
  }

  async function sendAttachment(file: File) {
    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setErrorMessage("Можно отправлять только изображения и видео.");
      return;
    }

    if (file.size > maxAttachmentSize) {
      setErrorMessage("Файл должен быть меньше 50 МБ.");
      return;
    }

    setIsUploadingAttachment(true);
    setErrorMessage("");

    const fileExtension = file.name.split(".").pop() ?? "jpg";
    const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("message-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setIsUploadingAttachment(false);
      setErrorMessage("Не получилось загрузить файл.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("message-images")
      .getPublicUrl(filePath);

    const attachmentUrl = publicUrlData.publicUrl;
    const messagePrefix = isVideo ? videoMessagePrefix : imageMessagePrefix;
    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      text: `${messagePrefix}${attachmentUrl}`,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        text: `${messagePrefix}${attachmentUrl}`,
        user_id: user.id,
      })
      .select("id, author, text, created_at, user_id")
      .single();

    setIsUploadingAttachment(false);

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setErrorMessage("Не получилось отправить файл.");
    } else {
      setMessages((currentMessages) => {
        const withoutOptimisticMessage = currentMessages.filter(
          (message) => message.id !== optimisticMessage.id,
        );

        return mergeMessages(withoutOptimisticMessage, data ? [data] : []);
      });
    }
  }

  async function sendVoiceMessage(audioBlob: Blob) {
    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    if (audioBlob.size > maxAttachmentSize) {
      setErrorMessage("Голосовое сообщение должно быть меньше 50 МБ.");
      return;
    }

    setIsUploadingAttachment(true);
    setErrorMessage("");

    const filePath = `${user.id}/voice-${Date.now()}-${crypto.randomUUID()}.webm`;

    const { error: uploadError } = await supabase.storage
      .from("message-images")
      .upload(filePath, audioBlob, {
        cacheControl: "3600",
        contentType: audioBlob.type || "audio/webm",
        upsert: false,
      });

    if (uploadError) {
      setIsUploadingAttachment(false);
      setErrorMessage("Не получилось загрузить голосовое сообщение.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("message-images")
      .getPublicUrl(filePath);

    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      text: `${audioMessagePrefix}${publicUrlData.publicUrl}`,
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        text: `${audioMessagePrefix}${publicUrlData.publicUrl}`,
        user_id: user.id,
      })
      .select("id, author, text, created_at, user_id")
      .single();

    setIsUploadingAttachment(false);

    if (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setErrorMessage("Не получилось отправить голосовое сообщение.");
    } else {
      setMessages((currentMessages) => {
        const withoutOptimisticMessage = currentMessages.filter(
          (message) => message.id !== optimisticMessage.id,
        );

        return mergeMessages(withoutOptimisticMessage, data ? [data] : []);
      });
    }
  }

  async function startVoiceRecording() {
    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Браузер не поддерживает запись голоса.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(recordingChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        recordingChunksRef.current = [];
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;

        if (audioBlob.size > 0) {
          sendVoiceMessage(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setErrorMessage("");
    } catch {
      setErrorMessage("Не получилось получить доступ к микрофону.");
    }
  }

  function stopVoiceRecording() {
    const mediaRecorder = mediaRecorderRef.current;

    if (!mediaRecorder) {
      return;
    }

    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    setIsRecordingVoice(false);
  }

  function toggleVoiceRecording() {
    if (isRecordingVoice) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  }

  function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      sendAttachment(file);
    }

    event.target.value = "";
  }

  async function addIdea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    const trimmedIdea = ideaText.trim();

    if (!trimmedIdea) {
      return;
    }

    setIdeaText("");

    const { data, error } = await supabase
      .from("ideas")
      .insert({
        author: activeUserName,
        text: trimmedIdea,
        user_id: user.id,
      })
      .select("id, user_id, author, text, created_at")
      .single();

    if (error) {
      setIdeaText(trimmedIdea);
      setErrorMessage("Не получилось сохранить идею.");
      return;
    }

    if (data) {
      setIdeas((currentIdeas) => [data, ...currentIdeas]);
    }

    setErrorMessage("");
  }

  async function uploadGalleryItem(file: File) {
    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      setErrorMessage("В галерею можно загружать только фото и видео.");
      return;
    }

    if (file.size > maxAttachmentSize) {
      setErrorMessage("Файл должен быть меньше 50 МБ.");
      return;
    }

    setIsUploadingGalleryItem(true);
    setErrorMessage("");

    const fileExtension = file.name.split(".").pop() ?? "jpg";
    const filePath = `gallery/${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("message-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setIsUploadingGalleryItem(false);
      setErrorMessage("Не получилось загрузить файл в галерею.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("message-images")
      .getPublicUrl(filePath);

    const { data, error } = await supabase
      .from("gallery_items")
      .insert({
        author: activeUserName,
        caption: galleryCaption.trim() || null,
        file_type: isVideo ? "video" : "image",
        file_url: publicUrlData.publicUrl,
        user_id: user.id,
      })
      .select("id, user_id, author, file_url, file_type, caption, created_at")
      .single();

    setIsUploadingGalleryItem(false);

    if (error) {
      setErrorMessage("Файл загрузился, но не получилось сохранить его в галерее.");
      return;
    }

    if (data) {
      setGalleryItems((currentItems) => [data, ...currentItems]);
    }

    setGalleryCaption("");
    setErrorMessage("");
  }

  function handleGalleryFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      uploadGalleryItem(file);
    }

    event.target.value = "";
  }

  async function deleteGalleryItem(item: GalleryItem) {
    const previousItems = galleryItems;

    setGalleryItems((currentItems) =>
      currentItems.filter((currentItem) => currentItem.id !== item.id),
    );

    const { error } = await supabase
      .from("gallery_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      setGalleryItems(previousItems);
      setErrorMessage("Не получилось удалить файл из галереи.");
    } else {
      setErrorMessage("");
    }
  }

  async function deleteIdea(idea: IdeaRow) {
    const previousIdeas = ideas;

    setIdeas((currentIdeas) =>
      currentIdeas.filter((currentIdea) => currentIdea.id !== idea.id),
    );

    const { error } = await supabase.from("ideas").delete().eq("id", idea.id);

    if (error) {
      setIdeas(previousIdeas);
      setErrorMessage("Не получилось удалить идею.");
    } else {
      setErrorMessage("");
    }
  }

  async function deleteMessage(message: MessageRow) {
    setMessageContextMenu(null);

    if (!user || message.user_id !== user.id) {
      setErrorMessage("Можно удалять только свои сообщения.");
      return;
    }

    const previousMessages = messages;

    setMessages((currentMessages) =>
      currentMessages.filter((currentMessage) => currentMessage.id !== message.id),
    );

    const { data, error } = await supabase
      .from("messages")
      .delete()
      .eq("id", message.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      setMessages(previousMessages);
      setErrorMessage("Не получилось удалить сообщение из базы.");
    } else {
      setPinnedMessage((currentPinnedMessage) =>
        currentPinnedMessage?.id === message.id ? null : currentPinnedMessage,
      );
      setSelectedMessageIds((currentIds) =>
        currentIds.filter((id) => id !== message.id),
      );
      setErrorMessage("");
    }
  }

  if (isAuthLoading) {
    return (
      <main className="grid h-dvh place-items-center bg-[#05080a] text-[#e3f4f4]">
        <p className="text-sm font-semibold text-[#8fb7bb]">Загружаю Twinline...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="relative grid h-dvh place-items-center overflow-hidden bg-[#05080a] px-4 text-[#e3f4f4]">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(47,174,164,0.2),transparent_32%),linear-gradient(135deg,#05080a_0%,#0b1418_48%,#030506_100%)]"
        />
        <section className="relative w-full max-w-md rounded-3xl border border-[#2faea4]/45 bg-[#0d171c]/86 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#37c6b8]">
              <span className="text-xl font-black text-[#041012]">T</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Twinline</h1>
              <p className="text-sm text-[#8fb7bb]">Вход в приватное пространство</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 rounded-xl border border-[#2faea4]/35 bg-black/20 p-1">
            <button
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                authMode === "sign-in"
                  ? "bg-[#37c6b8] text-[#041012]"
                  : "text-[#e3f4f4]"
              }`}
              onClick={() => setAuthMode("sign-in")}
              type="button"
            >
              Вход
            </button>
            <button
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                authMode === "sign-up"
                  ? "bg-[#37c6b8] text-[#041012]"
                  : "text-[#e3f4f4]"
              }`}
              onClick={() => setAuthMode("sign-up")}
              type="button"
            >
              Регистрация
            </button>
          </div>

          <form className="grid gap-3" onSubmit={handleAuth}>
            {authMode === "sign-up" ? (
              <input
                className="min-h-12 rounded-xl border border-transparent bg-[#e3f4f4]/12 px-4 text-base outline-none placeholder:text-[#8fb7bb]/70 focus:border-[#37c6b8]"
                onChange={(event) => setAuthName(event.target.value)}
                placeholder="Имя в Twinline"
                type="text"
                value={authName}
              />
            ) : null}
            <input
              className="min-h-12 rounded-xl border border-transparent bg-[#e3f4f4]/12 px-4 text-base outline-none placeholder:text-[#8fb7bb]/70 focus:border-[#37c6b8]"
              onChange={(event) => setAuthEmail(event.target.value)}
              placeholder="Email"
              type="email"
              value={authEmail}
            />
            <input
              className="min-h-12 rounded-xl border border-transparent bg-[#e3f4f4]/12 px-4 text-base outline-none placeholder:text-[#8fb7bb]/70 focus:border-[#37c6b8]"
              onChange={(event) => setAuthPassword(event.target.value)}
              placeholder="Пароль"
              type="password"
              value={authPassword}
            />
            <button
              className="min-h-12 rounded-xl bg-[#37c6b8] px-4 text-sm font-bold text-[#041012] transition hover:bg-[#65d8cc]"
              type="submit"
            >
              {authMode === "sign-in" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>

          {errorMessage ? (
            <p className="mt-4 text-sm font-semibold text-[#65d8cc]">
              {errorMessage}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-[#05080a] text-[#e3f4f4]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(47,174,164,0.16),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(227,244,244,0.08),transparent_28%),linear-gradient(135deg,#05080a_0%,#0b1418_46%,#030506_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(227,244,244,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(227,244,244,0.45)_1px,transparent_1px)] [background-size:44px_44px]"
      />
      <div className="relative h-full overflow-hidden bg-[#061014]/35">
        <div className="flex h-full w-full flex-col overflow-hidden px-2 py-2 sm:px-4 sm:py-4 lg:px-5 xl:px-7">
          <header className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/82 px-3 py-3 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:mb-4 sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#37c6b8] shadow-[0_8px_24px_rgba(47,174,164,0.24)] sm:h-11 sm:w-11">
                <span className="text-xl font-black text-[#041012]">T</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-normal sm:text-2xl">
                  Twinline
                </h1>
                <p className="max-w-[210px] truncate text-xs font-medium text-[#8fb7bb] sm:max-w-none sm:text-sm">
                  Приватное пространство для двоих
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                className="rounded-xl border border-[#2faea4]/35 px-3 py-2 text-xs font-bold text-[#e3f4f4] transition hover:bg-white/10 sm:text-sm"
                onClick={signOut}
                type="button"
              >
                Выйти
              </button>
            </div>
          </header>

          <nav className="scrollbar-hidden mb-3 flex shrink-0 gap-2 overflow-x-auto rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/78 p-2 shadow-[0_14px_45px_rgba(0,0,0,0.24)] backdrop-blur-md lg:hidden">
            {[...navItems, settingsNavItem].map((item) => (
              <button
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  activeView === item.view
                    ? "bg-[#37c6b8] text-[#041012]"
                    : "text-[#e3f4f4] opacity-80 hover:bg-white/10 hover:opacity-100"
                }`}
                key={item.view}
                onClick={() => setActiveView(item.view)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <section className="grid min-h-0 flex-1 gap-3 overflow-hidden pb-2 sm:gap-4 sm:pb-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="hidden min-h-0 flex-col rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/78 p-4 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md lg:flex">
              <div className="mb-5">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#5bbdb4]">
                  Меню
                </p>
              </div>

              <nav className="grid gap-2">
                {navItems.map((item) => (
                  <button
                    className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                      activeView === item.view
                        ? "bg-[#37c6b8] text-[#041012]"
                        : "text-[#e3f4f4] opacity-80 hover:bg-white/10 hover:opacity-100"
                    }`}
                    key={item.view}
                    onClick={() => setActiveView(item.view)}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <button
                className={`mt-auto rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  activeView === settingsNavItem.view
                    ? "bg-[#37c6b8] text-[#041012]"
                    : "border border-[#2faea4]/25 text-[#e3f4f4] opacity-80 hover:bg-white/10 hover:opacity-100"
                }`}
                onClick={() => setActiveView(settingsNavItem.view)}
                type="button"
              >
                {settingsNavItem.label}
              </button>
            </aside>

            {activeView === "profile" ? (
              <div className="min-h-0 overflow-y-auto rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/78 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-[#2faea4]/35 pb-5 sm:mb-6">
                  <div className="flex items-center gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#37c6b8] text-2xl font-black text-[#041012] sm:h-20 sm:w-20 sm:text-3xl">
                      {currentProfile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt="Твоя аватарка"
                          className="h-full w-full object-cover"
                          src={currentProfile.avatar_url}
                        />
                      ) : (
                        activeUserName[0]?.toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#5bbdb4]">
                        Активный профиль
                      </p>
                      <h2 className="text-2xl font-semibold sm:text-3xl">
                        {activeUserName}
                      </h2>
                      <input
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                        ref={avatarInputRef}
                        type="file"
                      />
                      <button
                        className="mt-3 rounded-xl border border-[#2faea4]/35 px-3 py-2 text-xs font-bold text-[#e3f4f4] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isUploadingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                        type="button"
                      >
                        {isUploadingAvatar ? "Загружаю..." : "Изменить аватарку"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <section className="rounded-2xl border border-[#2faea4]/35 bg-black/20 p-4 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5bbdb4]">
                      Имя профиля
                    </p>
                    <form className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={updateProfileName}>
                      <input
                        className="min-h-12 rounded-xl border border-transparent bg-[#e3f4f4]/12 px-4 text-base outline-none placeholder:text-[#8fb7bb]/70 focus:border-[#37c6b8] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!isNameChangeAllowed}
                        maxLength={24}
                        minLength={2}
                        onChange={(event) => setProfileName(event.target.value)}
                        placeholder="Новое имя"
                        type="text"
                        value={profileNameInputValue}
                      />
                      <button
                        className="min-h-12 rounded-xl bg-[#37c6b8] px-4 text-sm font-bold text-[#041012] transition hover:bg-[#65d8cc] disabled:cursor-not-allowed disabled:bg-[#52666a]"
                        disabled={
                          !isNameChangeAllowed ||
                          !profileName.trim() ||
                          profileName.trim() === activeUserName
                        }
                        type="submit"
                      >
                        Сохранить имя
                      </button>
                    </form>
                    <p className="mt-3 text-sm leading-6 text-[#8fb7bb]">
                      {isNameChangeAllowed
                        ? "Имя можно менять один раз в месяц. Аватарку можно обновлять когда угодно."
                        : `Имя снова можно будет изменить ${nextNameChangeDate ?? "позже"}.`}
                    </p>
                  </section>

                  <section className="rounded-2xl border border-[#2faea4]/35 bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5bbdb4]">
                      Email
                    </p>
                    <p className="mt-3 break-words text-lg font-semibold">
                      {user.email}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#8fb7bb]">
                      Его видишь только ты в своём аккаунте.
                    </p>
                  </section>

                  <section className="rounded-2xl border border-[#2faea4]/35 bg-black/20 p-4 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5bbdb4]">
                      О профиле
                    </p>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#e3f4f4]">
                      Теперь Twinline понимает, кто открыл сайт. Сообщения и
                      файлы привязаны к твоему аккаунту, а удалять можно только
                      свои сообщения.
                    </p>
                  </section>
                </div>
              </div>
            ) : activeView === "gallery" ? (
              <div className="min-h-0 overflow-y-auto rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/78 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-5">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[#2faea4]/35 pb-5">
                  <div>
                    <p className="text-sm font-medium text-[#5bbdb4]">Общий раздел</p>
                    <h2 className="text-2xl font-semibold sm:text-3xl">Галерея</h2>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <input
                      className="min-h-11 min-w-0 flex-1 rounded-xl border border-transparent bg-[#e3f4f4]/12 px-3 text-sm outline-none placeholder:text-[#8fb7bb]/70 focus:border-[#37c6b8] sm:w-64"
                      onChange={(event) => setGalleryCaption(event.target.value)}
                      placeholder="Подпись к фото..."
                      type="text"
                      value={galleryCaption}
                    />
                    <input
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleGalleryFileChange}
                      ref={galleryInputRef}
                      type="file"
                    />
                    <button
                      className="min-h-11 rounded-xl bg-[#37c6b8] px-4 text-sm font-bold text-[#041012] transition hover:bg-[#65d8cc] disabled:cursor-not-allowed disabled:bg-[#52666a]"
                      disabled={isUploadingGalleryItem}
                      onClick={() => galleryInputRef.current?.click()}
                      type="button"
                    >
                      {isUploadingGalleryItem ? "Загрузка..." : "Добавить"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {galleryItems.length === 0 ? (
                    <article className="rounded-2xl border border-dashed border-[#2faea4]/45 bg-black/20 p-6 text-center sm:col-span-2 xl:col-span-3">
                      <p className="text-base font-semibold">Галерея пока пустая</p>
                      <p className="mt-2 text-sm text-[#8fb7bb]">
                        Загрузи первое фото или видео, и оно будет видно вам обоим.
                      </p>
                    </article>
                  ) : null}

                  {galleryItems.map((item) => (
                    <article
                      className="overflow-hidden rounded-2xl border border-[#2faea4]/35 bg-black/20"
                      key={item.id}
                    >
                      {item.file_type === "image" ? (
                        <button
                          className="block aspect-[16/10] w-full overflow-hidden sm:aspect-[4/5]"
                          onClick={() => setSelectedImageUrl(item.file_url)}
                          type="button"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            alt={item.caption ?? "Фото из галереи"}
                            className="h-full w-full object-cover"
                            src={item.file_url}
                          />
                        </button>
                      ) : (
                        <video
                          className="aspect-[16/10] w-full bg-black object-cover sm:aspect-[4/5]"
                          controls
                          preload="metadata"
                          src={item.file_url}
                        />
                      )}
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold">
                            {profiles.find((profile) => profile.user_id === item.user_id)
                              ?.display_name ?? item.author}
                          </p>
                          <button
                            className="rounded-lg border border-[#2faea4]/35 px-2 py-1 text-[11px] font-bold text-[#8fb7bb] transition hover:bg-white/10 hover:text-[#e3f4f4]"
                            onClick={() => deleteGalleryItem(item)}
                            type="button"
                          >
                            Удалить
                          </button>
                        </div>
                        {item.caption ? (
                          <p className="mt-1 text-sm text-[#8fb7bb]">{item.caption}</p>
                        ) : null}
                        <p className="mt-2 text-xs text-[#5f8185]">
                          {formatMessageTime(item.created_at)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : activeView === "ideas" ? (
              <div className="min-h-0 overflow-y-auto rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/78 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-5">
                <div className="mb-5 border-b border-[#2faea4]/35 pb-5">
                  <p className="text-sm font-medium text-[#5bbdb4]">Общий раздел</p>
                  <h2 className="text-2xl font-semibold sm:text-3xl">Идеи</h2>
                </div>

                <form
                  className="mb-4 flex gap-2 rounded-2xl border border-[#2faea4]/35 bg-black/20 p-2"
                  onSubmit={addIdea}
                >
                  <input
                    className="min-h-12 min-w-0 flex-1 rounded-xl border border-transparent bg-[#e3f4f4]/12 px-4 text-base outline-none placeholder:text-[#8fb7bb]/70 focus:border-[#37c6b8]"
                    onChange={(event) => setIdeaText(event.target.value)}
                    placeholder="Напиши общую идею..."
                    type="text"
                    value={ideaText}
                  />
                  <button
                    className="min-h-12 rounded-xl bg-[#37c6b8] px-4 text-sm font-bold text-[#041012] transition hover:bg-[#65d8cc] disabled:cursor-not-allowed disabled:bg-[#52666a]"
                    disabled={!ideaText.trim()}
                    type="submit"
                  >
                    Добавить
                  </button>
                </form>

                <div className="grid gap-3">
                  {ideas.length === 0 ? (
                    <article className="rounded-2xl border border-dashed border-[#2faea4]/45 bg-black/20 p-6 text-center">
                      <p className="text-base font-semibold">Идей пока нет</p>
                      <p className="mt-2 text-sm text-[#8fb7bb]">
                        Добавьте первую идею, и она сохранится здесь для вас обоих.
                      </p>
                    </article>
                  ) : null}

                  {ideas.map((idea) => (
                    <article
                      className="rounded-2xl border border-[#2faea4]/35 bg-black/20 p-4"
                      key={idea.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-base font-semibold text-[#e3f4f4]">
                          {idea.text}
                        </p>
                        <button
                          className="shrink-0 rounded-lg border border-[#2faea4]/35 px-2 py-1 text-[11px] font-bold text-[#8fb7bb] transition hover:bg-white/10 hover:text-[#e3f4f4]"
                          onClick={() => deleteIdea(idea)}
                          type="button"
                        >
                          Удалить
                        </button>
                      </div>
                      <p className="mt-3 text-xs font-semibold text-[#8fb7bb]">
                        {profiles.find((profile) => profile.user_id === idea.user_id)
                          ?.display_name ?? idea.author}{" "}
                        · {formatMessageTime(idea.created_at)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : activeView === "settings" ? (
              <div className="min-h-0 overflow-y-auto rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/78 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-5">
                <div className="mb-5 border-b border-[#2faea4]/35 pb-5">
                  <p className="text-sm font-medium text-[#5bbdb4]">
                    Twinline
                  </p>
                  <h2 className="text-2xl font-semibold sm:text-3xl">
                    Настройки
                  </h2>
                </div>

                <div className="grid gap-4">
                  <section className="rounded-2xl border border-[#2faea4]/35 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">
                          Уведомления
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#8fb7bb]">
                          Показывать новые сообщения в браузере, когда сайт открыт.
                        </p>
                      </div>
                      <button
                        className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition ${
                          areNotificationsEnabled
                            ? "justify-end bg-[#37c6b8]"
                            : "justify-start bg-[#e3f4f4]/18"
                        }`}
                        onClick={toggleNotifications}
                        type="button"
                      >
                        <span className="h-6 w-6 rounded-full bg-[#e3f4f4]" />
                      </button>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#2faea4]/35 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">
                          Аккаунт
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#8fb7bb]">
                          Ты вошёл как {user.email}.
                        </p>
                      </div>
                      <button
                        className="min-h-11 rounded-xl border border-[#2faea4]/35 px-4 text-sm font-bold text-[#e3f4f4] transition hover:bg-white/10"
                        onClick={signOut}
                        type="button"
                      >
                        Выйти
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <div className="grid min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/78 px-3 py-3 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:mb-4 sm:px-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#37c6b8] text-base font-semibold text-[#041012] transition hover:scale-105"
                      onClick={() => {
                        setViewedProfile(
                          friendProfile ?? {
                            avatarUrl: null,
                            name: "Друг",
                            userId: null,
                          },
                        );
                      }}
                      type="button"
                    >
                      {friendProfile?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt="Аватар собеседника"
                          className="h-full w-full object-cover"
                          src={friendProfile.avatarUrl}
                        />
                      ) : (
                        (friendProfile?.name ?? "Друг")[0]?.toUpperCase()
                      )}
                    </button>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">
                        {friendProfile?.name ?? "Друг"}
                      </h2>
                      <p className="truncate text-sm text-[#8fb7bb]">
                        Приватный профиль собеседника
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                    <button
                      aria-label="Удалить переписку"
                      className="grid min-h-10 w-10 place-items-center rounded-xl border border-red-400/45 bg-red-500/15 text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-55"
                      disabled={isDeletingChat}
                      onClick={deleteChat}
                      type="button"
                    >
                      {isDeletingChat ? (
                        <span className="h-4 w-4 rounded-full border-2 border-red-100 border-t-transparent" />
                      ) : (
                        <svg
                          aria-hidden="true"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      )}
                    </button>
                    <button
                      className="min-h-10 min-w-28 rounded-xl bg-[#37c6b8] px-4 text-xs font-bold text-[#041012] transition hover:bg-[#65d8cc] disabled:cursor-not-allowed disabled:bg-[#52666a]"
                      disabled={!friendProfile?.userId || callStatus !== "idle"}
                      onClick={startCall}
                      type="button"
                    >
                      {callStatus === "idle" ? "Позвонить" : callStatusText}
                    </button>
                  </div>
                </div>
                <audio autoPlay playsInline ref={remoteAudioRef} />

                {callStatus !== "idle" ? (
                  <aside
                    className={`fixed z-40 cursor-move touch-none rounded-3xl border border-[#123236]/70 bg-[#071216]/96 text-center shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl ${
                      isCallPanelCollapsed
                        ? "w-[min(286px,calc(100vw-24px))] border-[#2faea4]/35 bg-[#081418]/94 p-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.42)]"
                        : "w-[min(350px,calc(100vw-24px))] p-4 sm:p-5"
                    }`}
                    onPointerDown={startCallPanelDrag}
                    onPointerMove={dragCallPanel}
                    onPointerUp={stopCallPanelDrag}
                    style={{
                      left: callPanelPosition.left,
                      top: callPanelPosition.top,
                    }}
                  >
                    <button
                      aria-label={isCallPanelCollapsed ? "Развернуть звонок" : "Свернуть звонок"}
                      className={`absolute grid cursor-pointer place-items-center rounded-full text-[#e3f4f4] transition ${
                        isCallPanelCollapsed
                          ? "right-12 top-1/2 h-9 w-9 -translate-y-1/2 bg-white/[0.06] text-[#8fb7bb] hover:bg-white/12 hover:text-[#e3f4f4]"
                          : "right-3 top-3 h-8 w-8 bg-white/[0.06] hover:bg-white/12"
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsCallPanelCollapsed((isCollapsed) => !isCollapsed);
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      type="button"
                    >
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        {isCallPanelCollapsed ? (
                          <path
                            d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        ) : (
                          <path
                            d="M5 12h14"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeWidth="2"
                          />
                        )}
                      </svg>
                    </button>

                    {isCallPanelCollapsed ? (
                      <div className="flex items-center gap-3 pr-[84px] text-left">
                        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#d7dddd] text-lg font-black text-[#071216] shadow-[0_8px_22px_rgba(0,0,0,0.32)] ring-2 ring-[#37c6b8]/25">
                          {callPanelProfile.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt="Аватар звонка"
                              draggable={false}
                              className="h-full w-full object-cover"
                              src={callPanelProfile.avatarUrl}
                            />
                          ) : (
                            callPanelProfile.name[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1 select-none rounded-2xl py-1 text-left">
                          <p className="truncate text-sm font-bold text-[#e3f4f4]">
                            {callPanelProfile.name}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-semibold text-[#8fb7bb]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#37c6b8] shadow-[0_0_10px_rgba(55,198,184,0.75)]" />
                            {callStatus === "connected"
                              ? formatCallDuration(callDuration)
                              : callStatusText || "00:00"}
                          </p>
                        </div>
                        <button
                          aria-label="Завершить звонок"
                          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-red-500 text-white shadow-[0_10px_24px_rgba(239,68,68,0.32)] transition hover:bg-red-400"
                          onClick={() => closeCall(true)}
                          onPointerDown={(event) => event.stopPropagation()}
                          type="button"
                        >
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.5a16 16 0 0 0 6.5 6.5l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 16.9Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="mx-auto mb-4 grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-[#d7dddd] text-4xl font-black text-[#071216]">
                          {callPanelProfile.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt="Аватар звонка"
                              draggable={false}
                              className="h-full w-full object-cover"
                              src={callPanelProfile.avatarUrl}
                            />
                          ) : (
                            callPanelProfile.name[0]?.toUpperCase()
                          )}
                        </div>

                        <p className="truncate text-lg font-semibold text-[#e3f4f4]">
                          {callPanelProfile.name}
                        </p>
                        <p className="mt-1 text-sm font-medium text-[#8fb7bb]">
                          {callStatus === "connected"
                            ? formatCallDuration(callDuration)
                            : callStatusText || "00:00"}
                        </p>

                        <div className="mt-5 flex items-center justify-center gap-3">
                          {callStatus === "incoming" ? (
                            <>
                              <button
                                className="min-h-11 rounded-xl bg-[#37c6b8] px-5 text-sm font-bold text-[#041012] transition hover:bg-[#65d8cc]"
                                onClick={acceptCall}
                                onPointerDown={(event) => event.stopPropagation()}
                                type="button"
                              >
                                Принять
                              </button>
                              <button
                                className="min-h-11 rounded-xl border border-red-400/50 bg-red-500/15 px-5 text-sm font-bold text-red-100 transition hover:bg-red-500/25"
                                onClick={() => closeCall(true)}
                                onPointerDown={(event) => event.stopPropagation()}
                                type="button"
                              >
                                Сбросить
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                aria-label={isCallMicMuted ? "Включить микрофон" : "Выключить микрофон"}
                                className={`grid h-12 w-12 place-items-center rounded-full border transition ${
                                  isCallMicMuted
                                    ? "border-red-400/55 bg-red-500/20 text-red-100"
                                    : "border-[#2faea4]/45 bg-[#e3f4f4]/12 text-[#e3f4f4] hover:bg-white/10"
                                }`}
                                onClick={toggleCallMicrophone}
                                onPointerDown={(event) => event.stopPropagation()}
                                type="button"
                              >
                                <svg
                                  aria-hidden="true"
                                  className="h-5 w-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                  />
                                  <path
                                    d="M19 11a7 7 0 0 1-14 0M12 18v3M9 21h6"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                  />
                                  {isCallMicMuted ? (
                                    <path
                                      d="M4 4l16 16"
                                      stroke="currentColor"
                                      strokeLinecap="round"
                                      strokeWidth="2"
                                    />
                                  ) : null}
                                </svg>
                              </button>
                              <button
                                className="min-h-12 rounded-full bg-red-500 px-5 text-sm font-bold text-white transition hover:bg-red-400"
                                onClick={() => closeCall(true)}
                                onPointerDown={(event) => event.stopPropagation()}
                                type="button"
                              >
                                Завершить
                              </button>
                            </>
                          )}
                        </div>

                        {callStatus !== "incoming" ? (
                          <p className="mt-4 text-sm font-medium text-[#8fb7bb]">
                            {isCallMicMuted ? "Микрофон выключен" : "Микрофон включен"}
                          </p>
                        ) : null}
                      </>
                    )}
                  </aside>
                ) : null}

                {pinnedMessage ? (
                  <button
                    className="mb-3 flex shrink-0 items-center gap-3 rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/82 px-4 py-3 text-left shadow-[0_14px_45px_rgba(0,0,0,0.22)] backdrop-blur-md"
                    onClick={() => setPinnedMessage(null)}
                    type="button"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#37c6b8]/18 text-[#65d8cc]">
                      <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <path d="m14.5 4.5 5 5-3.4 1.1-4.8 4.8.7 3.6-7-7 3.6.7 4.8-4.8 1.1-3.4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        <path d="m9.5 14.5-4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-black uppercase tracking-[0.16em] text-[#5bbdb4]">
                        Закреплено
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-semibold text-[#e3f4f4]">
                        {getReadableMessageText(pinnedMessage.text)}
                      </span>
                    </span>
                  </button>
                ) : null}

                <div className="scrollbar-hidden flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-[#2faea4]/45 bg-[#081216]/82 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-4">
                  {isLoadingMessages ? (
                    <p className="text-sm text-[#8fb7bb]">Загружаю сообщения...</p>
                  ) : null}

                  {!isLoadingMessages && messages.length === 0 ? (
                    <p className="text-sm text-[#8fb7bb]">
                      Сообщений пока нет. Напиши первое.
                    </p>
                  ) : null}

                  {messages.map((message) => {
                    const isMine = message.user_id === user.id;
                    const isSelected = selectedMessageIds.includes(message.id);
                    const isPinned = pinnedMessage?.id === message.id;
                    const messageAuthor =
                      profiles.find((profile) => profile.user_id === message.user_id)
                        ?.display_name ?? message.author;
                    const reply = getMessageReply(message.text);
                    const displayText = reply?.body ?? message.text;
                    const imageUrl = getMessageImageUrl(displayText);
                    const videoUrl = getMessageVideoUrl(displayText);
                    const audioUrl = getMessageAudioUrl(displayText);
                    const callDurationSeconds = getMessageCallDuration(displayText);
                    const sticker = getMessageSticker(displayText);
                    const hasAttachment = Boolean(
                      imageUrl || videoUrl || audioUrl || callDurationSeconds !== null || sticker,
                    );

                    return (
                      <article
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        key={message.id}
                      >
                        <div
                          className={`max-w-[92%] rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.18)] sm:max-w-[72%] ${
                            hasAttachment ? "p-2" : "px-3.5 py-2.5"
                          } ${
                            isMine
                              ? "rounded-br-md bg-[#2faea4] text-[#031012]"
                              : "rounded-bl-md bg-[#eaf6f6] text-[#071316]"
                          } ${
                            isSelected
                              ? "ring-2 ring-[#e3f4f4]/80"
                              : isPinned
                                ? "ring-2 ring-[#f5c85b]/75"
                                : ""
                          }`}
                          onContextMenu={
                            isMine && !hasAttachment
                              ? (event) => openMessageContextMenu(event, message)
                              : undefined
                          }
                        >
                          <p className={`${hasAttachment ? "mb-1.5 px-1" : "mb-0.5"} text-[11px] font-bold leading-4 opacity-55`}>
                            {messageAuthor}
                          </p>
                          {reply ? (
                            <div
                              className={`mb-2 rounded-xl border-l-4 px-3 py-2 text-left ${
                                isMine
                                  ? "border-[#041012]/45 bg-[#041012]/12"
                                  : "border-[#37c6b8]/55 bg-black/8"
                              }`}
                            >
                              <p className="text-[11px] font-black uppercase tracking-[0.12em] opacity-55">
                                {reply.author}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-xs font-semibold opacity-70">
                                {reply.text}
                              </p>
                            </div>
                          ) : null}
                          {imageUrl ? (
                            <button
                              className="block w-full overflow-hidden rounded-xl"
                              onClick={() => setSelectedImageUrl(imageUrl)}
                              type="button"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                alt="Отправленное изображение"
                                className="max-h-[420px] w-full object-cover"
                                src={imageUrl}
                              />
                            </button>
                        ) : videoUrl ? (
                          <video
                            className="max-h-[420px] w-full rounded-xl bg-black"
                            controls
                            controlsList="nodownload"
                            preload="metadata"
                            src={videoUrl}
                          />
                        ) : audioUrl ? (
                          <VoiceMessage src={audioUrl} />
                        ) : callDurationSeconds !== null ? (
                          <div className="min-w-[220px] rounded-2xl bg-black/12 p-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                                  isMine ? "bg-[#041012] text-[#e3f4f4]" : "bg-[#071316] text-[#eaf6f6]"
                                }`}
                              >
                                <svg
                                  aria-hidden="true"
                                  className="h-5 w-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.5a16 16 0 0 0 6.5 6.5l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 16.9Z"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                  />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-bold opacity-75">
                                  Звонок
                                </p>
                                <p className="text-xs font-semibold opacity-60">
                                  Разговор {formatCallDuration(callDurationSeconds)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : sticker ? (
                          <div className="grid min-h-24 min-w-24 place-items-center rounded-2xl bg-black/10 px-5 py-4">
                            <span className="text-6xl leading-none">{sticker}</span>
                          </div>
                        ) : (
                            <p
                              className="whitespace-pre-wrap break-words text-[15px] leading-6"
                            >
                              {displayText}
                            </p>
                          )}
                          <div className={`${hasAttachment ? "mt-2 px-1" : "mt-1"} flex items-center justify-end gap-3`}>
                            <p
                              className={`text-right text-[11px] font-medium ${
                                isMine ? "text-[#0b4643]" : "text-[#6d878a]"
                              }`}
                            >
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <form
                  className="mt-3 flex gap-2 rounded-2xl border border-[#2faea4]/45 bg-[#0d171c]/82 p-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:mt-4"
                  onSubmit={sendMessage}
                >
                  <input
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleAttachmentChange}
                    ref={imageInputRef}
                    type="file"
                  />
                  <button
                    aria-label="Прикрепить файл"
                    className="grid min-h-12 w-12 shrink-0 place-items-center rounded-lg border border-[#2faea4]/35 bg-[#e3f4f4]/12 text-[#e3f4f4] transition hover:bg-[#e3f4f4]/18 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isUploadingAttachment || isRecordingVoice}
                    onClick={() => imageInputRef.current?.click()}
                    type="button"
                  >
                    {isUploadingAttachment ? (
                      <span className="h-4 w-4 rounded-full border-2 border-[#37c6b8] border-t-transparent" />
                    ) : (
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="m8.5 12.5 5.9-5.9a3.2 3.2 0 0 1 4.5 4.5l-7.1 7.1a5 5 0 0 1-7.1-7.1l7.8-7.8"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                    )}
                  </button>
                  <button
                    aria-label="Стикеры"
                    className="grid min-h-12 w-12 shrink-0 place-items-center rounded-lg border border-[#2faea4]/35 bg-[#e3f4f4]/12 text-[#e3f4f4] transition hover:bg-[#e3f4f4]/18 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isUploadingAttachment || isRecordingVoice}
                    onClick={toggleStickerPicker}
                    ref={stickerButtonRef}
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M9 10h.01M15 10h.01M8.8 14.5c1.8 1.7 4.6 1.7 6.4 0"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </button>
                  <button
                    aria-label={isRecordingVoice ? "Остановить запись" : "Записать голосовое"}
                    className={`grid min-h-12 w-12 shrink-0 place-items-center rounded-lg border text-[#e3f4f4] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isRecordingVoice
                        ? "border-red-400/60 bg-red-500/25"
                        : "border-[#2faea4]/35 bg-[#e3f4f4]/12 hover:bg-[#e3f4f4]/18"
                    }`}
                    disabled={isUploadingAttachment}
                    onClick={toggleVoiceRecording}
                    type="button"
                  >
                    {isRecordingVoice ? (
                      <span className="h-3.5 w-3.5 rounded-sm bg-red-300" />
                    ) : (
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                        <path
                          d="M19 11a7 7 0 0 1-14 0M12 18v3M9 21h6"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                    )}
                  </button>
                  <input
                    aria-label="Текст сообщения"
                    className="min-h-12 min-w-0 flex-1 rounded-lg border border-transparent bg-[#e3f4f4]/12 px-3 text-base text-[#e3f4f4] outline-none transition placeholder:text-[#8fb7bb]/70 focus:border-[#37c6b8] focus:bg-[#e3f4f4]/18 sm:px-4"
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder={
                      editingMessage
                        ? "Измени сообщение..."
                        : replyTarget
                          ? "Ответь на сообщение..."
                          : "Напиши сообщение..."
                    }
                    type="text"
                    value={messageText}
                  />
                  <button
                    className="min-h-12 rounded-lg bg-[#37c6b8] px-3 text-sm font-semibold text-[#041012] transition hover:bg-[#65d8cc] disabled:cursor-not-allowed disabled:bg-[#52666a] sm:px-5"
                    disabled={!messageText.trim() || isUploadingAttachment || isRecordingVoice}
                    type="submit"
                  >
                    {editingMessage ? "Сохранить" : "Отправить"}
                  </button>
                </form>

                {replyTarget || editingMessage ? (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-[#2faea4]/35 bg-[#0d171c]/82 px-4 py-3 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-md">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#5bbdb4]">
                        {editingMessage ? "Редактирование" : "Ответ"}
                      </p>
                      <p className="mt-1 truncate font-semibold text-[#e3f4f4]">
                        {getReadableMessageText((editingMessage ?? replyTarget)?.text ?? "")}
                      </p>
                    </div>
                    <button
                      className="shrink-0 rounded-xl border border-[#2faea4]/35 px-3 py-2 text-xs font-bold text-[#e3f4f4] transition hover:bg-white/10"
                      onClick={() => {
                        setReplyTarget(null);
                        setEditingMessage(null);
                        setMessageText("");
                      }}
                      type="button"
                    >
                      Отмена
                    </button>
                  </div>
                ) : null}

                {errorMessage ? (
                  <p className="mt-2 text-sm font-medium text-[#65d8cc]">
                    {errorMessage}
                  </p>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>
      {selectedImageUrl ? (
        <button
          aria-label="Закрыть изображение"
          className="fixed inset-0 z-50 grid place-items-center bg-black/58 p-4 backdrop-blur-sm"
          onClick={() => setSelectedImageUrl(null)}
          type="button"
        >
          <span className="absolute right-4 top-4 rounded-full border border-[#2faea4]/45 bg-[#0d171c]/90 px-4 py-2 text-sm font-semibold text-[#e3f4f4]">
            Закрыть
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Просмотр изображения"
            className="max-h-[76dvh] max-w-[82vw] rounded-2xl border border-[#2faea4]/35 object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
            src={selectedImageUrl}
          />
        </button>
      ) : null}
      {messageContextMenu ? (
        <>
          <button
            aria-label="Закрыть меню сообщения"
            className="fixed inset-0 z-[80] cursor-default bg-transparent"
            onClick={() => setMessageContextMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setMessageContextMenu(null);
            }}
            type="button"
          />
          <div
            className="fixed z-[90] w-[220px] overflow-hidden rounded-lg border border-white/10 bg-[#131f2a] py-1.5 text-[#eef7fb] shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
            style={{
              left: messageContextMenu.left,
              top: messageContextMenu.top,
            }}
          >
            <button
              className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-sm font-medium transition hover:bg-white/10"
              onClick={() => replyToMessage(messageContextMenu.message)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                <path d="M9 14 4 9l5-5M4 9h9a7 7 0 0 1 7 7v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Ответить
            </button>
            <button
              className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-sm font-medium transition hover:bg-white/10"
              onClick={() => startEditingMessage(messageContextMenu.message)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Изменить
            </button>
            <button
              className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-sm font-medium transition hover:bg-white/10"
              onClick={() => togglePinnedMessage(messageContextMenu.message)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                <path d="m14.5 4.5 5 5-3.4 1.1-4.8 4.8.7 3.6-7-7 3.6.7 4.8-4.8 1.1-3.4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="m9.5 14.5-4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
              {pinnedMessage?.id === messageContextMenu.message.id ? "Открепить" : "Закрепить"}
            </button>
            <button
              className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-sm font-medium transition hover:bg-white/10"
              onClick={() => copyMessageText(messageContextMenu.message)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                <rect height="14" rx="2" stroke="currentColor" strokeWidth="2" width="12" x="8" y="8" />
                <path d="M4 16V6a2 2 0 0 1 2-2h10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
              Копировать текст
            </button>
            <button
              className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-sm font-medium text-red-100 transition hover:bg-red-500/18"
              onClick={() => deleteMessage(messageContextMenu.message)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Удалить
            </button>
            <button
              className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-sm font-medium transition hover:bg-white/10"
              onClick={() => toggleSelectedMessage(messageContextMenu.message)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                <path d="M9 12.5 11 14.5 15.5 9.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              {selectedMessageIds.includes(messageContextMenu.message.id)
                ? "Снять выделение"
                : "Выделить"}
            </button>
          </div>
        </>
      ) : null}
      {isStickerPickerOpen ? (
        <>
          <button
            aria-label="Закрыть стикеры"
            className="fixed inset-0 z-[70] cursor-default bg-transparent"
            onClick={() => setIsStickerPickerOpen(false)}
            type="button"
          />
          <div
            className="fixed z-[80] w-[min(300px,calc(100vw-32px))] rounded-2xl border border-[#2faea4]/45 bg-[#071216]/98 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.58)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            style={{
              left: stickerPickerPosition.left,
              top: stickerPickerPosition.top,
            }}
          >
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#5bbdb4]">
                Стикеры
              </p>
              <button
                className="rounded-full px-2 py-1 text-xs font-bold text-[#8fb7bb] transition hover:bg-white/10 hover:text-[#e3f4f4]"
                onClick={() => setIsStickerPickerOpen(false)}
                type="button"
              >
                Закрыть
              </button>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {stickerOptions.map((sticker) => (
                <button
                  className="grid h-14 place-items-center rounded-xl bg-[#e3f4f4]/10 text-3xl leading-none transition hover:scale-[1.03] hover:bg-[#e3f4f4]/18 active:scale-95"
                  key={sticker}
                  onClick={() => sendSticker(sticker)}
                  type="button"
                >
                  {sticker}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
      {viewedProfile ? (
        <button
          aria-label="Закрыть профиль"
          className="fixed inset-0 z-50 grid place-items-center bg-black/58 p-4 backdrop-blur-sm"
          onClick={() => setViewedProfile(null)}
          type="button"
        >
          <section
            className="w-full max-w-sm rounded-3xl border border-[#2faea4]/45 bg-[#0d171c]/95 p-5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-[#37c6b8] text-2xl font-black text-[#041012]">
                {viewedProfile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Аватар профиля"
                    className="h-full w-full object-cover"
                    src={viewedProfile.avatarUrl}
                  />
                ) : (
                  viewedProfile.name[0]?.toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#5bbdb4]">
                  Профиль
                </p>
                <h2 className="truncate text-2xl font-semibold">
                  {viewedProfile.name}
                </h2>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-[#2faea4]/35 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5bbdb4]">
                  Статус
                </p>
                <p className="mt-2 text-sm text-[#e3f4f4]">
                  Участник вашего приватного пространства.
                </p>
              </div>
              <div className="rounded-2xl border border-[#2faea4]/35 bg-black/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5bbdb4]">
                  Конфиденциальность
                </p>
                <p className="mt-2 text-sm leading-6 text-[#8fb7bb]">
                  Email, технический ID и данные входа здесь не показываются.
                </p>
              </div>
            </div>

            <button
              className="mt-5 min-h-11 w-full rounded-xl bg-[#37c6b8] px-4 text-sm font-bold text-[#041012]"
              onClick={() => setViewedProfile(null)}
              type="button"
            >
              Закрыть
            </button>
          </section>
        </button>
      ) : null}
    </main>
  );
}
