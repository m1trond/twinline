"use client";

import Image from "next/image";
import {
  ChangeEvent,
  FormEvent,
  MouseEvent,
  PointerEvent,
  useCallback,
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
  recipient_id: string | null;
  user_id: string | null;
};

type FavoriteItem = MessageRow & {
  saved_at: string;
};

type ProfileRow = {
  user_id: string;
  display_name: string;
  username: string | null;
  username_changed_at: string | null;
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
  messageId?: number;
  text: string;
};

type FileMessagePayload = {
  name: string;
  size: number;
  type: string;
  url: string;
};

type PinMessagePayload = {
  action: "pin" | "unpin";
  messageId: number;
};

type ReceiptMessagePayload = {
  messageId: number;
  status: "delivered" | "read";
};

type TypingMessagePayload = {
  action?: "start" | "stop";
  eventAt?: string;
  expiresAt?: string;
};

type BlockMessagePayload = {
  action: "block" | "unblock";
  blockedId: string;
};

type ActiveView = "profile" | "messages" | "favorites" | "settings";
type AuthMode = "sign-in" | "sign-up";
type AuthContactMethod = "email" | "phone";
type CallStatus = "idle" | "calling" | "incoming" | "connecting" | "connected";
type MutedProfileUntil = Record<string, number | null>;
type PinnedMessageIdsByChat = Record<string, number[]>;
type StoredNavigationState = {
  activeView?: ActiveView;
  selectedChatUserId?: string | null;
};

const navItems: Array<{ label: string; view: ActiveView }> = [
  { label: "Профиль", view: "profile" },
  { label: "Сообщения", view: "messages" },
  { label: "Избранное", view: "favorites" },
];
const settingsNavItem: { label: string; view: ActiveView } = {
  label: "Настройки",
  view: "settings",
};

const imageMessagePrefix = "image::";
const videoMessagePrefix = "video::";
const audioMessagePrefix = "audio::";
const fileMessagePrefix = "file::";
const callMessagePrefix = "call::";
const stickerMessagePrefix = "sticker::";
const replyMessagePrefix = "reply::";
const pinMessagePrefix = "pin::";
const receiptMessagePrefix = "receipt::";
const typingMessagePrefix = "typing::";
const blockMessagePrefix = "block::";
const maxAttachmentSize = 50 * 1024 * 1024;
const stickerOptions = ["😂", "❤️", "🔥", "🤝", "😎", "😭", "🥱", "😡", "🫡", "💀", "🥳", "🤯", "👍", "👎", "🍻", "✨"];
const profileColumns = "user_id, display_name, username, username_changed_at, avatar_url, name_changed_at, updated_at";
const usernameProfileColumns = "user_id, display_name, username, avatar_url, name_changed_at, updated_at";
const legacyProfileColumns = "user_id, display_name, avatar_url, name_changed_at, updated_at";
const messageColumns = "id, author, text, created_at, user_id, recipient_id";
const usernamePattern = /^[a-z0-9_]{3,24}$/;
const activeViews: ActiveView[] = ["profile", "messages", "favorites", "settings"];

function isActiveView(value: unknown): value is ActiveView {
  return typeof value === "string" && activeViews.includes(value as ActiveView);
}

function readStoredStringList(key: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];

    return Array.isArray(parsedValue)
      ? parsedValue.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeStoredStringList(key: string, value: string[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readStoredBoolean(key: string, defaultValue: boolean) {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  const storedValue = window.localStorage.getItem(key);

  if (storedValue === "true") {
    return true;
  }

  if (storedValue === "false") {
    return false;
  }

  return defaultValue;
}

function writeStoredBoolean(key: string, value: boolean) {
  window.localStorage.setItem(key, String(value));
}

function readStoredMutedProfiles() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem("twinline-muted-profiles");
    const parsedValue = storedValue ? JSON.parse(storedValue) : {};

    if (Array.isArray(parsedValue)) {
      return Object.fromEntries(
        parsedValue
          .filter((item): item is string => typeof item === "string")
          .map((profileId) => [profileId, null]),
      );
    }

    if (!parsedValue || typeof parsedValue !== "object") {
      return {};
    }

    return pruneMutedProfiles(Object.fromEntries(
      Object.entries(parsedValue).filter((entry): entry is [string, number | null] => {
        const [profileId, muteUntil] = entry;

        return (
          typeof profileId === "string" &&
          (muteUntil === null || typeof muteUntil === "number")
        );
      }),
    ));
  } catch {
    return {};
  }
}

function writeStoredMutedProfiles(value: MutedProfileUntil) {
  window.localStorage.setItem("twinline-muted-profiles", JSON.stringify(value));
}

function readStoredPinnedMessageIds(userId: string) {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(`hush-pinned-messages-${userId}`);
    const parsedValue = storedValue ? JSON.parse(storedValue) : {};

    if (!parsedValue || typeof parsedValue !== "object" || Array.isArray(parsedValue)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).map(([chatUserId, ids]) => [
        chatUserId,
        Array.isArray(ids)
          ? ids.filter((id): id is number => Number.isInteger(id))
          : [],
      ]),
    );
  } catch {
    return {};
  }
}

function writeStoredPinnedMessageIds(userId: string, value: PinnedMessageIdsByChat) {
  window.localStorage.setItem(`hush-pinned-messages-${userId}`, JSON.stringify(value));
}

function pruneMutedProfiles(value: MutedProfileUntil) {
  const now = Date.now();

  return Object.fromEntries(
    Object.entries(value).filter(([, muteUntil]) => {
      return muteUntil === null || muteUntil > now;
    }),
  );
}

function isProfileMuted(mutedProfiles: MutedProfileUntil, profileId: string) {
  const muteUntil = mutedProfiles[profileId];

  return muteUntil === null || (typeof muteUntil === "number" && muteUntil > Date.now());
}

function normalizeUsername(username: string) {
  return username.trim().replace(/^@+/, "").toLowerCase();
}

function formatUsernameInput(username: string) {
  return username
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

function getUsernameError(username: string) {
  if (!username) {
    return "Ник обязателен.";
  }

  if (!usernamePattern.test(username)) {
    return "Ник должен быть от 3 до 24 символов: латиница, цифры и подчёркивание.";
  }

  return "";
}

function formatMessageTime(createdAt: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    return "Файл";
  }

  const units = ["Б", "КБ", "МБ", "ГБ"];
  let fileSize = size;
  let unitIndex = 0;

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex += 1;
  }

  return `${fileSize >= 10 || unitIndex === 0 ? Math.round(fileSize) : fileSize.toFixed(1)} ${units[unitIndex]}`;
}

function getSafeFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");

  return extension || "bin";
}

function getAttachmentFolder(file: File) {
  if (file.type.startsWith("image/")) {
    return "images";
  }

  if (file.type.startsWith("video/")) {
    return "videos";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  return "files";
}

function formatLastSeen(updatedAt: string | null) {
  if (!updatedAt) {
    return "был недавно";
  }

  const updatedDate = new Date(updatedAt);
  const updatedTime = updatedDate.getTime();

  if (!Number.isFinite(updatedTime)) {
    return "был недавно";
  }

  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - updatedTime) / 1000));
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffSeconds < 90) {
    return "в сети";
  }

  if (diffMinutes < 60) {
    return `был ${Math.max(1, diffMinutes)} мин. назад`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `был ${diffHours} ч. назад`;
  }

  const today = new Date(now);
  const yesterday = new Date(now);

  yesterday.setDate(today.getDate() - 1);

  const isSameDate = (firstDate: Date, secondDate: Date) =>
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate();

  const formattedTime = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(updatedDate);

  if (isSameDate(updatedDate, today)) {
    return `был сегодня в ${formattedTime}`;
  }

  if (isSameDate(updatedDate, yesterday)) {
    return `был вчера в ${formattedTime}`;
  }

  return `был ${new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(updatedDate)} в ${formattedTime}`;
}

function isProfileOnline(updatedAt: string | null) {
  if (!updatedAt) {
    return false;
  }

  const updatedTime = new Date(updatedAt).getTime();

  return Number.isFinite(updatedTime) && Date.now() - updatedTime < 90_000;
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

function createFileMessageText(payload: FileMessagePayload) {
  return `${fileMessagePrefix}${encodeURIComponent(JSON.stringify(payload))}`;
}

function getMessageFilePayload(text: string): FileMessagePayload | null {
  if (!text.startsWith(fileMessagePrefix)) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(
      decodeURIComponent(text.slice(fileMessagePrefix.length)),
    );

    if (
      parsedPayload &&
      typeof parsedPayload.url === "string" &&
      typeof parsedPayload.name === "string" &&
      typeof parsedPayload.size === "number"
    ) {
      return {
        name: parsedPayload.name,
        size: parsedPayload.size,
        type: typeof parsedPayload.type === "string" ? parsedPayload.type : "",
        url: parsedPayload.url,
      };
    }
  } catch {
    return null;
  }

  return null;
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

function createPinMessageText(messageId: number, action: PinMessagePayload["action"]) {
  return `${pinMessagePrefix}${JSON.stringify({ action, messageId })}`;
}

function getPinMessagePayload(text: string): PinMessagePayload | null {
  if (!text.startsWith(pinMessagePrefix)) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(text.slice(pinMessagePrefix.length));

    if (
      parsedPayload &&
      (parsedPayload.action === "pin" || parsedPayload.action === "unpin") &&
      Number.isInteger(parsedPayload.messageId)
    ) {
      return parsedPayload;
    }
  } catch {
    return null;
  }

  return null;
}

function createReceiptMessageText(
  messageId: number,
  status: ReceiptMessagePayload["status"],
) {
  return `${receiptMessagePrefix}${JSON.stringify({ messageId, status })}`;
}

function getReceiptMessagePayload(text: string): ReceiptMessagePayload | null {
  if (!text.startsWith(receiptMessagePrefix)) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(text.slice(receiptMessagePrefix.length));

    if (
      parsedPayload &&
      Number.isInteger(parsedPayload.messageId) &&
      (parsedPayload.status === "delivered" || parsedPayload.status === "read")
    ) {
      return parsedPayload;
    }
  } catch {
    return null;
  }

  return null;
}

function createTypingMessageText(action: "start" | "stop", eventAt: string) {
  return `${typingMessagePrefix}${JSON.stringify({
    action,
    eventAt,
  } satisfies TypingMessagePayload)}`;
}

function getTypingMessagePayload(text: string): TypingMessagePayload | null {
  if (!text.startsWith(typingMessagePrefix)) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(text.slice(typingMessagePrefix.length));

    if (
      parsedPayload &&
      (!parsedPayload.action ||
        parsedPayload.action === "start" ||
        parsedPayload.action === "stop") &&
      (!parsedPayload.expiresAt ||
        (typeof parsedPayload.expiresAt === "string" &&
          Number.isFinite(new Date(parsedPayload.expiresAt).getTime()))) &&
      (!parsedPayload.eventAt ||
        (typeof parsedPayload.eventAt === "string" &&
          Number.isFinite(new Date(parsedPayload.eventAt).getTime())))
    ) {
      return parsedPayload as TypingMessagePayload;
    }
  } catch {
    return null;
  }

  return null;
}

function createBlockMessageText(blockedId: string, action: BlockMessagePayload["action"]) {
  return `${blockMessagePrefix}${JSON.stringify({ action, blockedId })}`;
}

function getBlockMessagePayload(text: string): BlockMessagePayload | null {
  if (!text.startsWith(blockMessagePrefix)) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(text.slice(blockMessagePrefix.length));

    if (
      parsedPayload &&
      typeof parsedPayload.blockedId === "string" &&
      (parsedPayload.action === "block" || parsedPayload.action === "unblock")
    ) {
      return parsedPayload;
    }
  } catch {
    return null;
  }

  return null;
}

function isServiceMessage(text: string) {
  return Boolean(
    getPinMessagePayload(text) ||
      getReceiptMessagePayload(text) ||
      getTypingMessagePayload(text) ||
      getBlockMessagePayload(text),
  );
}

function getReadableMessageText(text: string) {
  const reply = getMessageReply(text);

  if (reply) {
    return reply.body;
  }

  if (isServiceMessage(text)) {
    return "Служебное событие";
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

  if (text.startsWith(fileMessagePrefix)) {
    return getMessageFilePayload(text)?.name ?? "Файл";
  }

  if (text.startsWith(callMessagePrefix)) {
    return "Звонок";
  }

  if (text.startsWith(stickerMessagePrefix)) {
    return getMessageSticker(text) ?? "Стикер";
  }

  return text;
}

function getNotificationMessageText(text: string) {
  const reply = getMessageReply(text);

  if (reply) {
    return `Ответ: ${reply.body}`;
  }

  if (text.startsWith(imageMessagePrefix)) {
    return "Отправлено изображение";
  }

  if (text.startsWith(videoMessagePrefix)) {
    return "Отправлено видео";
  }

  if (text.startsWith(audioMessagePrefix)) {
    return "Голосовое сообщение";
  }

  if (text.startsWith(fileMessagePrefix)) {
    const filePayload = getMessageFilePayload(text);

    return filePayload ? `Файл: ${filePayload.name}` : "Отправлен файл";
  }

  if (text.startsWith(callMessagePrefix)) {
    return "Звонок завершен";
  }

  if (text.startsWith(stickerMessagePrefix)) {
    return "Стикер";
  }

  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function getChatPreviewText(text: string) {
  const reply = getMessageReply(text);
  const previewText = reply?.body ?? text;

  if (previewText.startsWith(imageMessagePrefix)) {
    return "Фото";
  }

  if (previewText.startsWith(videoMessagePrefix)) {
    return "Видео";
  }

  if (previewText.startsWith(audioMessagePrefix)) {
    return "Голосовое сообщение";
  }

  if (previewText.startsWith(fileMessagePrefix)) {
    const filePayload = getMessageFilePayload(previewText);

    return filePayload ? `Файл: ${filePayload.name}` : "Файл";
  }

  if (previewText.startsWith(callMessagePrefix)) {
    return "Звонок";
  }

  if (previewText.startsWith(stickerMessagePrefix)) {
    return `Стикер ${getMessageSticker(previewText) ?? ""}`.trim();
  }

  return getReadableMessageText(text);
}

function createReplyMessageText(replyTarget: MessageRow, body: string) {
  return `${replyMessagePrefix}${encodeURIComponent(
    JSON.stringify({
      author: replyTarget.author,
      body,
      messageId: replyTarget.id,
      text: getReadableMessageText(replyTarget.text).slice(0, 140),
    } satisfies ReplyMessagePayload),
  )}`;
}

function updateReplyMessageBody(text: string, body: string) {
  const reply = getMessageReply(text);

  if (!reply) {
    return body;
  }

  return `${replyMessagePrefix}${encodeURIComponent(
    JSON.stringify({
      ...reply,
      body,
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

function getCenteredCallPanelPosition(isCollapsed: boolean) {
  if (typeof window === "undefined") {
    return { left: 0, top: 0 };
  }

  const panelWidth = isCollapsed ? 260 : 350;
  const panelHeight = isCollapsed ? 92 : 310;

  return clampPanelPosition(
    {
      left: (window.innerWidth - panelWidth) / 2,
      top: (window.innerHeight - panelHeight) / 2,
    },
    isCollapsed,
  );
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

function isDirectMessageForUser(message: MessageRow, userId: string) {
  return message.user_id === userId || message.recipient_id === userId;
}

function isMessageBetweenUsers(message: MessageRow, firstUserId: string, secondUserId: string) {
  return (
    (message.user_id === firstUserId && message.recipient_id === secondUserId) ||
    (message.user_id === secondUserId && message.recipient_id === firstUserId)
  );
}

async function fetchMessages(userId: string) {
  return supabase
    .from("messages")
    .select(messageColumns)
    .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: true });
}

async function fetchMessagesAfter(createdAt: string, userId: string) {
  return supabase
    .from("messages")
    .select(messageColumns)
    .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
    .gt("created_at", createdAt)
    .order("created_at", { ascending: true });
}

async function fetchProfiles() {
  const profilesWithUsername = await supabase
    .from("profiles")
    .select(profileColumns);

  if (!profilesWithUsername.error) {
    return profilesWithUsername;
  }

  const profilesWithoutUsernameDate = await supabase
    .from("profiles")
    .select(usernameProfileColumns);

  if (!profilesWithoutUsernameDate.error) {
    return {
      ...profilesWithoutUsernameDate,
      data: profilesWithoutUsernameDate.data?.map((profile) => ({
        ...profile,
        username_changed_at: null,
      })) ?? null,
    };
  }

  const legacyProfiles = await supabase
    .from("profiles")
    .select(legacyProfileColumns);

  return {
    ...legacyProfiles,
    data: legacyProfiles.data?.map((profile) => ({
      ...profile,
      username: null,
      username_changed_at: null,
    })) ?? null,
  };
}

async function fetchUsernameOwner(username: string) {
  return supabase
    .from("profiles")
    .select("user_id, username")
    .eq("username", username)
    .maybeSingle();
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

function VoiceMessage({
  isMine,
  sentAt,
  src,
}: {
  isMine: boolean;
  sentAt: string;
  src: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const progress = duration ? Math.min(1, currentTime / duration) : 0;
  const waveBars = [
    12, 18, 10, 24, 32, 22, 30, 16, 26, 20, 34, 28, 14, 24, 18, 30, 22, 16,
    26, 20, 32, 18, 24, 14, 28, 22, 30, 18, 12, 20, 16, 24, 14, 18,
  ];

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
    <div
      className={`min-w-[min(320px,70vw)] rounded-2xl px-3 py-2 ${
        isMine ? "bg-[#2f2f2f] text-[#f4f4f5]" : "bg-[#262626] text-[#f4f4f5]"
      }`}
    >
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
      <div className="flex items-center gap-3">
        <button
          aria-label={isPlaying ? "Пауза" : "Воспроизвести голосовое"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f4f4f5] text-[#050505] shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition hover:scale-105"
          onClick={togglePlayback}
          type="button"
        >
          {isPlaying ? (
            <span className="h-4 w-3 border-x-4 border-[#050505]" />
          ) : (
            <span className="ml-0.5 h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-[#050505]" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="relative h-8">
            <div
              aria-hidden="true"
              className="absolute inset-0 flex items-center gap-[2px] overflow-hidden"
            >
              {waveBars.map((height, index) => {
                const isPlayed = index / waveBars.length <= progress;

                return (
                  <span
                    className={`w-[3px] rounded-full transition-colors ${
                      isPlayed ? "bg-[#f4f4f5]" : "bg-[#f4f4f5]/38"
                    }`}
                    key={`${height}-${index}`}
                    style={{ height }}
                  />
                );
              })}
            </div>
            <input
              aria-label="Позиция голосового сообщения"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              max={duration || 0}
              min="0"
              onChange={seekAudio}
              step="0.1"
              type="range"
              value={currentTime}
            />
          </div>
          <p className="mt-0.5 flex items-center justify-between gap-3 text-xs font-medium tabular-nums opacity-65">
            <span>{formatAudioTime(currentTime || duration)}</span>
            <span>{formatMessageTime(sentAt)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function FileAttachment({
  file,
  isMine,
}: {
  file: FileMessagePayload;
  isMine: boolean;
}) {
  async function downloadFile(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    try {
      const response = await fetch(file.url);

      if (!response.ok) {
        window.open(file.url, "_blank", "noopener,noreferrer");
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = file.name || "file";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      window.open(file.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div
      className={`flex w-[min(360px,78vw)] items-center gap-3 rounded-[18px] border px-3 py-2.5 text-left shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition hover:scale-[1.01] sm:rounded-[20px] ${
        isMine
          ? "border-[#3f3f46]/45 bg-[#1f1f1f] text-[#f4f4f5] hover:bg-[#262626]"
          : "border-white/10 bg-white/[0.06] text-[#f4f4f5] hover:bg-white/10"
      }`}
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          isMine ? "bg-[#050505] text-[#f4f4f5]" : "bg-[#f4f4f5] text-[#050505]"
        }`}
      >
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path d="M7 3h7l5 5v13H7V3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
          <path d="M14 3v6h5M9.5 14h5M9.5 17h5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold leading-5">
          {file.name}
        </span>
        <span className="block truncate text-xs font-medium opacity-60">
          {formatFileSize(file.size)}
          {file.type ? ` · ${file.type}` : ""}
        </span>
      </span>
      <button
        aria-label={`Скачать ${file.name}`}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-[#f4f4f5] transition hover:scale-105 hover:bg-white/12"
        onClick={downloadFile}
        title="Скачать"
        type="button"
      >
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("sign-in");
  const [authContactMethod, setAuthContactMethod] = useState<AuthContactMethod>("email");
  const [authUsername, setAuthUsername] = useState("");
  const [authUsernameError, setAuthUsernameError] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [profileName, setProfileName] = useState("");
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [profileUsernameError, setProfileUsernameError] = useState("");
  const [messageText, setMessageText] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [avatarHistory, setAvatarHistory] = useState<string[]>([]);
  const [avatarGalleryItems, setAvatarGalleryItems] = useState<string[]>([]);
  const [avatarGalleryIndex, setAvatarGalleryIndex] = useState<number | null>(null);
  const [canDeleteAvatarFromGallery, setCanDeleteAvatarFromGallery] = useState(false);
  const [isAvatarDeleteDialogOpen, setIsAvatarDeleteDialogOpen] = useState(false);
  const [typingNow, setTypingNow] = useState(() => Date.now());
  const [activeView, setActiveView] = useState<ActiveView>("profile");
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [viewedProfile, setViewedProfile] = useState<{
    avatarUrl: string | null;
    name: string;
    username: string | null;
    updatedAt: string | null;
    userId: string | null;
  } | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordingDuration, setVoiceRecordingDuration] = useState(0);
  const [voiceRecordingStartedAt, setVoiceRecordingStartedAt] = useState<number | null>(null);
  const [voiceInputLevel, setVoiceInputLevel] = useState(0);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null);
  const [isCallMicMuted, setIsCallMicMuted] = useState(false);
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallPanelCollapsed, setIsCallPanelCollapsed] = useState(false);
  const [callPanelPosition, setCallPanelPosition] = useState({ left: 0, top: 0 });
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [stickerPickerPosition, setStickerPickerPosition] = useState({ left: 0, top: 0 });
  const [messageContextMenu, setMessageContextMenu] = useState<{
    left: number;
    message: MessageRow;
    top: number;
  } | null>(null);
  const [favoriteContextMenu, setFavoriteContextMenu] = useState<{
    item: FavoriteItem;
    left: number;
    top: number;
  } | null>(null);
  const [chatContextMenu, setChatContextMenu] = useState<{
    left: number;
    profile: ProfileRow;
    top: number;
  } | null>(null);
  const [replyTarget, setReplyTarget] = useState<MessageRow | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageRow | null>(null);
  const [pinnedMessageIdsByChat, setPinnedMessageIdsByChat] = useState<PinnedMessageIdsByChat>({});
  const [isPinnedMessagesViewOpen, setIsPinnedMessagesViewOpen] = useState(false);
  const [isUnpinAllDialogOpen, setIsUnpinAllDialogOpen] = useState(false);
  const [pinnedNavigationIndex, setPinnedNavigationIndex] = useState(0);
  const [pinnedFavoriteItem, setPinnedFavoriteItem] = useState<FavoriteItem | null>(null);
  const [messagePinTarget, setMessagePinTarget] = useState<MessageRow | null>(null);
  const [shouldPinForBoth, setShouldPinForBoth] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<number[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<number[]>([]);
  const [messageDeleteTarget, setMessageDeleteTarget] = useState<MessageRow | null>(null);
  const [isSelectedDeleteDialogOpen, setIsSelectedDeleteDialogOpen] = useState(false);
  const [isChatDeleteDialogOpen, setIsChatDeleteDialogOpen] = useState(false);
  const [chatDeleteTargetUserId, setChatDeleteTargetUserId] = useState<string | null>(null);
  const [areNotificationsEnabled, setAreNotificationsEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("twinline-notifications") === "enabled";
  });
  const [isOnlineStatusVisible, setIsOnlineStatusVisible] = useState(() =>
    readStoredBoolean("hush-settings-online-status-visible", true),
  );
  const [isPhoneVisible, setIsPhoneVisible] = useState(() =>
    readStoredBoolean("hush-settings-phone-visible", false),
  );
  const [isProfileSearchable, setIsProfileSearchable] = useState(() =>
    readStoredBoolean("hush-settings-profile-searchable", true),
  );
  const [areSoftEffectsEnabled, setAreSoftEffectsEnabled] = useState(() =>
    readStoredBoolean("hush-settings-soft-effects", true),
  );
  const [isLightThemeEnabled, setIsLightThemeEnabled] = useState(() =>
    readStoredBoolean("hush-settings-light-theme", false),
  );
  const [mutedProfiles, setMutedProfiles] = useState<MutedProfileUntil>(() =>
    readStoredMutedProfiles(),
  );
  const [localBlockedProfileIds, setLocalBlockedProfileIds] = useState<string[]>(() =>
    readStoredStringList("twinline-blocked-profiles"),
  );
  const [profileNotificationMenuUserId, setProfileNotificationMenuUserId] = useState<string | null>(null);
  const [blockConfirmation, setBlockConfirmation] = useState<{
    action: "block" | "unblock";
    targetLabel: string;
    userId: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesListRef = useRef<HTMLDivElement | null>(null);
  const stickerButtonRef = useRef<HTMLButtonElement | null>(null);
  const highlightedMessageTimeoutRef = useRef<number | null>(null);
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
  const currentProfileRef = useRef<ProfileRow | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const shouldDiscardRecordingRef = useRef(false);
  const recordingAudioContextRef = useRef<AudioContext | null>(null);
  const recordingAnimationFrameRef = useRef<number | null>(null);
  const sentDeliveryReceiptIdsRef = useRef<Set<number>>(new Set());
  const sentReadReceiptIdsRef = useRef<Set<number>>(new Set());
  const typingSentAtRef = useRef(0);
  const latestMessageCreatedAtRef = useRef<string | null>(null);
  const notificationsEnabledRef = useRef(false);
  const mutedProfilesRef = useRef<MutedProfileUntil>({});
  const blockedProfileIdsRef = useRef<Set<string>>(new Set());
  const activeViewRef = useRef<ActiveView>("profile");
  const selectedChatUserIdRef = useRef<string | null>(null);
  const hasRestoredNavigationRef = useRef(false);
  const restoredNavigationUserIdRef = useRef<string | null>(null);
  const notifiedMessageIdsRef = useRef<Set<number>>(new Set());
  const originalPageTitleRef = useRef("Hush");
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
  const profilesByUserId = useMemo(() => {
    const nextProfilesByUserId = new Map<string, ProfileRow>();

    for (const profile of profiles) {
      nextProfilesByUserId.set(profile.user_id, profile);
    }

    return nextProfilesByUserId;
  }, [profiles]);
  const hiddenMessageIdSet = useMemo(() => {
    return new Set(hiddenMessageIds);
  }, [hiddenMessageIds]);
  const selectedMessageIdSet = useMemo(() => {
    return new Set(selectedMessageIds);
  }, [selectedMessageIds]);

  useEffect(() => {
    currentProfileRef.current = currentProfile;
  }, [currentProfile]);
  const activeUserName = useMemo(() => {
    return currentProfile?.display_name ?? getDisplayName(user);
  }, [currentProfile?.display_name, user]);
  const sendServiceMessage = useCallback(
    async (text: string, recipientId = selectedChatUserId) => {
      if (!user) {
        return;
      }

      if (!recipientId) {
        return;
      }

      await supabase.from("messages").insert({
        author: activeUserName,
        recipient_id: recipientId,
        text,
        user_id: user.id,
      });
    },
    [activeUserName, selectedChatUserId, user],
  );
  const sendTypingState = useCallback(
    async (action: "start" | "stop") => {
      if (!user || !selectedChatUserId) {
        return;
      }

      const eventAt = new Date().toISOString();

      const { error } = await supabase.from("messages").insert({
        author: activeUserName,
        recipient_id: selectedChatUserId,
        text: createTypingMessageText(action, eventAt),
        user_id: user.id,
      });

      if (error) {
        console.error("Hush typing state failed:", error.message);
      }
    },
    [activeUserName, selectedChatUserId, user],
  );
  const sharedPinnedMessageIds = useMemo(() => {
    const pinnedIds = new Map<number, PinMessagePayload["action"]>();

    for (const message of messages) {
      const pinPayload = getPinMessagePayload(message.text);

      if (pinPayload) {
        pinnedIds.set(pinPayload.messageId, pinPayload.action);
      }
    }

    return new Set(
      Array.from(pinnedIds.entries())
        .filter(([, action]) => action === "pin")
        .map(([messageId]) => messageId),
    );
  }, [messages]);
  const sharedPinnedMessageIdSet = useMemo(() => {
    return new Set(sharedPinnedMessageIds);
  }, [sharedPinnedMessageIds]);
  const messageReceiptStatuses = useMemo(() => {
    const statuses = new Map<number, ReceiptMessagePayload["status"]>();

    for (const message of messages) {
      const receiptPayload = getReceiptMessagePayload(message.text);

      if (!receiptPayload || message.user_id === user?.id) {
        continue;
      }

      const currentStatus = statuses.get(receiptPayload.messageId);

      if (receiptPayload.status === "read" || currentStatus !== "read") {
        statuses.set(receiptPayload.messageId, receiptPayload.status);
      }
    }

    return statuses;
  }, [messages, user?.id]);
  const sentReceiptMessageIdSets = useMemo(() => {
    const deliveredMessageIds = new Set<number>();
    const readMessageIds = new Set<number>();

    if (!user) {
      return { deliveredMessageIds, readMessageIds };
    }

    for (const message of messages) {
      const receiptPayload = getReceiptMessagePayload(message.text);

      if (!receiptPayload || message.user_id !== user.id) {
        continue;
      }

      if (receiptPayload.status === "delivered" || receiptPayload.status === "read") {
        deliveredMessageIds.add(receiptPayload.messageId);
      }

      if (receiptPayload.status === "read") {
        readMessageIds.add(receiptPayload.messageId);
      }
    }

    return { deliveredMessageIds, readMessageIds };
  }, [messages, user]);
  const incomingUnreadMessageIds = useMemo(() => {
    if (!user) {
      return new Set<number>();
    }

    const readMessageIds = new Set<number>();

    for (const message of messages) {
      const receiptPayload = getReceiptMessagePayload(message.text);

      if (
        message.user_id === user.id &&
        receiptPayload?.status === "read"
      ) {
        readMessageIds.add(receiptPayload.messageId);
      }
    }

    return new Set(
      messages
        .filter((message) => {
          return (
            message.id > 0 &&
            message.user_id &&
            isDirectMessageForUser(message, user.id) &&
            message.user_id !== user.id &&
            !hiddenMessageIdSet.has(message.id) &&
            !isServiceMessage(message.text) &&
            !readMessageIds.has(message.id)
          );
        })
        .map((message) => message.id),
    );
  }, [hiddenMessageIdSet, messages, user]);
  const unreadMessageCountFromReceipts = incomingUnreadMessageIds.size;
  const totalUnreadMessageCount = Math.max(
    unreadMessageCount,
    unreadMessageCountFromReceipts,
  );
  const friendTypingUntilFromMessages = useMemo(() => {
    if (!user || !selectedChatUserId) {
      return 0;
    }

    let latestFriendTypingCreatedAt = 0;
    let latestFriendTypingExpiresAt = 0;
    let latestFriendRealMessageCreatedAt = 0;

    for (const message of messages) {
      if (
        message.user_id !== selectedChatUserId ||
        message.recipient_id !== user.id
      ) {
        continue;
      }

      const createdAt = new Date(message.created_at).getTime();
      const typingPayload = getTypingMessagePayload(message.text);

      if (typingPayload) {
        if (createdAt >= latestFriendTypingCreatedAt) {
          latestFriendTypingCreatedAt = createdAt;
          latestFriendTypingExpiresAt =
            typingPayload.action === "stop"
              ? 0
              : createdAt + 4500;
        }

        continue;
      }

      if (!isServiceMessage(message.text)) {
        latestFriendRealMessageCreatedAt = Math.max(
          latestFriendRealMessageCreatedAt,
          createdAt,
        );
      }
    }

    if (
      !latestFriendTypingExpiresAt ||
      latestFriendTypingCreatedAt <= latestFriendRealMessageCreatedAt
    ) {
      return 0;
    }

    return latestFriendTypingExpiresAt;
  }, [messages, selectedChatUserId, user]);
  const isFriendTyping = friendTypingUntilFromMessages > typingNow;
  const blockState = useMemo(() => {
    const blockedByMeIds = new Set<string>();
    const blockedMeIds = new Set<string>();

    for (const message of messages) {
      const blockPayload = getBlockMessagePayload(message.text);

      if (!blockPayload || !message.user_id || !user?.id) {
        continue;
      }

      if (!isDirectMessageForUser(message, user.id)) {
        continue;
      }

      if (message.user_id === user.id) {
        if (blockPayload.action === "block") {
          blockedByMeIds.add(blockPayload.blockedId);
        } else {
          blockedByMeIds.delete(blockPayload.blockedId);
        }
      }

      if (blockPayload.blockedId === user.id) {
        if (blockPayload.action === "block") {
          blockedMeIds.add(message.user_id);
        } else {
          blockedMeIds.delete(message.user_id);
        }
      }
    }

    return {
      blockedByMeIds: Array.from(blockedByMeIds),
      blockedMeIds: Array.from(blockedMeIds),
    };
  }, [messages, user?.id]);
  const blockedProfileIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...localBlockedProfileIds,
          ...blockState.blockedByMeIds,
          ...blockState.blockedMeIds,
        ]),
      ),
    [blockState.blockedByMeIds, blockState.blockedMeIds, localBlockedProfileIds],
  );
  const blockedByMeProfileIds = useMemo(
    () => Array.from(new Set([...localBlockedProfileIds, ...blockState.blockedByMeIds])),
    [blockState.blockedByMeIds, localBlockedProfileIds],
  );
  const blockedByMeProfiles = useMemo(() => {
    return blockedByMeProfileIds
      .map((profileId) => {
        const profile = profilesByUserId.get(profileId);

        return {
          avatarUrl: profile?.avatar_url ?? null,
          name: profile?.display_name ?? "Пользователь",
          username: profile?.username ?? null,
          userId: profileId,
        };
      })
      .sort((firstProfile, secondProfile) =>
        firstProfile.name.localeCompare(secondProfile.name, "ru"),
      );
  }, [blockedByMeProfileIds, profilesByUserId]);
  const visibleMessages = useMemo(() => {
    return messages.filter((message) => {
      return (
        user?.id &&
        isDirectMessageForUser(message, user.id) &&
        !hiddenMessageIdSet.has(message.id) &&
        !isServiceMessage(message.text)
      );
    });
  }, [hiddenMessageIdSet, messages, user?.id]);
  const activeDialogMessages = useMemo(() => {
    if (!user || !selectedChatUserId) {
      return [];
    }

    return visibleMessages.filter((message) => {
      return isMessageBetweenUsers(message, user.id, selectedChatUserId);
    });
  }, [selectedChatUserId, user, visibleMessages]);
  const selectedDialogMessages = useMemo(() => {
    if (!selectedChatUserId) {
      return [];
    }

    return activeDialogMessages.filter((message) => selectedMessageIdSet.has(message.id));
  }, [activeDialogMessages, selectedChatUserId, selectedMessageIdSet]);
  const isMessageSelectionMode = selectedDialogMessages.length > 0;
  const activePinnedMessageIdSet = useMemo(() => {
    const activeLocalPinnedMessageIds = selectedChatUserId
      ? pinnedMessageIdsByChat[selectedChatUserId] ?? []
      : [];

    return new Set([
      ...activeLocalPinnedMessageIds,
      ...Array.from(sharedPinnedMessageIdSet),
    ]);
  }, [pinnedMessageIdsByChat, selectedChatUserId, sharedPinnedMessageIdSet]);
  const activePinnedMessages = useMemo(() => {
    return activeDialogMessages.filter((message) => activePinnedMessageIdSet.has(message.id));
  }, [activeDialogMessages, activePinnedMessageIdSet]);

  const visibleDialogMessages = isPinnedMessagesViewOpen
    ? activePinnedMessages
    : activeDialogMessages;
  const visibleDialogMessagesCount = visibleDialogMessages.length;
  const unreadMessagesByUserId = useMemo(() => {
    const unreadByUserId = new Map<string, number>();

    for (const message of visibleMessages) {
      if (
        message.user_id &&
        message.user_id !== user?.id &&
        incomingUnreadMessageIds.has(message.id)
      ) {
        unreadByUserId.set(
          message.user_id,
          (unreadByUserId.get(message.user_id) ?? 0) + 1,
        );
      }
    }

    return unreadByUserId;
  }, [incomingUnreadMessageIds, user?.id, visibleMessages]);
  const dialogProfileIds = useMemo(() => {
    const profileIds = new Set<string>();

    if (!user) {
      return profileIds;
    }

    for (const message of visibleMessages) {
      const profileId =
        message.user_id === user.id ? message.recipient_id : message.user_id;

      if (profileId && profileId !== user.id) {
        profileIds.add(profileId);
      }
    }

    return profileIds;
  }, [user, visibleMessages]);
  const latestVisibleMessageByProfileId = useMemo(() => {
    const latestMessagesByProfileId = new Map<string, MessageRow>();

    if (!user) {
      return latestMessagesByProfileId;
    }

    for (const message of visibleMessages) {
      const profileId =
        message.user_id === user.id ? message.recipient_id : message.user_id;

      if (profileId && profileId !== user.id) {
        latestMessagesByProfileId.set(profileId, message);
      }
    }

    return latestMessagesByProfileId;
  }, [user, visibleMessages]);
  const chatProfiles = useMemo(() => {
    return profiles
      .filter((profile) => profile.user_id !== user?.id && dialogProfileIds.has(profile.user_id))
      .sort((firstProfile, secondProfile) =>
        firstProfile.display_name.localeCompare(secondProfile.display_name, "ru"),
      );
  }, [dialogProfileIds, profiles, user?.id]);
  const searchableProfiles = useMemo(() => {
    const query = chatSearchQuery.trim().replace(/^@+/, "").toLowerCase();

    if (query.length < 2) {
      return [];
    }

    return profiles
      .filter((profile) => {
        if (profile.user_id === user?.id) {
          return false;
        }

        const username = profile.username?.toLowerCase() ?? "";

        return username.includes(query);
      })
      .sort((firstProfile, secondProfile) => {
        const firstUsername = firstProfile.username?.toLowerCase() ?? "";
        const secondUsername = secondProfile.username?.toLowerCase() ?? "";
        const firstStartsWithQuery = firstUsername.startsWith(query) ? 0 : 1;
        const secondStartsWithQuery = secondUsername.startsWith(query) ? 0 : 1;

        if (firstStartsWithQuery !== secondStartsWithQuery) {
          return firstStartsWithQuery - secondStartsWithQuery;
        }

        return firstProfile.display_name.localeCompare(secondProfile.display_name, "ru");
      })
      .slice(0, 8);
  }, [chatSearchQuery, profiles, user?.id]);
  const friendProfile = useMemo(() => {
    if (!selectedChatUserId) {
      return null;
    }

    const profileFriend = profilesByUserId.get(selectedChatUserId);

    if (profileFriend) {
      return {
        avatarUrl: profileFriend.avatar_url,
        name: profileFriend.display_name,
        username: profileFriend.username,
        updatedAt: profileFriend.updated_at,
        userId: profileFriend.user_id,
      };
    }

    const friendMessage = visibleMessages.find((message) =>
      isMessageBetweenUsers(message, user?.id ?? "", selectedChatUserId),
    );

    if (!friendMessage) {
      return null;
    }

    const profile = friendMessage.user_id ? profilesByUserId.get(friendMessage.user_id) : null;

    return {
      avatarUrl: profile?.avatar_url ?? null,
      name: profile?.display_name ?? friendMessage.author,
      username: profile?.username ?? null,
      updatedAt: profile?.updated_at ?? null,
      userId: friendMessage.user_id,
    };
  }, [profilesByUserId, selectedChatUserId, user?.id, visibleMessages]);
  const isSelectedChatBlockedByMe =
    selectedChatUserId !== null && blockedByMeProfileIds.includes(selectedChatUserId);
  const isSelectedChatBlockingMe =
    selectedChatUserId !== null && blockState.blockedMeIds.includes(selectedChatUserId);
  const isSelectedChatBlocked = isSelectedChatBlockedByMe || isSelectedChatBlockingMe;
  const chatDeleteTargetProfile = useMemo(() => {
    const targetUserId = chatDeleteTargetUserId ?? selectedChatUserId;

    if (!targetUserId) {
      return null;
    }

    const profile = profilesByUserId.get(targetUserId);

    return {
      name: profile?.display_name ?? friendProfile?.name ?? "Текущий чат",
      userId: targetUserId,
    };
  }, [chatDeleteTargetUserId, friendProfile?.name, profilesByUserId, selectedChatUserId]);
  const isUsernameChangeAllowed = canChangeName(currentProfile?.username_changed_at ?? null);
  const nextUsernameChangeDate = getNextNameChangeDate(
    currentProfile?.username_changed_at ?? null,
  );
  const profileNameInputValue = profileName || activeUserName;
  const profileUsernameInputValue = profileUsername ?? currentProfile?.username ?? "";
  const avatarGalleryUrl =
    avatarGalleryIndex !== null ? avatarGalleryItems[avatarGalleryIndex] ?? null : null;
  const isAvatarGalleryOpen = avatarGalleryIndex !== null && Boolean(avatarGalleryUrl);
  const incomingCallerProfile = incomingCall
    ? profilesByUserId.get(incomingCall.sender_id)
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

  function restoreNavigationForUser(nextUser: User | null) {
    if (!nextUser) {
      hasRestoredNavigationRef.current = false;
      restoredNavigationUserIdRef.current = null;
      setActiveView("profile");
      setSelectedChatUserId(null);
      return;
    }

    if (
      hasRestoredNavigationRef.current &&
      restoredNavigationUserIdRef.current === nextUser.id
    ) {
      return;
    }

    hasRestoredNavigationRef.current = false;
    restoredNavigationUserIdRef.current = nextUser.id;

    const storedNavigation = window.localStorage.getItem(
      "hush-navigation-" + nextUser.id,
    );

    if (!storedNavigation) {
      hasRestoredNavigationRef.current = true;
      return;
    }

    try {
      const parsedNavigation = JSON.parse(storedNavigation) as StoredNavigationState;
      const restoredView = isActiveView(parsedNavigation.activeView)
        ? parsedNavigation.activeView
        : "profile";
      const restoredChatUserId =
        typeof parsedNavigation.selectedChatUserId === "string"
          ? parsedNavigation.selectedChatUserId
          : null;

      flushSync(() => {
        setActiveView(restoredView);
        setSelectedChatUserId(restoredView === "messages" ? restoredChatUserId : null);
      });
    } catch {
      flushSync(() => {
        setActiveView("profile");
        setSelectedChatUserId(null);
      });
    } finally {
      hasRestoredNavigationRef.current = true;
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null;

      restoreNavigationForUser(sessionUser);
      setUser(sessionUser);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;

      restoreNavigationForUser(sessionUser);
      setUser(sessionUser);
      setMessages([]);
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
    const frameId = window.requestAnimationFrame(() => {
    if (!user) {
      setAvatarHistory([]);
      setAvatarGalleryItems([]);
      setCanDeleteAvatarFromGallery(false);
      setAvatarGalleryIndex(null);
      return;
    }

    const storedAvatarHistory = readStoredStringList(`hush-avatar-history-${user.id}`);
    const nextAvatarHistory = currentProfile?.avatar_url
      ? [
          currentProfile.avatar_url,
          ...storedAvatarHistory.filter((url) => url !== currentProfile.avatar_url),
        ].slice(0, 20)
      : storedAvatarHistory;

    setAvatarHistory(nextAvatarHistory);
    window.localStorage.setItem(
      `hush-avatar-history-${user.id}`,
      JSON.stringify(nextAvatarHistory),
    );
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [currentProfile?.avatar_url, user]);

  useEffect(() => {
    if (!user || !hasRestoredNavigationRef.current) {
      return;
    }

    window.localStorage.setItem(
      `hush-navigation-${user.id}`,
      JSON.stringify({
        activeView,
        selectedChatUserId: activeView === "messages" ? selectedChatUserId : null,
      }),
    );
  }, [activeView, selectedChatUserId, user]);

  useEffect(() => {
    if (activeView !== "messages" || selectedChatUserId === null) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const messagesList = messagesListRef.current;

      if (!messagesList) {
        return;
      }

      messagesList.scrollTop = messagesList.scrollHeight;
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeDialogMessages.length, activeView, isLoadingMessages, selectedChatUserId]);

  useEffect(() => {
    if (activeView !== "favorites") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      const messagesList = messagesListRef.current;

      if (!messagesList) {
        return;
      }

      messagesList.scrollTop = messagesList.scrollHeight;
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeView, favoriteItems.length]);

  useEffect(() => {
    return () => {
      if (highlightedMessageTimeoutRef.current !== null) {
        window.clearTimeout(highlightedMessageTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    let frameId = 0;

    if (!user) {
      frameId = window.requestAnimationFrame(() => {
        setFavoriteItems([]);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    frameId = window.requestAnimationFrame(() => {
      const storedFavoriteItems = window.localStorage.getItem(
        `hush-favorites-${user.id}`,
      );

      if (!storedFavoriteItems) {
        setFavoriteItems([]);
        return;
      }

      try {
        const parsedFavoriteItems = JSON.parse(storedFavoriteItems);

        setFavoriteItems(
          Array.isArray(parsedFavoriteItems)
            ? parsedFavoriteItems
                .filter((item): item is FavoriteItem => {
                  const favoriteItem = item as FavoriteItem;

                  return (
                    favoriteItem !== null &&
                    typeof favoriteItem === "object" &&
                    Number.isInteger(favoriteItem.id) &&
                    typeof favoriteItem.author === "string" &&
                    typeof favoriteItem.text === "string" &&
                    typeof favoriteItem.created_at === "string" &&
                    typeof favoriteItem.saved_at === "string"
                  );
                })
                .map((item) => ({
                  ...item,
                  recipient_id: item.recipient_id ?? user.id,
                  user_id: item.user_id ?? user.id,
                }))
                .sort((firstItem, secondItem) =>
                  firstItem.created_at.localeCompare(secondItem.created_at),
                )
            : [],
        );
      } catch {
        setFavoriteItems([]);
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [user]);

  useEffect(() => {
    let frameId = 0;

    if (!user) {
      frameId = window.requestAnimationFrame(() => {
        setPinnedMessageIdsByChat({});
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    frameId = window.requestAnimationFrame(() => {
      setPinnedMessageIdsByChat(readStoredPinnedMessageIds(user.id));
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [user]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsPinnedMessagesViewOpen(false);
      setPinnedNavigationIndex(0);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [selectedChatUserId]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setSelectedMessageIds([]);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeView, selectedChatUserId]);

  useEffect(() => {
    if (pinnedNavigationIndex >= activePinnedMessages.length) {
      const frameId = window.requestAnimationFrame(() => {
        setPinnedNavigationIndex(0);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }
  }, [activePinnedMessages.length, pinnedNavigationIndex]);

  useEffect(() => {
    let frameId = 0;

    if (!user) {
      frameId = window.requestAnimationFrame(() => {
        setHiddenMessageIds([]);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    frameId = window.requestAnimationFrame(() => {
      const storedHiddenMessageIds = window.localStorage.getItem(
        `twinline-hidden-messages-${user.id}`,
      );

      if (!storedHiddenMessageIds) {
        setHiddenMessageIds([]);
        return;
      }

      try {
        const parsedHiddenMessageIds = JSON.parse(storedHiddenMessageIds);

        setHiddenMessageIds(
          Array.isArray(parsedHiddenMessageIds)
            ? parsedHiddenMessageIds.filter((id) => Number.isInteger(id))
            : [],
        );
      } catch {
        setHiddenMessageIds([]);
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [user]);
  useEffect(() => {
    notificationsEnabledRef.current = areNotificationsEnabled;
  }, [areNotificationsEnabled]);

  useEffect(() => {
    mutedProfilesRef.current = mutedProfiles;
  }, [mutedProfiles]);

  useEffect(() => {
    const mutedProfilesCleanupInterval = window.setInterval(() => {
      setMutedProfiles((currentMutedProfiles) => {
        const nextMutedProfiles = pruneMutedProfiles(currentMutedProfiles);

        if (Object.keys(nextMutedProfiles).length === Object.keys(currentMutedProfiles).length) {
          return currentMutedProfiles;
        }

        writeStoredMutedProfiles(nextMutedProfiles);
        return nextMutedProfiles;
      });
    }, 60_000);

    return () => {
      window.clearInterval(mutedProfilesCleanupInterval);
    };
  }, []);

  useEffect(() => {
    blockedProfileIdsRef.current = new Set(blockedProfileIds);
  }, [blockedProfileIds]);

  useEffect(() => {
    activeViewRef.current = activeView;
    selectedChatUserIdRef.current = selectedChatUserId;
  }, [activeView, selectedChatUserId]);

  useEffect(() => {
    originalPageTitleRef.current = document.title || "Hush";
  }, []);

  useEffect(() => {
    if (totalUnreadMessageCount > 0) {
      document.title = `(${totalUnreadMessageCount}) Hush`;
      return;
    }

    document.title = originalPageTitleRef.current;
  }, [totalUnreadMessageCount]);

  useEffect(() => {
    function resetUnreadWhenDialogVisible() {
      if (
        document.visibilityState === "visible" &&
        activeViewRef.current === "messages" &&
        selectedChatUserIdRef.current !== null
      ) {
        setUnreadMessageCount(0);
      }
    }

    resetUnreadWhenDialogVisible();
    document.addEventListener("visibilitychange", resetUnreadWhenDialogVisible);

    return () => {
      document.removeEventListener("visibilitychange", resetUnreadWhenDialogVisible);
    };
  }, [activeView, selectedChatUserId]);

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
    if (!isRecordingVoice || !voiceRecordingStartedAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setVoiceRecordingDuration(
        Math.floor((Date.now() - voiceRecordingStartedAt) / 1000),
      );
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, [isRecordingVoice, voiceRecordingStartedAt]);

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
    if (!favoriteContextMenu) {
      return;
    }

    function closeMenu() {
      setFavoriteContextMenu(null);
    }

    function closeMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFavoriteContextMenu(null);
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
  }, [favoriteContextMenu]);

  useEffect(() => {
    if (!chatContextMenu) {
      return;
    }

    function closeMenu() {
      setChatContextMenu(null);
    }

    function closeMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setChatContextMenu(null);
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
  }, [chatContextMenu]);

  useEffect(() => {
    if (selectedMessageIds.length === 0 && !isSelectedDeleteDialogOpen) {
      return;
    }

    function clearSelectionOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setIsSelectedDeleteDialogOpen(false);
      setSelectedMessageIds([]);

      window.requestAnimationFrame(() => {
        const messagesList = messagesListRef.current;

        if (!messagesList) {
          return;
        }

        const maxScrollTop = Math.max(0, messagesList.scrollHeight - messagesList.clientHeight);
        messagesList.scrollTop = Math.min(messagesList.scrollTop, maxScrollTop);
      });
    }

    window.addEventListener("keydown", clearSelectionOnEscape, true);

    return () => {
      window.removeEventListener("keydown", clearSelectionOnEscape, true);
    };
  }, [isSelectedDeleteDialogOpen, selectedMessageIds.length]);

  const closeTopFloatingLayer = useCallback(() => {
    if (isAvatarDeleteDialogOpen) {
      setIsAvatarDeleteDialogOpen(false);
      return true;
    }

    if (avatarGalleryIndex !== null) {
      setAvatarGalleryIndex(null);
      return true;
    }

    if (selectedImageUrl) {
      setSelectedImageUrl(null);
      return true;
    }

    if (blockConfirmation) {
      setBlockConfirmation(null);
      return true;
    }

    if (profileNotificationMenuUserId) {
      setProfileNotificationMenuUserId(null);
      return true;
    }

    if (messagePinTarget) {
      setMessagePinTarget(null);
      return true;
    }

    if (isUnpinAllDialogOpen) {
      setIsUnpinAllDialogOpen(false);
      return true;
    }

    if (messageDeleteTarget) {
      setMessageDeleteTarget(null);
      return true;
    }

    if (isChatDeleteDialogOpen) {
      setIsChatDeleteDialogOpen(false);
      setChatDeleteTargetUserId(null);
      return true;
    }

    if (isStickerPickerOpen) {
      setIsStickerPickerOpen(false);
      return true;
    }

    if (chatContextMenu) {
      setChatContextMenu(null);
      return true;
    }

    if (favoriteContextMenu) {
      setFavoriteContextMenu(null);
      return true;
    }

    if (messageContextMenu) {
      setMessageContextMenu(null);
      return true;
    }

    if (viewedProfile) {
      setViewedProfile(null);
      return true;
    }

    return false;
  }, [
    avatarGalleryIndex,
    blockConfirmation,
    chatContextMenu,
    favoriteContextMenu,
    isAvatarDeleteDialogOpen,
    isChatDeleteDialogOpen,
    isStickerPickerOpen,
    isUnpinAllDialogOpen,
    messageContextMenu,
    messageDeleteTarget,
    messagePinTarget,
    profileNotificationMenuUserId,
    selectedImageUrl,
    viewedProfile,
  ]);

  useEffect(() => {
    function closeFloatingLayerOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (!closeTopFloatingLayer()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    }

    window.addEventListener("keydown", closeFloatingLayerOnEscape, true);

    return () => {
      window.removeEventListener("keydown", closeFloatingLayerOnEscape, true);
    };
  }, [closeTopFloatingLayer]);

  useEffect(() => {
    if (!isAvatarGalleryOpen || avatarGalleryItems.length < 2 || isAvatarDeleteDialogOpen) {
      return;
    }

    function navigateAvatarGallery(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setAvatarGalleryIndex((currentIndex) => {
        const safeIndex = currentIndex ?? 0;

        return event.key === "ArrowLeft"
          ? (safeIndex - 1 + avatarGalleryItems.length) % avatarGalleryItems.length
          : (safeIndex + 1) % avatarGalleryItems.length;
      });
    }

    window.addEventListener("keydown", navigateAvatarGallery, true);

    return () => {
      window.removeEventListener("keydown", navigateAvatarGallery, true);
    };
  }, [avatarGalleryItems.length, isAvatarDeleteDialogOpen, isAvatarGalleryOpen]);

  useEffect(() => {
    return () => {
      stopVoiceInputMeter();
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
          updated_at: new Date().toISOString(),
          username:
            typeof signedInUser.user_metadata?.username === "string"
              ? normalizeUsername(signedInUser.user_metadata.username)
              : null,
          username_changed_at: null,
          user_id: signedInUser.id,
        },
        {
          onConflict: "user_id",
          ignoreDuplicates: true,
        },
      );
    }

    function handleIncomingNotifications(incomingMessages: MessageRow[]) {
      for (const newMessage of incomingMessages) {
        if (
          newMessage.id <= 0 ||
          !isDirectMessageForUser(newMessage, signedInUser.id) ||
          notifiedMessageIdsRef.current.has(newMessage.id) ||
          isServiceMessage(newMessage.text) ||
          (newMessage.user_id && blockedProfileIdsRef.current.has(newMessage.user_id)) ||
          newMessage.user_id === signedInUser.id
        ) {
          continue;
        }

        notifiedMessageIdsRef.current.add(newMessage.id);

        const isDialogVisible =
          document.visibilityState === "visible" &&
          activeViewRef.current === "messages" &&
          selectedChatUserIdRef.current !== null;

        if (!isDialogVisible) {
          setUnreadMessageCount((currentCount) => currentCount + 1);
        }

        if (
          !isDialogVisible &&
          notificationsEnabledRef.current &&
          (!newMessage.user_id ||
            !isProfileMuted(mutedProfilesRef.current, newMessage.user_id)) &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          const notification = new Notification(newMessage.author, {
            body: getNotificationMessageText(newMessage.text),
            tag: `hush-message-${newMessage.id}`,
          });
          window.setTimeout(() => {
            notification.close();
          }, 3000);

          notification.onclick = () => {
            window.focus();
            setActiveView("messages");

            if (newMessage.user_id) {
              setSelectedChatUserId(newMessage.user_id);
            }

            setUnreadMessageCount(0);
            notification.close();
          };
        }
      }
    }

    async function syncAllMessages(showLoading = false) {
      if (isDeletingChatRef.current) {
        setIsLoadingMessages(false);
        return;
      }

      if (showLoading) {
        setIsLoadingMessages(true);
      }

      const { data, error } = await fetchMessages(signedInUser.id);

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

      const { data, error } = await fetchMessagesAfter(latestMessageCreatedAt, signedInUser.id);

      if (!isMounted || isDeletingChatRef.current) {
        return;
      }

      if (error) {
        setErrorMessage("Не получилось загрузить новые сообщения.");
      } else if (data?.length) {
        setMessages((currentMessages) => mergeMessages(currentMessages, data));
        handleIncomingNotifications(data);
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

          if (!isDirectMessageForUser(newMessage, signedInUser.id)) {
            return;
          }

          setMessages((currentMessages) =>
            mergeMessages(currentMessages, [newMessage]),
          );
          handleIncomingNotifications([newMessage]);
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

    const signedInUser = user;
    let isUpdatingPresence = false;

    async function updatePresence() {
      if (document.visibilityState !== "visible" || isUpdatingPresence) {
        return;
      }

      isUpdatingPresence = true;

      const updatedAt = new Date().toISOString();

      setProfiles((currentProfiles) =>
        currentProfiles.map((profile) =>
          profile.user_id === signedInUser.id
            ? { ...profile, updated_at: updatedAt }
            : profile,
        ),
      );

      const { error } = await supabase
        .from("profiles")
        .update({ updated_at: updatedAt })
        .eq("user_id", signedInUser.id);

      if (error && currentProfileRef.current === null) {
        await supabase.from("profiles").upsert({
          avatar_url: null,
          display_name: getDisplayName(signedInUser),
          name_changed_at: null,
          updated_at: updatedAt,
          user_id: signedInUser.id,
          username:
            typeof signedInUser.user_metadata?.username === "string"
              ? normalizeUsername(signedInUser.user_metadata.username)
              : null,
          username_changed_at: null,
        });
      }

      isUpdatingPresence = false;
    }

    updatePresence();

    const presenceInterval = window.setInterval(updatePresence, 60_000);

    document.addEventListener("visibilitychange", updatePresence);
    window.addEventListener("focus", updatePresence);

    return () => {
      window.clearInterval(presenceInterval);
      document.removeEventListener("visibilitychange", updatePresence);
      window.removeEventListener("focus", updatePresence);
    };
  }, [user]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTypingNow(Date.now());
    }, 500);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    return () => {
      void sendTypingState("stop");
    };
  }, [sendTypingState, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const friendMessages = visibleMessages.filter((message) => {
      return message.id > 0 && message.user_id && message.user_id !== user.id;
    });

    for (const message of friendMessages) {
      const hasSentDeliveredReceipt = sentReceiptMessageIdSets.deliveredMessageIds.has(message.id);
      const hasSentReadReceipt = sentReceiptMessageIdSets.readMessageIds.has(message.id);

      if (!hasSentDeliveredReceipt && !sentDeliveryReceiptIdsRef.current.has(message.id)) {
        sentDeliveryReceiptIdsRef.current.add(message.id);
        void sendServiceMessage(createReceiptMessageText(message.id, "delivered"), message.user_id);
      }

      if (
        activeView === "messages" &&
        selectedChatUserId !== null &&
        message.user_id === selectedChatUserId &&
        document.visibilityState === "visible" &&
        !hasSentReadReceipt &&
        !sentReadReceiptIdsRef.current.has(message.id)
      ) {
        sentReadReceiptIdsRef.current.add(message.id);
        void sendServiceMessage(createReceiptMessageText(message.id, "read"), message.user_id);
      }
    }
  }, [activeView, selectedChatUserId, sendServiceMessage, sentReceiptMessageIdSets, user, visibleMessages]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;

    async function syncProfiles() {
      const { data, error } = await fetchProfiles();

      if (!isMounted) {
        return;
      }

      if (error) {
        setErrorMessage("Не получилось загрузить профили.");
        return;
      }

      setProfiles(data ?? []);
    }

    syncProfiles();

    const profilesInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        syncProfiles();
      }
    }, 5000);

    const channel = supabase
      .channel("profiles-channel")
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
      window.clearInterval(profilesInterval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setAuthUsernameError("");

    if (authContactMethod === "phone") {
      setErrorMessage("Вход и регистрация по телефону уже в интерфейсе, SMS-логика пока в разработке.");
      return;
    }

    if (authMode === "sign-up") {
      const nextUsername = normalizeUsername(authUsername);
      const usernameValidationError = getUsernameError(nextUsername);

      if (usernameValidationError) {
        setAuthUsernameError(usernameValidationError);
        return;
      }

      const usernameOwner = await fetchUsernameOwner(nextUsername);

      if (usernameOwner.error) {
        setAuthUsernameError("Не получилось проверить ник. Попробуй ещё раз.");
        return;
      }

      if (usernameOwner.data) {
        setAuthUsernameError("Такой ник уже занят.");
        return;
      }

      const fallbackDisplayName = authEmail.trim().split("@")[0] || nextUsername;
      const { data, error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          data: {
            display_name: fallbackDisplayName,
            username: nextUsername,
          },
        },
      });

      if (error) {
        setErrorMessage("Не получилось зарегистрироваться.");
      } else {
        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").upsert({
            display_name: fallbackDisplayName,
            username: nextUsername,
            username_changed_at: null,
            user_id: data.user.id,
          });

          if (profileError) {
            setAuthUsernameError("Аккаунт создан, но ник не сохранился. Попробуй войти и сохранить ник в профиле.");
            return;
          }
        }

        setErrorMessage("Аккаунт создан. Если Supabase попросит, подтверди email.");
        setAuthUsername("");
        setAuthMode("sign-in");
      }

      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });

    if (error) {
      setErrorMessage("Не получилось войти. Проверь email и пароль.");
      return;
    }

    const signedInUser = data.user;

    if (!signedInUser) {
      return;
    }

    const { data: signedInProfile, error: signedInProfileError } = await supabase
      .from("profiles")
      .select("user_id, username")
      .eq("user_id", signedInUser.id)
      .maybeSingle();

    if (signedInProfileError) {
      await supabase.auth.signOut();
      setErrorMessage("Не получилось проверить профиль аккаунта.");
      return;
    }

    if (!signedInProfile) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        avatar_url: currentProfile?.avatar_url ?? null,
        display_name: getDisplayName(signedInUser),
        user_id: signedInUser.id,
      });

      if (profileError) {
        await supabase.auth.signOut();
        setErrorMessage("Не получилось подготовить профиль аккаунта.");
      }
    }
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setErrorMessage("");

    try {
      if (callStatusRef.current !== "idle") {
        await closeCall(true);
      }

      setViewedProfile(null);
      setSelectedImageUrl(null);
      setAvatarGalleryItems([]);
      setCanDeleteAvatarFromGallery(false);
      setAvatarGalleryIndex(null);
      setIsAvatarDeleteDialogOpen(false);
      setProfileNotificationMenuUserId(null);
      setBlockConfirmation(null);
      setMessageContextMenu(null);
      setFavoriteContextMenu(null);
      setChatContextMenu(null);
      setMessageDeleteTarget(null);
      setMessagePinTarget(null);
      setIsChatDeleteDialogOpen(false);
      setChatDeleteTargetUserId(null);
      setIsStickerPickerOpen(false);
      setReplyTarget(null);
      setEditingMessage(null);
      setMessageText("");

      const { error } = await supabase.auth.signOut();

      if (error) {
        setErrorMessage("Не получилось выйти из аккаунта.");
        return;
      }

      setAuthPassword("");
      setAuthUsername("");
      setAuthUsernameError("");
    } finally {
      setIsSigningOut(false);
    }
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

  async function startCall(targetUserId = friendProfile?.userId ?? null) {
    if (!user) {
      return;
    }

    if (!targetUserId || targetUserId === user.id) {
      setErrorMessage("Чтобы позвонить, сначала нужен хотя бы один вход друга в чат.");
      return;
    }

    if (blockedByMeProfileIds.includes(targetUserId)) {
      setErrorMessage("Сначала разблокируй пользователя, чтобы позвонить ему.");
      return;
    }

    if (blockState.blockedMeIds.includes(targetUserId)) {
      setErrorMessage("Ты не можешь позвонить: пользователь тебя заблокировал.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
      setErrorMessage("Этот браузер не поддерживает звонки.");
      return;
    }

    try {
      setErrorMessage("");
      callStatusRef.current = "calling";
      setIsCallPanelCollapsed(false);
      setCallPanelPosition(getCenteredCallPanelPosition(false));
      setCallStatus("calling");
      setCallDuration(0);
      setCallStartedAt(null);
      callStartedAtRef.current = null;
      hasSavedCallSummaryRef.current = false;
      setIsCallMicMuted(false);

      const stream = await getLocalCallStream();
      const peerConnection = createPeerConnection(targetUserId);

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      await sendCallSignal(targetUserId, "offer", offer);
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
      setIsCallPanelCollapsed(false);
      setCallPanelPosition(getCenteredCallPanelPosition(false));
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
    const partnerId = callPartnerIdRef.current;

    if (!user || !partnerId || hasSavedCallSummaryRef.current || !callStartedAtRef.current) {
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
      recipient_id: partnerId,
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
        recipient_id: partnerId,
        text: `${callMessagePrefix}${duration}`,
        user_id: user.id,
      })
      .select(messageColumns)
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

  function toggleStoredBooleanSetting(
    key: string,
    setter: (value: boolean) => void,
    currentValue: boolean,
  ) {
    const nextValue = !currentValue;

    setter(nextValue);
    writeStoredBoolean(key, nextValue);
    setErrorMessage("");
  }

  function muteProfileNotifications(profileUserId: string, durationMs: number | null) {
    if (!profileUserId) {
      return;
    }

    const nextMutedProfiles = pruneMutedProfiles({
      ...mutedProfiles,
      [profileUserId]: durationMs === null ? null : Date.now() + durationMs,
    });

    setMutedProfiles(nextMutedProfiles);
    writeStoredMutedProfiles(nextMutedProfiles);
    setProfileNotificationMenuUserId(null);
    setErrorMessage("");
  }

  function unmuteProfileNotifications(profileUserId: string) {
    const nextMutedProfiles = { ...mutedProfiles };

    delete nextMutedProfiles[profileUserId];

    setMutedProfiles(nextMutedProfiles);
    writeStoredMutedProfiles(nextMutedProfiles);
    setProfileNotificationMenuUserId(null);
    setErrorMessage("");
  }

  function requestBlockChange(profileUserId: string, targetLabel: string) {
    if (!profileUserId) {
      return;
    }

    setProfileNotificationMenuUserId(null);
    setBlockConfirmation({
      action: blockedByMeProfileIds.includes(profileUserId) ? "unblock" : "block",
      targetLabel,
      userId: profileUserId,
    });
  }

  async function confirmBlockChange() {
    if (!blockConfirmation) {
      return;
    }

    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    const { action, userId } = blockConfirmation;

    setBlockConfirmation(null);
    setProfileNotificationMenuUserId(null);

    const nextLocalBlockedProfileIds =
      action === "block"
        ? Array.from(new Set([...localBlockedProfileIds, userId]))
        : localBlockedProfileIds.filter((profileId) => profileId !== userId);

    setLocalBlockedProfileIds(nextLocalBlockedProfileIds);
    writeStoredStringList("twinline-blocked-profiles", nextLocalBlockedProfileIds);

    const optimisticMessage: MessageRow = {
      author: activeUserName,
      created_at: new Date().toISOString(),
      id: -Date.now(),
      recipient_id: userId,
      text: createBlockMessageText(userId, action),
      user_id: user.id,
    };

    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        recipient_id: userId,
        text: createBlockMessageText(userId, action),
        user_id: user.id,
      })
      .select(messageColumns)
      .single();

    if (error || !data) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setErrorMessage("Не получилось изменить блокировку. Попробуй ещё раз.");
      return;
    }

    setMessages((currentMessages) =>
      mergeMessages(
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
        [data],
      ),
    );

    if (action === "block") {
      setIncomingCall((currentCall) =>
        currentCall?.sender_id === userId ? null : currentCall,
      );
    }

    setMessageText("");
    setReplyTarget(null);
    setEditingMessage(null);
    setErrorMessage("");
  }

  async function confirmDeleteChat() {
    const targetChatUserId = chatDeleteTargetUserId ?? selectedChatUserId;

    if (isDeletingChat || !user || !targetChatUserId) {
      return;
    }

    setIsChatDeleteDialogOpen(false);
    isDeletingChatRef.current = true;
    latestMessageCreatedAtRef.current = null;
    flushSync(() => {
      setIsDeletingChat(true);
    });

    const selectedChatMessageIds = messages
      .filter((message) => {
        return (
          message.id > 0 &&
          !isServiceMessage(message.text) &&
          isMessageBetweenUsers(message, user.id, targetChatUserId)
        );
      })
      .map((message) => message.id);

    if (selectedChatMessageIds.length === 0) {
      if (selectedChatUserId === targetChatUserId) {
        setSelectedChatUserId(null);
      }
      setChatDeleteTargetUserId(null);
      setIsDeletingChat(false);
      isDeletingChatRef.current = false;
      setErrorMessage("");
      return;
    }

    const previousMessages = messages;
    const previousPinnedMessageIdsByChat = pinnedMessageIdsByChat;
    const previousSelectedMessageIds = selectedMessageIds;

    setMessages((currentMessages) =>
      currentMessages.filter((message) => !selectedChatMessageIds.includes(message.id)),
    );
    const nextPinnedMessageIdsByChat = { ...pinnedMessageIdsByChat };
    delete nextPinnedMessageIdsByChat[targetChatUserId];
    setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
    writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);
    setSelectedMessageIds((currentIds) =>
      currentIds.filter((id) => !selectedChatMessageIds.includes(id)),
    );

    const { error } = await supabase
      .from("messages")
      .delete()
      .in("id", selectedChatMessageIds);

    if (error) {
      latestMessageCreatedAtRef.current =
        previousMessages.filter((message) => message.id > 0).at(-1)?.created_at ?? null;
      setMessages(previousMessages);
      setPinnedMessageIdsByChat(previousPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, previousPinnedMessageIdsByChat);
      setSelectedMessageIds(previousSelectedMessageIds);
      setIsDeletingChat(false);
      isDeletingChatRef.current = false;
      setErrorMessage("Не получилось удалить переписку у двоих.");
      return;
    }

    if (selectedChatUserId === targetChatUserId) {
      setSelectedChatUserId(null);
    }
    setChatDeleteTargetUserId(null);
    setIsDeletingChat(false);
    isDeletingChatRef.current = false;
    setErrorMessage("");
  }

  function toggleStickerPicker() {
    const button = stickerButtonRef.current;

    if (button) {
      const rect = button.getBoundingClientRect();
      const pickerWidth = Math.min(300, window.innerWidth - 32);
      const pickerHeight = 286;

      setStickerPickerPosition({
        left: Math.max(16, Math.min(rect.left, window.innerWidth - pickerWidth - 16)),
        top: Math.max(
          16,
          Math.min(rect.top - 236, window.innerHeight - pickerHeight - 16),
        ),
      });
    }

    setIsStickerPickerOpen((isOpen) => !isOpen);
  }

  function openMessageContextMenu(
    event: MouseEvent<HTMLElement>,
    message: MessageRow,
  ) {
    if (!user) {
      return;
    }

    event.preventDefault();
    setIsStickerPickerOpen(false);

    const menuWidth = Math.min(220, window.innerWidth - 24);
    const menuHeight = 306;

    setMessageContextMenu({
      left: Math.max(
        12,
        Math.min(event.clientX, window.innerWidth - menuWidth - 12),
      ),
      message,
      top: Math.max(
        12,
        Math.min(event.clientY, window.innerHeight - menuHeight - 12),
      ),
    });
  }

  function openFavoriteContextMenu(
    event: MouseEvent<HTMLElement>,
    item: FavoriteItem,
  ) {
    event.preventDefault();
    setIsStickerPickerOpen(false);

    const menuWidth = Math.min(220, window.innerWidth - 24);
    const menuHeight = 306;

    setFavoriteContextMenu({
      item,
      left: Math.max(
        12,
        Math.min(event.clientX, window.innerWidth - menuWidth - 12),
      ),
      top: Math.max(
        12,
        Math.min(event.clientY, window.innerHeight - menuHeight - 12),
      ),
    });
  }

  function openChatContextMenu(
    event: MouseEvent<HTMLElement>,
    profile: ProfileRow,
  ) {
    event.preventDefault();
    setMessageContextMenu(null);
    setFavoriteContextMenu(null);
    setIsStickerPickerOpen(false);

    const menuWidth = Math.min(286, window.innerWidth - 24);
    const menuHeight = 240;

    setChatContextMenu({
      left: Math.max(
        12,
        Math.min(event.clientX, window.innerWidth - menuWidth - 12),
      ),
      profile,
      top: Math.max(
        12,
        Math.min(event.clientY, window.innerHeight - menuHeight - 12),
      ),
    });
  }

  function requestChatDeleteFromMenu(profile: ProfileRow) {
    setChatDeleteTargetUserId(profile.user_id);
    setChatContextMenu(null);
    setIsChatDeleteDialogOpen(true);
  }

  function runChatMenuStub(message: string) {
    setChatContextMenu(null);
    setErrorMessage(message);
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

  async function copyFavoriteText(item: FavoriteItem) {
    try {
      await navigator.clipboard.writeText(getReadableMessageText(item.text));
      setErrorMessage("");
    } catch {
      setErrorMessage("Не получилось скопировать текст.");
    }

    setFavoriteContextMenu(null);
  }

  function saveFavoriteItems(nextFavoriteItems: FavoriteItem[]) {
    const sortedFavoriteItems = [...nextFavoriteItems].sort((firstItem, secondItem) =>
      firstItem.created_at.localeCompare(secondItem.created_at),
    );

    setFavoriteItems(sortedFavoriteItems);

    if (!user) {
      return;
    }

    window.localStorage.setItem(
      `hush-favorites-${user.id}`,
      JSON.stringify(sortedFavoriteItems),
    );
  }

  function addFavoriteChatMessage(text: string) {
    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    const createdAt = new Date().toISOString();

    saveFavoriteItems([
      ...favoriteItems,
      {
        author: activeUserName,
        created_at: createdAt,
        id: Date.now(),
        recipient_id: user.id,
        saved_at: createdAt,
        text,
        user_id: user.id,
      },
    ]);
    setErrorMessage("");
  }

  function removeFavoriteItem(favoriteItemId: number) {
    saveFavoriteItems(
      favoriteItems.filter((favoriteItem) => favoriteItem.id !== favoriteItemId),
    );
    setPinnedFavoriteItem((currentPinnedItem) =>
      currentPinnedItem?.id === favoriteItemId ? null : currentPinnedItem,
    );
    setSelectedMessageIds((currentIds) =>
      currentIds.filter((id) => id !== favoriteItemId),
    );
    setFavoriteContextMenu(null);
    setErrorMessage("");
  }

  function replyToFavoriteItem(item: FavoriteItem) {
    setReplyTarget(item);
    setEditingMessage(null);
    setMessageText("");
    setFavoriteContextMenu(null);
    setErrorMessage("");

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  }

  function startEditingFavoriteItem(item: FavoriteItem) {
    setEditingMessage(item);
    setReplyTarget(null);
    setMessageText(getReadableMessageText(item.text));
    setFavoriteContextMenu(null);
    setErrorMessage("");

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  }

  function togglePinnedFavoriteItem(item: FavoriteItem) {
    setPinnedFavoriteItem((currentPinnedItem) =>
      currentPinnedItem?.id === item.id ? null : item,
    );
    setFavoriteContextMenu(null);
    setErrorMessage("");
  }

  function toggleSelectedFavoriteItem(item: FavoriteItem) {
    setSelectedMessageIds((currentIds) =>
      currentIds.includes(item.id)
        ? currentIds.filter((id) => id !== item.id)
        : [...currentIds, item.id],
    );
    setFavoriteContextMenu(null);
    setErrorMessage("");
  }

  function replyToMessage(message: MessageRow) {
    setReplyTarget(message);
    setEditingMessage(null);
    setMessageText("");
    setMessageContextMenu(null);
    setErrorMessage("");

    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  }

  function scrollToReplyMessage(reply: ReplyMessagePayload) {
    if (!reply.messageId) {
      setErrorMessage("К этому старому ответу нельзя перейти: он был создан до привязки сообщений.");
      return;
    }

    const targetMessage = messagesListRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${reply.messageId}"]`,
    );

    if (!targetMessage) {
      setErrorMessage("Исходное сообщение не найдено.");
      return;
    }

    if (highlightedMessageTimeoutRef.current !== null) {
      window.clearTimeout(highlightedMessageTimeoutRef.current);
    }

    targetMessage.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(reply.messageId);
    setErrorMessage("");
    highlightedMessageTimeoutRef.current = window.setTimeout(() => {
      setHighlightedMessageId(null);
      highlightedMessageTimeoutRef.current = null;
    }, 1200);
  }

  function highlightMessage(messageId: number) {
    const targetMessage = messagesListRef.current?.querySelector<HTMLElement>(
      `[data-message-id="${messageId}"]`,
    );

    if (!targetMessage) {
      return false;
    }

    if (highlightedMessageTimeoutRef.current !== null) {
      window.clearTimeout(highlightedMessageTimeoutRef.current);
    }

    targetMessage.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);
    highlightedMessageTimeoutRef.current = window.setTimeout(() => {
      setHighlightedMessageId(null);
      highlightedMessageTimeoutRef.current = null;
    }, 1200);

    return true;
  }

  function scrollToNextPinnedMessage() {
    if (activePinnedMessages.length === 0) {
      return;
    }

    if (isPinnedMessagesViewOpen) {
      setIsPinnedMessagesViewOpen(false);
    }

    window.requestAnimationFrame(() => {
      const nextIndex = pinnedNavigationIndex % activePinnedMessages.length;
      const nextPinnedMessage = activePinnedMessages[nextIndex];

      if (nextPinnedMessage && highlightMessage(nextPinnedMessage.id)) {
        setPinnedNavigationIndex((nextIndex + 1) % activePinnedMessages.length);
      }
    });
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

  function requestPinnedMessage(message: MessageRow) {
    setMessagePinTarget(message);
    setShouldPinForBoth(false);
    setMessageContextMenu(null);
    setErrorMessage("");
  }

  function removeLocalPinnedMessageId(messageId: number, chatUserId = selectedChatUserId) {
    if (!user || !chatUserId) {
      return;
    }

    const currentPinnedIds = pinnedMessageIdsByChat[chatUserId] ?? [];

    if (!currentPinnedIds.includes(messageId)) {
      return;
    }

    const nextPinnedMessageIdsByChat = {
      ...pinnedMessageIdsByChat,
      [chatUserId]: currentPinnedIds.filter((pinnedMessageId) => pinnedMessageId !== messageId),
    };

    setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
    writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);
  }

  function requestUnpinPinnedMessage(message: MessageRow) {
    setMessagePinTarget(message);
    setShouldPinForBoth(sharedPinnedMessageIds.has(message.id));
    setMessageContextMenu(null);
    setErrorMessage("");
  }

  async function confirmUnpinPinnedMessage() {
    if (!messagePinTarget) {
      return;
    }

    const wasSharedPinned = sharedPinnedMessageIds.has(messagePinTarget.id);
    const wasLocalPinned =
      selectedChatUserId !== null &&
      (pinnedMessageIdsByChat[selectedChatUserId] ?? []).includes(messagePinTarget.id);

    if (wasLocalPinned && user && selectedChatUserId) {
      const nextPinnedMessageIdsByChat = {
        ...pinnedMessageIdsByChat,
        [selectedChatUserId]: (pinnedMessageIdsByChat[selectedChatUserId] ?? []).filter(
          (messageId) => messageId !== messagePinTarget.id,
        ),
      };

      setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);
    }

    if (wasSharedPinned) {
      setShouldPinForBoth(true);
      await confirmPinnedMessage();
      return;
    }

    setMessagePinTarget(null);
    setErrorMessage("");
  }

  async function confirmPinnedMessage() {
    if (!messagePinTarget) {
      return;
    }

    const isSharedPinned = sharedPinnedMessageIds.has(messagePinTarget.id);
    const isPinned = activePinnedMessageIdSet.has(messagePinTarget.id);

    if (!shouldPinForBoth) {
      if (!user || !selectedChatUserId) {
        setErrorMessage("Сначала открой нужный чат.");
        return;
      }

      const currentPinnedIds = pinnedMessageIdsByChat[selectedChatUserId] ?? [];
      const nextPinnedIds = isPinned
        ? currentPinnedIds.filter((messageId) => messageId !== messagePinTarget.id)
        : [...currentPinnedIds, messagePinTarget.id];
      const nextPinnedMessageIdsByChat = {
        ...pinnedMessageIdsByChat,
        [selectedChatUserId]: Array.from(new Set(nextPinnedIds)),
      };

      setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);
      setMessagePinTarget(null);
      setErrorMessage("");
      return;
    }

    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }

    if (!selectedChatUserId) {
      setErrorMessage("Сначала открой нужный чат.");
      return;
    }

    const action: PinMessagePayload["action"] = isSharedPinned ? "unpin" : "pin";
    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      recipient_id: selectedChatUserId,
      text: createPinMessageText(messagePinTarget.id, action),
      created_at: new Date().toISOString(),
      user_id: user.id,
    };

    setMessagePinTarget(null);
    setMessages((currentMessages) =>
      mergeMessages(currentMessages, [optimisticMessage]),
    );

    const { data, error } = await supabase
      .from("messages")
      .insert({
        author: activeUserName,
        recipient_id: selectedChatUserId,
        text: optimisticMessage.text,
        user_id: user.id,
      })
      .select(messageColumns)
      .single();

    if (error || !data) {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
      );
      setErrorMessage("Не получилось сохранить закрепление для двоих.");
      return;
    }

    setMessages((currentMessages) =>
      mergeMessages(
        currentMessages.filter((message) => message.id !== optimisticMessage.id),
        [data],
      ),
    );
    setErrorMessage("");
  }

  async function unpinAllActivePinnedMessages() {
    if (!user || !selectedChatUserId || activePinnedMessages.length === 0) {
      return;
    }

    setIsUnpinAllDialogOpen(false);

    const previousPinnedMessageIdsByChat = pinnedMessageIdsByChat;
    const sharedPinnedIds = activePinnedMessages
      .filter((message) => sharedPinnedMessageIds.has(message.id))
      .map((message) => message.id);
    const nextPinnedMessageIdsByChat = {
      ...pinnedMessageIdsByChat,
      [selectedChatUserId]: [],
    };

    setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
    writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);

    if (sharedPinnedIds.length === 0) {
      setIsPinnedMessagesViewOpen(false);
      setErrorMessage("");
      return;
    }

    const optimisticMessages = sharedPinnedIds.map((messageId, index) => ({
      id: -(Date.now() + index),
      author: activeUserName,
      recipient_id: selectedChatUserId,
      text: createPinMessageText(messageId, "unpin"),
      created_at: new Date(Date.now() + index).toISOString(),
      user_id: user.id,
    }));

    setMessages((currentMessages) => mergeMessages(currentMessages, optimisticMessages));

    const { data, error } = await supabase
      .from("messages")
      .insert(
        optimisticMessages.map((message) => ({
          author: activeUserName,
          recipient_id: selectedChatUserId,
          text: message.text,
          user_id: user.id,
        })),
      )
      .select(messageColumns);

    if (error) {
      setPinnedMessageIdsByChat(previousPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, previousPinnedMessageIdsByChat);
      setMessages((currentMessages) =>
        currentMessages.filter(
          (message) => !optimisticMessages.some((optimisticMessage) => optimisticMessage.id === message.id),
        ),
      );
      setErrorMessage("Не получилось открепить общие закрепы.");
      return;
    }

    setMessages((currentMessages) =>
      mergeMessages(
        currentMessages.filter(
          (message) => !optimisticMessages.some((optimisticMessage) => optimisticMessage.id === message.id),
        ),
        data ?? [],
      ),
    );
    setIsPinnedMessagesViewOpen(false);
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

  function handleMessageSelectionClick(
    event: MouseEvent<HTMLElement>,
    message: MessageRow,
  ) {
    if (!isMessageSelectionMode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleSelectedMessage(message);
  }

  function forwardSelectedMessages() {
    if (selectedDialogMessages.length === 0) {
      return;
    }

    setErrorMessage("Пересылку сообщений подключим следующим шагом.");
  }

  function hideSelectedMessagesForMe() {
    if (!user || selectedDialogMessages.length === 0) {
      return;
    }

    const selectedIds = selectedDialogMessages.map((message) => message.id);
    const positiveIds = selectedIds.filter((id) => id > 0);
    const localIds = selectedIds.filter((id) => id < 0);

    setIsSelectedDeleteDialogOpen(false);
    setMessages((currentMessages) =>
      currentMessages.filter((message) => !localIds.includes(message.id)),
    );

    if (positiveIds.length > 0) {
      setHiddenMessageIds((currentIds) => {
        const nextIds = Array.from(new Set([...currentIds, ...positiveIds]));

        window.localStorage.setItem(
          "twinline-hidden-messages-" + user.id,
          JSON.stringify(nextIds),
        );

        return nextIds;
      });
    }

    if (selectedChatUserId) {
      const nextPinnedMessageIdsByChat = {
        ...pinnedMessageIdsByChat,
        [selectedChatUserId]: (pinnedMessageIdsByChat[selectedChatUserId] ?? []).filter(
          (id) => !selectedIds.includes(id),
        ),
      };

      setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);
    }

    setSelectedMessageIds((currentIds) =>
      currentIds.filter((id) => !selectedIds.includes(id)),
    );
    setMessageContextMenu(null);
    setErrorMessage("");
  }

  async function deleteSelectedMessagesForBoth() {
    if (!user || selectedDialogMessages.length === 0) {
      return;
    }

    const selectedIds = selectedDialogMessages.map((message) => message.id);
    const positiveIds = selectedIds.filter((id) => id > 0);
    const previousMessages = messages;
    const previousPinnedMessageIdsByChat = pinnedMessageIdsByChat;
    const previousSelectedMessageIds = selectedMessageIds;

    setIsSelectedDeleteDialogOpen(false);
    setMessages((currentMessages) =>
      currentMessages.filter((message) => !selectedIds.includes(message.id)),
    );

    if (selectedChatUserId) {
      const nextPinnedMessageIdsByChat = {
        ...pinnedMessageIdsByChat,
        [selectedChatUserId]: (pinnedMessageIdsByChat[selectedChatUserId] ?? []).filter(
          (id) => !selectedIds.includes(id),
        ),
      };

      setPinnedMessageIdsByChat(nextPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, nextPinnedMessageIdsByChat);
    }

    setSelectedMessageIds((currentIds) =>
      currentIds.filter((id) => !selectedIds.includes(id)),
    );
    setMessageContextMenu(null);

    if (positiveIds.length === 0) {
      setErrorMessage("");
      return;
    }

    const { error } = await supabase
      .from("messages")
      .delete()
      .in("id", positiveIds);

    if (error) {
      setMessages(previousMessages);
      setPinnedMessageIdsByChat(previousPinnedMessageIdsByChat);
      writeStoredPinnedMessageIds(user.id, previousPinnedMessageIdsByChat);
      setSelectedMessageIds(previousSelectedMessageIds);
      setErrorMessage("\u041d\u0435 \u043f\u043e\u043b\u0443\u0447\u0438\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0432\u044b\u0434\u0435\u043b\u0435\u043d\u043d\u044b\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f \u0443 \u0434\u0432\u043e\u0438\u0445.");
      return;
    }

    setErrorMessage("");
  }

  function requestMessageDelete(message: MessageRow) {
    setMessageDeleteTarget(message);
    setMessageContextMenu(null);
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

    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        avatar_url: currentProfile?.avatar_url ?? null,
        display_name: nextName,
        name_changed_at: currentProfile?.name_changed_at ?? null,
        updated_at: updatedAt,
        user_id: user.id,
        username: currentProfile?.username ?? null,
        username_changed_at: currentProfile?.username_changed_at ?? null,
      })
      .select(profileColumns)
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

  async function updateProfileUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setProfileUsernameError("");

    const nextUsername = normalizeUsername(profileUsernameInputValue);
    const usernameValidationError = getUsernameError(nextUsername);

    if (usernameValidationError) {
      setProfileUsernameError(usernameValidationError);
      return;
    }

    if (nextUsername === currentProfile?.username) {
      return;
    }

    if (!isUsernameChangeAllowed) {
      setProfileUsernameError(
        `Ник снова можно будет изменить ${nextUsernameChangeDate ?? "позже"}.`,
      );
      return;
    }

    const usernameOwner = await fetchUsernameOwner(nextUsername);

    if (usernameOwner.error) {
      setProfileUsernameError("Сначала нужно добавить колонку username в Supabase.");
      return;
    }

    if (usernameOwner.data && usernameOwner.data.user_id !== user.id) {
      setProfileUsernameError("Такой ник уже занят.");
      return;
    }

    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        avatar_url: currentProfile?.avatar_url ?? null,
        display_name: activeUserName,
        name_changed_at: updatedAt,
        updated_at: updatedAt,
        user_id: user.id,
        username: nextUsername,
        username_changed_at: updatedAt,
      })
      .select(profileColumns)
      .single();

    if (error) {
      setProfileUsernameError("Не получилось сохранить ник.");
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
        username: nextUsername,
      },
    });

    setProfileUsername(null);
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
        username: currentProfile?.username ?? null,
        username_changed_at: currentProfile?.username_changed_at ?? null,
      })
      .select(profileColumns)
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

      const nextAvatarHistory = [
        data.avatar_url,
        ...avatarHistory.filter((url) => url !== data.avatar_url),
      ].slice(0, 20);

      setAvatarHistory(nextAvatarHistory);
      setAvatarGalleryItems(nextAvatarHistory);
      setCanDeleteAvatarFromGallery(true);
      window.localStorage.setItem(
        `hush-avatar-history-${user.id}`,
        JSON.stringify(nextAvatarHistory),
      );
      setAvatarGalleryIndex(0);
    }

    setErrorMessage("");
  }

  function openAvatarGallery(url: string | null | undefined) {
    if (!url) {
      avatarInputRef.current?.click();
      return;
    }

    const nextAvatarHistory = [
      url,
      ...avatarHistory.filter((avatarUrl) => avatarUrl !== url),
    ].slice(0, 20);

    if (user) {
      window.localStorage.setItem(
        `hush-avatar-history-${user.id}`,
        JSON.stringify(nextAvatarHistory),
      );
    }

    setAvatarHistory(nextAvatarHistory);
    setAvatarGalleryItems(nextAvatarHistory);
    setCanDeleteAvatarFromGallery(true);
    setAvatarGalleryIndex(0);
  }

  async function openProfileAvatarGallery(profile: {
    avatarUrl: string | null;
    userId: string | null;
  }) {
    if (!profile.avatarUrl) {
      return;
    }

    const avatarUrls = [profile.avatarUrl];

    if (profile.userId) {
      const { data } = await supabase.storage
        .from("message-images")
        .list(`${profile.userId}/avatars`, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (data) {
        const storageAvatarUrls = data
          .filter((file) => file.name && !file.name.endsWith("/"))
          .map((file) => {
            const { data: publicUrlData } = supabase.storage
              .from("message-images")
              .getPublicUrl(`${profile.userId}/avatars/${file.name}`);

            return publicUrlData.publicUrl;
          });

        avatarUrls.push(...storageAvatarUrls);
      }
    }

    setAvatarGalleryItems(Array.from(new Set(avatarUrls)).slice(0, 30));
    setCanDeleteAvatarFromGallery(false);
    setAvatarGalleryIndex(0);
    setSelectedImageUrl(null);
  }

  async function deleteAvatarFromGallery() {
    if (!user || !avatarGalleryUrl || !canDeleteAvatarFromGallery) {
      setIsAvatarDeleteDialogOpen(false);
      return;
    }

    const deletedAvatarUrl = avatarGalleryUrl;
    const nextAvatarHistory = avatarGalleryItems.filter((url) => url !== deletedAvatarUrl);
    const shouldUpdateProfileAvatar = currentProfile?.avatar_url === deletedAvatarUrl;
    const nextProfileAvatarUrl = shouldUpdateProfileAvatar
      ? nextAvatarHistory[0] ?? null
      : currentProfile?.avatar_url ?? null;

    setErrorMessage("");

    if (shouldUpdateProfileAvatar) {
      const { data, error } = await supabase
        .from("profiles")
        .upsert({
          avatar_url: nextProfileAvatarUrl,
          display_name: activeUserName,
          name_changed_at: currentProfile?.name_changed_at ?? null,
          updated_at: new Date().toISOString(),
          user_id: user.id,
          username: currentProfile?.username ?? null,
          username_changed_at: currentProfile?.username_changed_at ?? null,
        })
        .select(profileColumns)
        .single();

      if (error) {
        setErrorMessage("РќРµ РїРѕР»СѓС‡РёР»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ Р°РІР°С‚Р°СЂРєСѓ.");
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
    }

    window.localStorage.setItem(
      `hush-avatar-history-${user.id}`,
      JSON.stringify(nextAvatarHistory),
    );
    setAvatarHistory(nextAvatarHistory);
    setAvatarGalleryItems(nextAvatarHistory);
    setIsAvatarDeleteDialogOpen(false);
    setAvatarGalleryIndex((currentIndex) => {
      if (nextAvatarHistory.length === 0) {
        return null;
      }

      return Math.min(currentIndex ?? 0, nextAvatarHistory.length - 1);
    });
  }

  function handleMessageTextChange(event: ChangeEvent<HTMLInputElement>) {
    const nextMessageText = event.target.value;

    setMessageText(nextMessageText);

    if (!user || editingMessage || activeView === "favorites") {
      return;
    }

    if (!nextMessageText.trim()) {
      typingSentAtRef.current = 0;
      void sendTypingState("stop");
      return;
    }

    const now = Date.now();

    if (now - typingSentAtRef.current < 900) {
      return;
    }

    typingSentAtRef.current = now;
    void sendTypingState("start");
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

    if (activeView === "favorites") {
      if (editingMessage) {
        const editedText = updateReplyMessageBody(editingMessage.text, trimmedText);
        const updatedFavoriteItem: FavoriteItem = {
          ...(editingMessage as FavoriteItem),
          text: editedText,
        };

        saveFavoriteItems(
          favoriteItems.map((favoriteItem) =>
            favoriteItem.id === editingMessage.id ? updatedFavoriteItem : favoriteItem,
          ),
        );
        setPinnedFavoriteItem((currentPinnedItem) =>
          currentPinnedItem?.id === editingMessage.id ? updatedFavoriteItem : currentPinnedItem,
        );
        setEditingMessage(null);
        setMessageText("");
        setErrorMessage("");
        return;
      }

      addFavoriteChatMessage(
        replyTarget ? createReplyMessageText(replyTarget, trimmedText) : trimmedText,
      );
      setMessageText("");
      setReplyTarget(null);
      return;
    }

    if (!selectedChatUserId) {
      setErrorMessage("Сначала выбери собеседника.");
      return;
    }

    if (isSelectedChatBlockedByMe) {
      setErrorMessage("Сначала разблокируй пользователя, чтобы написать ему.");
      return;
    }

    if (isSelectedChatBlockingMe) {
      setErrorMessage("Ты не можешь написать: пользователь тебя заблокировал.");
      return;
    }

    typingSentAtRef.current = 0;
    void sendTypingState("stop");

    if (editingMessage) {
      const previousMessages = messages;
      const editedText = updateReplyMessageBody(editingMessage.text, trimmedText);
      const updatedMessage: MessageRow = {
        ...editingMessage,
        text: editedText,
      };

      setMessages((currentMessages) =>
        currentMessages.map((message) =>
          message.id === editingMessage.id ? updatedMessage : message,
        ),
      );
      setEditingMessage(null);
      setMessageText("");

      const { data, error } = await supabase
        .from("messages")
        .update({ text: editedText })
        .eq("id", editingMessage.id)
        .eq("user_id", user.id)
        .select(messageColumns)
        .maybeSingle();

      if (error || !data) {
        setMessages(previousMessages);
        setEditingMessage(editingMessage);
        setMessageText(trimmedText);
        setErrorMessage("Не получилось изменить сообщение. Возможно, нужно разрешить UPDATE в Supabase.");
      } else {
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === data.id ? data : message,
          ),
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
      recipient_id: selectedChatUserId,
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
        recipient_id: selectedChatUserId,
        text: outgoingText,
        user_id: user.id,
      })
      .select(messageColumns)
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

    if (activeView === "favorites") {
      addFavoriteChatMessage(stickerText);
      setIsStickerPickerOpen(false);
      return;
    }

    if (!selectedChatUserId) {
      setErrorMessage("Сначала выбери собеседника.");
      setIsStickerPickerOpen(false);
      return;
    }

    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      recipient_id: selectedChatUserId,
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
        recipient_id: selectedChatUserId,
        text: stickerText,
        user_id: user.id,
      })
      .select(messageColumns)
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

    if (file.size > maxAttachmentSize) {
      setErrorMessage("Файл должен быть меньше 50 МБ.");
      return;
    }

    setIsUploadingAttachment(true);
    setErrorMessage("");

    const fileExtension = getSafeFileExtension(file.name);
    const filePath = `${user.id}/${getAttachmentFolder(file)}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("message-images")
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Hush file upload failed:", uploadError.message);
      setIsUploadingAttachment(false);
      setErrorMessage("Не получилось загрузить файл.");
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("message-images")
      .getPublicUrl(filePath);

    const attachmentUrl = publicUrlData.publicUrl;
    const messageText = isImage
      ? `${imageMessagePrefix}${attachmentUrl}`
      : isVideo
        ? `${videoMessagePrefix}${attachmentUrl}`
        : createFileMessageText({
            name: file.name || "Файл",
            size: file.size,
            type: file.type,
            url: attachmentUrl,
          });

    if (activeView === "favorites") {
      addFavoriteChatMessage(messageText);
      setIsUploadingAttachment(false);
      return;
    }

    if (!selectedChatUserId) {
      setIsUploadingAttachment(false);
      setErrorMessage("Сначала выбери собеседника.");
      return;
    }

    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      recipient_id: selectedChatUserId,
      text: messageText,
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
        recipient_id: selectedChatUserId,
        text: messageText,
        user_id: user.id,
      })
      .select(messageColumns)
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

    if (activeView === "favorites") {
      addFavoriteChatMessage(`${audioMessagePrefix}${publicUrlData.publicUrl}`);
      setIsUploadingAttachment(false);
      return;
    }

    if (!selectedChatUserId) {
      setIsUploadingAttachment(false);
      setErrorMessage("Сначала выбери собеседника.");
      return;
    }

    const optimisticMessage: MessageRow = {
      id: -Date.now(),
      author: activeUserName,
      recipient_id: selectedChatUserId,
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
        recipient_id: selectedChatUserId,
        text: `${audioMessagePrefix}${publicUrlData.publicUrl}`,
        user_id: user.id,
      })
      .select(messageColumns)
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

  function stopVoiceInputMeter() {
    if (recordingAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(recordingAnimationFrameRef.current);
      recordingAnimationFrameRef.current = null;
    }

    void recordingAudioContextRef.current?.close();
    recordingAudioContextRef.current = null;
    setVoiceInputLevel(0);
  }

  function startVoiceInputMeter(stream: MediaStream) {
    stopVoiceInputMeter();

    try {
      const AudioContextClass = window.AudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      let lastLevel = 0;

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      const dataArray = new Uint8Array(analyser.fftSize);
      source.connect(analyser);
      recordingAudioContextRef.current = audioContext;

      const tick = () => {
        analyser.getByteTimeDomainData(dataArray);

        let sum = 0;

        for (const value of dataArray) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }

        const volume = Math.sqrt(sum / dataArray.length);
        const nextLevel = Math.min(1, Math.max(0, (volume - 0.004) * 22));

        if (Math.abs(nextLevel - lastLevel) > 0.012) {
          lastLevel = nextLevel;
          setVoiceInputLevel(nextLevel);
        }

        recordingAnimationFrameRef.current = window.requestAnimationFrame(tick);
      };

      tick();
    } catch {
      setVoiceInputLevel(0);
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
      shouldDiscardRecordingRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopVoiceInputMeter();
        const audioBlob = new Blob(recordingChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        recordingChunksRef.current = [];
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        setVoiceRecordingStartedAt(null);
        setVoiceRecordingDuration(0);

        if (!shouldDiscardRecordingRef.current && audioBlob.size > 0) {
          sendVoiceMessage(audioBlob);
        }

        shouldDiscardRecordingRef.current = false;
      };

      mediaRecorder.start();
      startVoiceInputMeter(stream);
      setIsRecordingVoice(true);
      setVoiceRecordingStartedAt(Date.now());
      setVoiceRecordingDuration(0);
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

  function cancelVoiceRecording() {
    const mediaRecorder = mediaRecorderRef.current;

    shouldDiscardRecordingRef.current = true;

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    } else {
      stopVoiceInputMeter();
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      mediaRecorderRef.current = null;
      recordingChunksRef.current = [];
      shouldDiscardRecordingRef.current = false;
    }

    setIsRecordingVoice(false);
    setVoiceRecordingStartedAt(null);
    setVoiceRecordingDuration(0);
    setErrorMessage("");
  }

  function toggleVoiceRecording() {
    if (isRecordingVoice) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  }

  async function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    for (const file of files) {
      await sendAttachment(file);
    }

    event.target.value = "";
  }

  async function deleteMessage(message: MessageRow) {
    setMessageContextMenu(null);
    setMessageDeleteTarget(null);

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
      removeLocalPinnedMessageId(message.id, message.user_id === user.id ? selectedChatUserId : message.user_id);
      setSelectedMessageIds((currentIds) =>
        currentIds.filter((id) => id !== message.id),
      );
      setErrorMessage("");
    }
  }

  function hideMessageForMe(message: MessageRow) {
    if (!user) {
      return;
    }

    setHiddenMessageIds((currentIds) => {
      const nextIds = currentIds.includes(message.id)
        ? currentIds
        : [...currentIds, message.id];

      window.localStorage.setItem(
        `twinline-hidden-messages-${user.id}`,
        JSON.stringify(nextIds),
      );

      return nextIds;
    });
    setMessageDeleteTarget(null);
    removeLocalPinnedMessageId(message.id, message.user_id === user.id ? selectedChatUserId : message.user_id);
    setSelectedMessageIds((currentIds) =>
      currentIds.filter((id) => id !== message.id),
    );
    setErrorMessage("");
  }

  if (isAuthLoading) {
    return (
      <main className="grid h-dvh place-items-center bg-[#050505] text-[#f4f4f5]">
        <p className="text-[13px] font-medium text-[#a1a1aa]">Загружаю Hush...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={`hush-shell ${isLightThemeEnabled ? "hush-light" : ""} relative grid h-dvh place-items-center overflow-hidden bg-[#050505] px-4 text-[#f4f4f5]`}>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(244,244,245,0.12),transparent_32%),linear-gradient(135deg,#050505_0%,#111111_48%,#000000_100%)]"
        />
        <section className="relative w-full max-w-[min(28rem,calc(100vw-1.5rem))] rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/86 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md sm:rounded-3xl sm:p-5">
          <div className="mb-5 flex items-center gap-3 sm:mb-6">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-white sm:h-11 sm:w-11">
              <Image
                alt="Hush"
                className="h-full w-full object-cover"
                height={44}
                src="/hush-logo.png"
                width={44}
              />
            </div>
            <div>
              <h1 className="text-lg font-medium sm:text-xl">Hush</h1>
              <p className="text-[13px] text-[#a1a1aa]">Вход в приватное пространство</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 rounded-xl border border-[#3f3f46]/35 bg-black/20 p-1">
            <button
              className={`rounded-lg px-4 py-2 text-[13px] font-medium ${
                authMode === "sign-in"
                  ? "bg-[#f4f4f5] text-[#050505]"
                  : "text-[#f4f4f5]"
              }`}
              onClick={() => {
                setAuthMode("sign-in");
                setErrorMessage("");
                setAuthUsernameError("");
              }}
              type="button"
            >
              Вход
            </button>
            <button
              className={`rounded-lg px-4 py-2 text-[13px] font-medium ${
                authMode === "sign-up"
                  ? "bg-[#f4f4f5] text-[#050505]"
                  : "text-[#f4f4f5]"
              }`}
              onClick={() => {
                setAuthMode("sign-up");
                setErrorMessage("");
                setAuthUsernameError("");
              }}
              type="button"
            >
              Регистрация
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 rounded-xl border border-[#3f3f46]/35 bg-black/20 p-1">
            {[
              { label: "Почта", method: "email" as const },
              { label: "Телефон", method: "phone" as const },
            ].map((item) => (
              <button
                className={`rounded-lg px-4 py-2 text-[13px] font-medium transition ${
                  authContactMethod === item.method
                    ? "bg-[#f4f4f5] text-[#050505]"
                    : "text-[#f4f4f5] hover:bg-white/10"
                }`}
                key={item.method}
                onClick={() => {
                  setAuthContactMethod(item.method);
                  setErrorMessage("");
                  setAuthUsernameError("");
                }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <form className="grid gap-3" onSubmit={handleAuth}>
            {authMode === "sign-up" ? (
              <label className="grid gap-1.5">
                <div className="flex min-h-11 items-center rounded-xl border border-transparent bg-[#f4f4f5]/12 px-4 text-sm focus-within:border-[#f4f4f5] sm:min-h-12">
                  <span className="shrink-0 font-medium text-[#a1a1aa]">@</span>
                  <input
                    aria-label="Никнейм в Hush"
                    className="min-w-0 flex-1 bg-transparent pl-1 outline-none placeholder:text-[#a1a1aa]/70"
                    maxLength={24}
                    minLength={3}
                    onChange={(event) => {
                      setAuthUsername(formatUsernameInput(event.target.value));
                      setAuthUsernameError("");
                    }}
                    placeholder="Никнейм в Hush"
                    type="text"
                    value={authUsername}
                  />
                </div>
                {authUsernameError ? (
                  <span className="text-[13px] font-medium text-red-300">
                    {authUsernameError}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-[#a1a1aa]">
                    По этому нику тебя смогут найти другие пользователи.
                  </span>
                )}
              </label>
            ) : null}
            {authContactMethod === "email" ? (
              <>
                <input
                  className="min-h-11 rounded-xl border border-transparent bg-[#f4f4f5]/12 px-4 text-sm outline-none placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5] sm:min-h-12"
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="Email"
                  type="email"
                  value={authEmail}
                />
                <input
                  className="min-h-11 rounded-xl border border-transparent bg-[#f4f4f5]/12 px-4 text-sm outline-none placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5] sm:min-h-12"
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Пароль"
                  type="password"
                  value={authPassword}
                />
              </>
            ) : (
              <div className="rounded-2xl border border-[#3f3f46]/40 bg-black/22 p-3">
                <div className="flex min-h-11 overflow-hidden rounded-xl border border-[#3f3f46]/35 bg-[#f4f4f5]/12 focus-within:border-[#f4f4f5] sm:min-h-12">
                  <select
                    aria-label="Страна"
                    className="w-24 border-r border-[#3f3f46]/35 bg-transparent px-3 text-sm text-[#f4f4f5] outline-none"
                    defaultValue="+7"
                  >
                    <option className="bg-[#111111]" value="+7">+7</option>
                    <option className="bg-[#111111]" value="+380">+380</option>
                    <option className="bg-[#111111]" value="+375">+375</option>
                    <option className="bg-[#111111]" value="+1">+1</option>
                  </select>
                  <input
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[#a1a1aa]/70"
                    inputMode="tel"
                    onChange={(event) => setAuthPhone(event.target.value)}
                    placeholder="Номер телефона"
                    type="tel"
                    value={authPhone}
                  />
                </div>
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-300/8 p-3 text-[13px] leading-5 text-amber-100">
                  <svg
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 8v5m0 3h.01M10.3 4.3 2.8 17.4A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.6L13.7 4.3a2 2 0 0 0-3.4 0Z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  <p>
                    Вход по телефону почти готов по интерфейсу. SMS-коды, выбор страны и подтверждение подключим следующим шагом.
                  </p>
                </div>
              </div>
            )}
            <button
              className="min-h-11 rounded-xl bg-[#f4f4f5] px-4 text-[13px] font-medium text-[#050505] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:bg-[#52525b] disabled:text-[#a1a1aa] sm:min-h-12"
              disabled={authContactMethod === "phone"}
              type="submit"
            >
              {authContactMethod === "phone"
                ? "Скоро будет доступно"
                : authMode === "sign-in"
                  ? "Войти"
                  : "Создать аккаунт"}
            </button>
          </form>

          {errorMessage ? (
            <p className="mt-4 text-[13px] font-medium text-[#e5e5e5]">
              {errorMessage}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className={`hush-shell ${isLightThemeEnabled ? "hush-light" : ""} relative h-dvh overflow-hidden bg-[#050505] text-[#f4f4f5]`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(244,244,245,0.10),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(245,245,245,0.06),transparent_28%),linear-gradient(135deg,#050505_0%,#111111_46%,#000000_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(245,245,245,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(245,245,245,0.35)_1px,transparent_1px)] [background-size:44px_44px]"
      />
      <div className="relative h-full overflow-hidden bg-[#0a0a0a]/35">
        <div className="safe-bottom flex h-full w-full flex-col overflow-hidden px-1.5 py-1.5 sm:px-3 sm:py-3 lg:px-4 xl:px-5">
          <header className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/82 px-3 py-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4 lg:hidden">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-[0_8px_24px_rgba(244,244,245,0.16)] sm:h-10 sm:w-10">
                <Image
                  alt="Hush"
                  className="h-full w-full object-cover"
                  height={40}
                  src="/hush-logo.png"
                  width={40}
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-medium tracking-normal sm:text-xl">
                  Hush
                </h1>
              </div>
            </div>
          </header>

          <nav className="scrollbar-hidden mb-2 flex shrink-0 gap-1.5 overflow-x-auto rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.24)] backdrop-blur-md sm:mb-3 sm:gap-2 sm:rounded-2xl sm:p-2 lg:hidden">
            {[...navItems, settingsNavItem].map((item) => (
              <button
                className={`shrink-0 rounded-lg px-3 py-2 text-[13px] font-medium transition sm:rounded-xl sm:px-4 sm:py-2.5 ${
                  activeView === item.view
                    ? "bg-[#f4f4f5] text-[#050505]"
                    : "text-[#f4f4f5] opacity-80 hover:bg-white/10 hover:opacity-100"
                }`}
                key={item.view}
                onClick={() => {
                  setActiveView(item.view);

                  if (item.view === "messages") {
                    setSelectedChatUserId(null);
                  }
                }}
                type="button"
              >
                <span className="inline-flex items-center gap-2">
                  {item.label}
                  {item.view === "messages" && totalUnreadMessageCount > 0 ? (
                    <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-medium ${
                      activeView === item.view
                        ? "bg-[#050505] text-[#f4f4f5]"
                        : "bg-[#f4f4f5] text-[#050505]"
                    }`}>
                      {totalUnreadMessageCount > 99 ? "99+" : totalUnreadMessageCount}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </nav>

          <section className="grid min-h-0 flex-1 gap-2 overflow-hidden lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]">
            <aside className="hidden min-h-0 flex-col rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/78 p-3 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md lg:flex">
              <div className="mb-5 flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-[0_8px_24px_rgba(244,244,245,0.16)]">
                  <Image
                    alt="Hush"
                    className="h-full w-full object-cover"
                    height={40}
                    src="/hush-logo.png"
                    width={40}
                  />
                </div>
                <h1 className="min-w-0 text-lg font-medium tracking-normal">
                  Hush
                </h1>
              </div>

              <div className="mb-4">
                <label className="flex min-h-10 items-center gap-2 rounded-lg bg-[#f4f4f5]/10 px-3 text-[#a1a1aa] transition focus-within:bg-[#f4f4f5]/14 focus-within:text-[#f4f4f5]">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  <input
                    aria-label="User search by username"
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[#f4f4f5] outline-none placeholder:text-[#a1a1aa]/75"
                    onChange={(event) => setChatSearchQuery(event.target.value)}
                    placeholder="Найти..."
                    type="text"
                    value={chatSearchQuery}
                  />
                </label>
                {chatSearchQuery.trim().length > 0 ? (
                  <div className="mt-2 grid max-h-64 gap-1.5 overflow-y-auto pr-1">
                    {chatSearchQuery.trim().replace(/^@+/, "").length < 2 ? (
                      <p className="px-2 py-1 text-xs text-[#a1a1aa]">
                        {"\u0412\u0432\u0435\u0434\u0438 \u043c\u0438\u043d\u0438\u043c\u0443\u043c 2 \u0441\u0438\u043c\u0432\u043e\u043b\u0430 \u043f\u043e\u0441\u043b\u0435 @."}
                      </p>
                    ) : searchableProfiles.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-[#a1a1aa]">
                        {"\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d."}
                      </p>
                    ) : (
                      searchableProfiles.map((profile) => (
                        <button
                          className="flex items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-[#f4f4f5]/10"
                          key={"search-" + profile.user_id}
                          onClick={() => {
                            setViewedProfile({
                              avatarUrl: profile.avatar_url,
                              name: profile.display_name,
                              username: profile.username,
                              updatedAt: profile.updated_at,
                              userId: profile.user_id,
                            });
                            setChatSearchQuery("");
                            setUnreadMessageCount(0);
                          }}
                          type="button"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-xs font-medium text-[#050505]">
                            {profile.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                alt={"Avatar " + profile.display_name}
                                className="h-full w-full object-cover"
                                src={profile.avatar_url}
                              />
                            ) : (
                              profile.display_name[0]?.toUpperCase()
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium text-[#f4f4f5]">
                              {profile.display_name}
                            </span>
                            <span className="block truncate text-xs text-[#a1a1aa]">
                              {profile.username ? "@" + profile.username : "@\u043d\u0438\u043a \u043f\u043e\u043a\u0430 \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d"}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>

              <div className="mb-4">
                <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-[#e5e5e5]">
                  Меню
                </p>
              </div>

              <nav className="grid gap-2">
                {navItems.map((item) => (
                  <button
                    className={`rounded-xl px-4 py-2.5 text-left text-[13px] font-medium transition ${
                      activeView === item.view
                        ? "bg-[#f4f4f5] text-[#050505]"
                        : "text-[#f4f4f5] opacity-80 hover:bg-white/10 hover:opacity-100"
                    }`}
                    key={item.view}
                    onClick={() => {
                      setActiveView(item.view);

                      if (item.view === "messages") {
                        setSelectedChatUserId(null);
                      }
                    }}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span>{item.label}</span>
                      {item.view === "messages" && totalUnreadMessageCount > 0 ? (
                        <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-medium ${
                          activeView === item.view
                            ? "bg-[#050505] text-[#f4f4f5]"
                            : "bg-[#f4f4f5] text-[#050505]"
                        }`}>
                          {totalUnreadMessageCount > 99 ? "99+" : totalUnreadMessageCount}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </nav>
              <button
                className={`mt-auto rounded-xl px-4 py-2.5 text-left text-[13px] font-medium transition ${
                  activeView === settingsNavItem.view
                    ? "bg-[#f4f4f5] text-[#050505]"
                    : "border border-[#3f3f46]/25 text-[#f4f4f5] opacity-80 hover:bg-white/10 hover:opacity-100"
                }`}
                onClick={() => setActiveView(settingsNavItem.view)}
                type="button"
              >
                {settingsNavItem.label}
              </button>
            </aside>

            {activeView === "profile" ? (
              <div className="min-h-0 overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[#3f3f46]/35 pb-3 sm:mb-4 sm:gap-4 sm:pb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      className="grid h-[82px] w-[82px] shrink-0 place-items-center overflow-hidden rounded-[24px] bg-[#18181b] text-xl font-medium text-[#f4f4f5] transition hover:scale-[1.03] focus:outline-none sm:h-[96px] sm:w-[96px] sm:rounded-[28px] sm:text-2xl"
                      onClick={() => openAvatarGallery(currentProfile?.avatar_url)}
                      type="button"
                    >
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
                    </button>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-medium sm:text-xl">
                        {activeUserName}
                      </h2>
                      <p className="mt-0.5 text-[13px] font-medium text-[#a1a1aa]">
                        {currentProfile?.username ? `@${currentProfile.username}` : "@ник не задан"}
                      </p>
                      <input
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                        ref={avatarInputRef}
                        type="file"
                      />
                      <button
                        className="mt-2 rounded-xl border border-[#3f3f46]/35 px-3 py-1.5 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isUploadingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                        type="button"
                      >
                        {isUploadingAvatar ? "Загружаю..." : "Изменить аватарку"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <section className="rounded-xl border border-[#3f3f46]/35 bg-black/20 px-3 py-2.5 sm:col-span-2 sm:rounded-2xl">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#e5e5e5]">
                      Имя профиля
                    </p>
                    <form className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={updateProfileName}>
                      <input
                        className="min-h-9 rounded-xl border border-transparent bg-[#f4f4f5]/12 px-3 text-[13px] outline-none placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5] disabled:cursor-not-allowed disabled:opacity-60"
                        maxLength={24}
                        minLength={2}
                        onChange={(event) => setProfileName(event.target.value)}
                        placeholder="Новое имя"
                        type="text"
                        value={profileNameInputValue}
                      />
                      <button
                        className="min-h-9 rounded-xl bg-[#f4f4f5] px-4 text-[13px] font-medium text-[#050505] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:bg-[#52525b]"
                        disabled={
                          !profileName.trim() ||
                          profileName.trim() === activeUserName
                        }
                        type="submit"
                      >
                        Сохранить имя
                      </button>
                    </form>
                  </section>

                  <section className="rounded-xl border border-[#3f3f46]/35 bg-black/20 px-3 py-2.5 sm:col-span-2 sm:rounded-2xl">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#e5e5e5]">
                      Ник Hush
                    </p>
                    <form className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={updateProfileUsername}>
                      <label className="flex min-h-9 items-center rounded-xl border border-transparent bg-[#f4f4f5]/12 px-3 text-[13px] focus-within:border-[#f4f4f5]">
                        <span className="font-medium text-[#a1a1aa]">@</span>
                        <input
                          aria-label="Ник Hush"
                          className="min-w-0 flex-1 bg-transparent pl-1 outline-none placeholder:text-[#a1a1aa]/70"
                          maxLength={24}
                          minLength={3}
                          onChange={(event) => {
                            setProfileUsername(formatUsernameInput(event.target.value));
                            setProfileUsernameError("");
                          }}
                          placeholder="m1trond"
                          type="text"
                          value={profileUsernameInputValue}
                        />
                      </label>
                      <button
                        className="min-h-9 rounded-xl bg-[#f4f4f5] px-4 text-[13px] font-medium text-[#050505] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:bg-[#52525b]"
                        disabled={
                          !profileUsernameInputValue.trim() ||
                          normalizeUsername(profileUsernameInputValue) === currentProfile?.username
                        }
                        type="submit"
                      >
                        Сохранить ник
                      </button>
                    </form>
                    <p className={`mt-1.5 text-xs leading-5 ${profileUsernameError ? "font-medium text-red-300" : "text-[#a1a1aa]"}`}>
                      {profileUsernameError ||
                        (isUsernameChangeAllowed
                          ? "Ник можно менять один раз в месяц."
                          : `Ник снова можно будет изменить ${nextUsernameChangeDate ?? "позже"}.`)}
                    </p>
                  </section>

                  <section className="rounded-xl border border-[#3f3f46]/35 bg-black/20 px-3 py-2.5 sm:rounded-2xl">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#e5e5e5]">
                      Email
                    </p>
                    <p className="mt-1.5 break-words text-[13px] font-medium">
                      {user.email}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#a1a1aa]">
                      Его видишь только ты в своём аккаунте.
                    </p>
                  </section>

                  <section className="rounded-xl border border-[#3f3f46]/35 bg-black/20 px-3 py-2.5 sm:rounded-2xl">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#e5e5e5]">
                      Телефон
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(120px,0.36fr)_1fr_auto]">
                      <select
                        aria-label="Страна"
                        className="min-h-9 rounded-xl border border-transparent bg-[#f4f4f5]/12 px-3 text-[13px] outline-none focus:border-[#f4f4f5]"
                        defaultValue="+7"
                      >
                        <option value="+7">RU +7</option>
                        <option value="+375">BY +375</option>
                        <option value="+380">UA +380</option>
                        <option value="+1">US +1</option>
                        <option value="+49">DE +49</option>
                      </select>
                      <input
                        aria-label="Номер телефона"
                        className="min-h-9 rounded-xl border border-transparent bg-[#f4f4f5]/12 px-3 text-[13px] outline-none placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5]"
                        inputMode="tel"
                        placeholder="999 123-45-67"
                        type="tel"
                      />
                      <button
                        className="min-h-9 rounded-xl bg-[#52525b] px-4 text-[13px] font-medium text-[#050505] opacity-70"
                        disabled
                        type="button"
                      >
                        Скоро
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-[#a1a1aa]">
                      Позже подключим вход и регистрацию по SMS.
                    </p>
                  </section>

                </div>
              </div>
            ) : activeView === "favorites" ? (
              <div className="flex min-h-0 flex-col overflow-hidden">
                <div className="mb-2 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 px-3 py-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4 sm:py-3">
                  <h2 className="text-lg font-medium sm:text-xl">
                    Избранное
                  </h2>
                </div>

                {pinnedFavoriteItem ? (
                  <article className="mb-2 flex shrink-0 items-center gap-2.5 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/82 px-3 py-2.5 text-left shadow-[0_14px_45px_rgba(0,0,0,0.22)] backdrop-blur-md sm:mb-3 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f4f4f5]/18 text-[#e5e5e5] sm:h-9 sm:w-9 sm:rounded-xl">
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="m14.5 4.5 5 5-3.4 1.1-4.8 4.8.7 3.6-7-7 3.6.7 4.8-4.8 1.1-3.4Z"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                        <path
                          d="m9.5 14.5-4 4"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-medium uppercase tracking-[0.16em] text-[#e5e5e5]">
                        Закреплено
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] font-medium text-[#f4f4f5]">
                        {getReadableMessageText(pinnedFavoriteItem.text)}
                      </span>
                    </div>
                    <button
                      className="min-h-9 shrink-0 rounded-lg border border-[#3f3f46]/35 px-2.5 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10 sm:min-h-10 sm:rounded-xl sm:px-4"
                      onClick={() => setPinnedFavoriteItem(null)}
                      type="button"
                    >
                      Открепить
                    </button>
                  </article>
                ) : null}

                <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#050505]/82 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-4">
                  {favoriteItems.length === 0 ? (
                    <div className="grid flex-1 place-items-center text-center">
                      <div className="max-w-sm rounded-2xl border border-dashed border-[#3f3f46]/45 bg-black/20 p-5">
                        <p className="text-sm font-medium">
                          Избранное пока пустое
                        </p>
                        <p className="mt-2 text-[13px] leading-6 text-[#a1a1aa]">
                          Напиши сюда первую заметку или прикрепи файл.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {favoriteItems.map((favoriteItem, favoriteItemIndex) => {
                    const previousFavoriteItem = favoriteItems[favoriteItemIndex - 1];
                    const nextFavoriteItem = favoriteItems[favoriteItemIndex + 1];
                    const isPreviousSameAuthor = previousFavoriteItem?.user_id === favoriteItem.user_id;
                    const isNextSameAuthor = nextFavoriteItem?.user_id === favoriteItem.user_id;
                    const isSelected = selectedMessageIdSet.has(favoriteItem.id);
                    const reply = getMessageReply(favoriteItem.text);
                    const displayText = reply?.body ?? favoriteItem.text;
                    const imageUrl = getMessageImageUrl(displayText);
                    const videoUrl = getMessageVideoUrl(displayText);
                    const audioUrl = getMessageAudioUrl(displayText);
                    const filePayload = getMessageFilePayload(displayText);
                    const callDurationSeconds = getMessageCallDuration(displayText);
                    const sticker = getMessageSticker(displayText);
                    const hasFramedMedia = Boolean(imageUrl || videoUrl || filePayload);
                    const hasAttachment = Boolean(
                      imageUrl || videoUrl || audioUrl || filePayload || callDurationSeconds !== null || sticker,
                    );
                    const hasStandaloneBubble = Boolean(
                      audioUrl || filePayload || callDurationSeconds !== null || sticker,
                    );

                    return (
                      <article
                        className={`-mx-1 flex items-end justify-end gap-1.5 rounded-xl px-1 py-1 transition sm:gap-2 sm:rounded-2xl ${
                          isPreviousSameAuthor ? "mt-1" : "mt-3"
                        }`}
                        key={favoriteItem.id}
                        onContextMenu={(event) => openFavoriteContextMenu(event, favoriteItem)}
                      >
                        <div
                          className={`relative max-w-[min(84vw,92%)] rounded-[18px] sm:max-w-[72%] sm:rounded-[20px] ${
                            hasStandaloneBubble
                              ? "bg-transparent p-0 text-[#f4f4f5] shadow-none"
                              : hasFramedMedia
                                ? "bg-transparent p-0 text-[#f4f4f5] shadow-none"
                              : `bg-[#f4f4f5] text-[#050505] shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${
                                  hasAttachment ? "p-1.5 sm:p-2" : "px-3 py-2 sm:px-3.5 sm:py-2.5"
                                } ${isPreviousSameAuthor ? "rounded-tr-lg" : ""} ${
                                  isNextSameAuthor ? "rounded-br-lg" : "rounded-br-md"
                                }`
                          } ${isSelected ? "ring-2 ring-[#f4f4f5]/80" : ""}`}
                        >
                          {reply ? (
                            <div className="hush-reply-preview mb-2 block w-full rounded-xl border-l-4 border-[#050505]/45 bg-[#050505]/12 px-3 py-2 text-left">
                              <p className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-55">
                                {reply.author}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-xs font-medium opacity-70">
                                {reply.text}
                              </p>
                            </div>
                          ) : null}

                          {imageUrl ? (
                            <button
                              className="block w-full overflow-hidden rounded-lg sm:rounded-xl"
                              onClick={() => setSelectedImageUrl(imageUrl)}
                              type="button"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                alt="Избранное изображение"
                                className="max-h-[58dvh] w-full object-cover sm:max-h-[420px]"
                                src={imageUrl}
                              />
                            </button>
                          ) : videoUrl ? (
                            <video
                              className="max-h-[58dvh] w-full rounded-lg bg-black sm:max-h-[420px] sm:rounded-xl"
                              controls
                              controlsList="nodownload"
                              preload="metadata"
                              src={videoUrl}
                            />
                          ) : audioUrl ? (
                            <VoiceMessage
                              isMine
                              sentAt={favoriteItem.created_at}
                              src={audioUrl}
                            />
                          ) : filePayload ? (
                            <FileAttachment file={filePayload} isMine />
                          ) : callDurationSeconds !== null ? (
                            <div className="min-w-[min(230px,70vw)] rounded-xl bg-[#262626] px-3 py-2 text-[#f4f4f5] sm:min-w-[min(260px,70vw)] sm:rounded-2xl">
                              <p className="text-[13px] font-medium opacity-75">
                                Звонок
                              </p>
                              <p className="text-xs font-medium opacity-60">
                                Разговор {formatCallDuration(callDurationSeconds)}
                              </p>
                            </div>
                          ) : sticker ? (
                            <div className="px-1 py-0.5">
                              <span className="block text-6xl leading-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.25)] sm:text-7xl">
                                {sticker}
                              </span>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap break-words text-[13px] leading-6 sm:text-[15px]">
                              {displayText}
                              <span className="ml-2 inline-flex translate-y-[1px] items-center gap-1 align-baseline">
                                <span className="text-[11px] font-medium leading-none text-[#404040]">
                                  {formatMessageTime(favoriteItem.created_at)}
                                </span>
                              </span>
                            </p>
                          )}

                          {!hasStandaloneBubble && hasAttachment ? (
                            <div className="mt-2 flex items-center justify-end gap-3 px-1">
                              <p className={`text-right text-[11px] font-medium ${hasFramedMedia ? "text-[#a1a1aa]" : "text-[#404040]"}`}>
                                {formatMessageTime(favoriteItem.created_at)}
                              </p>
                            </div>
                          ) : null}
                        </div>

                      </article>
                    );
                  })}
                </div>

                {isSelectedChatBlocked ? (
                  <div className="mt-2 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/82 p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl">
                    {isSelectedChatBlockedByMe ? (
                      <button
                        className="min-h-11 w-full rounded-lg bg-[#f4f4f5] px-4 text-[13px] font-medium text-[#050505] transition hover:bg-[#e5e5e5] sm:rounded-xl"
                        onClick={() => {
                          if (selectedChatUserId && friendProfile?.name) {
                            requestBlockChange(
                              selectedChatUserId,
                              friendProfile.username
                                ? `@${friendProfile.username}`
                                : friendProfile.name,
                            );
                          }
                        }}
                        type="button"
                      >
                        Разблокировать
                      </button>
                    ) : (
                      <div className="flex min-h-11 items-center justify-center rounded-lg bg-[#f4f4f5]/12 px-4 text-[13px] font-medium text-[#a1a1aa] sm:rounded-xl">
                        Вы были заблокированы
                      </div>
                    )}
                  </div>
                ) : !isPinnedMessagesViewOpen ? (
                <form
                  className="mt-2 grid grid-cols-[auto_1fr_auto_auto_auto] gap-1.5 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/82 p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:flex sm:gap-2 sm:rounded-2xl"
                  onSubmit={sendMessage}
                >
                  <input
                    className="hidden"
                    multiple
                    onChange={handleAttachmentChange}
                    ref={imageInputRef}
                    type="file"
                  />
                  <button
                    aria-label="Прикрепить файл"
                    className="grid min-h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 bg-[#f4f4f5]/12 text-[#f4f4f5] transition hover:bg-[#f4f4f5]/18 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isUploadingAttachment || isRecordingVoice}
                    onClick={() => imageInputRef.current?.click()}
                    type="button"
                  >
                    {isUploadingAttachment ? (
                      <span className="h-4 w-4 rounded-full border-2 border-[#f4f4f5] border-t-transparent" />
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

                  {isRecordingVoice ? (
                    <div className="relative col-span-3 flex min-h-10 min-w-0 flex-1 items-center rounded-lg border border-red-400/35 bg-red-500/10 px-3 text-[13px] text-[#f4f4f5] sm:col-span-1">
                      <div className="flex min-w-[86px] items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300 shadow-[0_0_14px_rgba(252,165,165,0.65)]" />
                        <span className="font-medium tabular-nums text-red-100">
                          {formatAudioTime(voiceRecordingDuration)}
                        </span>
                      </div>
                      <button
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg px-4 py-2 text-xs font-medium text-[#e5e5e5] transition hover:bg-white/10 hover:text-[#f4f4f5]"
                        onClick={cancelVoiceRecording}
                        type="button"
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        aria-label="Текст избранного"
                        className="min-h-10 min-w-0 flex-1 rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm text-[#f4f4f5] outline-none transition placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5] focus:bg-[#f4f4f5]/18 sm:px-4 sm:text-[13px]"
                        onChange={handleMessageTextChange}
                        placeholder={
                          editingMessage
                            ? "Измени сообщение..."
                            : replyTarget
                              ? "Ответь на сообщение..."
                              : "Напиши в избранное..."
                        }
                        ref={messageInputRef}
                        type="text"
                        value={messageText}
                      />
                      <button
                        aria-label="Стикеры"
                        className="grid min-h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 bg-[#f4f4f5]/12 text-[#f4f4f5] transition hover:bg-[#f4f4f5]/18 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isUploadingAttachment}
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
                    </>
                  )}

                  <button
                    aria-label={isRecordingVoice ? "Отправить голосовое" : "Записать голосовое"}
                    className={`relative grid min-h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border text-[#f4f4f5] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isRecordingVoice
                        ? "border-red-400/60 bg-red-500/85 text-white hover:bg-red-400"
                        : "border-[#3f3f46]/35 bg-[#f4f4f5]/12 hover:bg-[#f4f4f5]/18"
                    }`}
                    disabled={isUploadingAttachment}
                    onClick={toggleVoiceRecording}
                    style={
                      isRecordingVoice
                        ? {
                            boxShadow: `0 0 ${16 + voiceInputLevel * 46}px rgba(248,113,113,${0.34 + voiceInputLevel * 0.58})`,
                            transform: `scale(${1 + voiceInputLevel * 0.14})`,
                          }
                        : undefined
                    }
                    type="button"
                  >
                    {isRecordingVoice ? (
                      <svg
                        aria-hidden="true"
                        className="relative h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M5 12 19 4l-3.8 16-3.6-6.1L5 12Z" />
                      </svg>
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
                </form>
                ) : null}

                {replyTarget || editingMessage ? (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#3f3f46]/35 bg-[#111111]/82 px-3 py-2.5 text-[13px] shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-md sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#e5e5e5]">
                        {editingMessage ? "Редактирование" : "Ответ"}
                      </p>
                      <p className="mt-1 truncate font-medium text-[#f4f4f5]">
                        {getReadableMessageText((editingMessage ?? replyTarget)?.text ?? "")}
                      </p>
                    </div>
                    <button
                      className="shrink-0 rounded-xl border border-[#3f3f46]/35 px-3 py-2 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10"
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
              </div>            ) : activeView === "settings" ? (
              <div className="min-h-0 overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-5">
                <div className="mb-4 border-b border-[#3f3f46]/35 pb-4 sm:mb-5 sm:pb-5">
                  <div>
                    <h2 className="text-lg font-medium sm:text-xl">
                      Настройки
                    </h2>
                    <p className="mt-1 text-[13px] leading-5 text-[#a1a1aa]">
                      Уведомления, приватность, аккаунт и внешний вид.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
                  <section className="rounded-xl border border-[#3f3f46]/35 bg-black/20 p-3 sm:rounded-2xl sm:p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f4f4f5]/10 text-[#f4f4f5]">
                        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-sm font-medium">Уведомления</p>
                        <p className="text-xs text-[#a1a1aa]">Общие и личные уведомления.</p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#3f3f46]/30 bg-[#050505]/42 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium">Браузерные уведомления</p>
                          <p className="mt-0.5 text-xs leading-5 text-[#a1a1aa]">
                            Новые сообщения, если чат не открыт.
                          </p>
                        </div>
                        <button
                          aria-label="Переключить уведомления"
                          className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
                            areNotificationsEnabled
                              ? "justify-end bg-[#f4f4f5]"
                              : "justify-start bg-[#f4f4f5]/18"
                          }`}
                          onClick={toggleNotifications}
                          type="button"
                        >
                          <span className={`h-5 w-5 rounded-full transition ${
                            areNotificationsEnabled ? "bg-[#050505]" : "bg-[#f4f4f5]"
                          }`} />
                        </button>
                      </div>
                      <div className="rounded-xl border border-[#3f3f46]/30 bg-[#050505]/42 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[13px] font-medium">Отключенные чаты</p>
                            <p className="mt-0.5 text-xs leading-5 text-[#a1a1aa]">
                              Управляются в профиле каждого пользователя.
                            </p>
                          </div>
                          <span className="rounded-full bg-[#f4f4f5]/10 px-2.5 py-1 text-xs font-medium text-[#e5e5e5]">
                            {Object.keys(pruneMutedProfiles(mutedProfiles)).length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#3f3f46]/35 bg-black/20 p-3 sm:rounded-2xl sm:p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f4f4f5]/10 text-[#f4f4f5]">
                        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          <path d="m9.5 12 1.8 1.8L15 10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-sm font-medium">Приватность</p>
                        <p className="text-xs text-[#a1a1aa]">Что видно другим людям.</p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {[
                        {
                          description: "Показывать статус в сети и последний онлайн в профиле.",
                          enabled: isOnlineStatusVisible,
                          key: "hush-settings-online-status-visible",
                          label: "Показывать онлайн",
                          setter: setIsOnlineStatusVisible,
                        },
                        {
                          description: "Разрешить показывать телефон в профиле, когда подключим номер.",
                          enabled: isPhoneVisible,
                          key: "hush-settings-phone-visible",
                          label: "Показывать телефон",
                          setter: setIsPhoneVisible,
                        },
                        {
                          description: "Другие смогут найти тебя по @никнейму.",
                          enabled: isProfileSearchable,
                          key: "hush-settings-profile-searchable",
                          label: "Поиск по нику",
                          setter: setIsProfileSearchable,
                        },
                      ].map((setting) => (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#3f3f46]/30 bg-[#050505]/42 px-3 py-2.5" key={setting.key}>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium">{setting.label}</p>
                            <p className="mt-0.5 text-xs leading-5 text-[#a1a1aa]">{setting.description}</p>
                          </div>
                          <button
                            aria-label={setting.label}
                            className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
                              setting.enabled
                                ? "justify-end bg-[#f4f4f5]"
                                : "justify-start bg-[#f4f4f5]/18"
                            }`}
                            onClick={() =>
                              toggleStoredBooleanSetting(setting.key, setting.setter, setting.enabled)
                            }
                            type="button"
                          >
                            <span className={`h-5 w-5 rounded-full transition ${
                              setting.enabled ? "bg-[#050505]" : "bg-[#f4f4f5]"
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#3f3f46]/35 bg-black/20 p-3 sm:rounded-2xl sm:p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/12 text-red-100">
                        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <path d="M6.5 6.5 17.5 17.5M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-sm font-medium">Черный список</p>
                        <p className="text-xs text-[#a1a1aa]">Заблокированные пользователи.</p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {blockedByMeProfiles.length === 0 ? (
                        <div className="rounded-xl border border-[#3f3f46]/30 bg-[#050505]/42 px-3 py-3 text-[13px] text-[#a1a1aa]">
                          Черный список пуст.
                        </div>
                      ) : null}

                      {blockedByMeProfiles.map((profile) => (
                        <div
                          className="flex items-center justify-between gap-3 rounded-xl border border-[#3f3f46]/30 bg-[#050505]/42 px-3 py-2.5"
                          key={profile.userId}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-[12px] font-medium text-[#050505]">
                              {profile.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  alt={`Аватар ${profile.name}`}
                                  className="h-full w-full object-cover"
                                  src={profile.avatarUrl}
                                />
                              ) : (
                                profile.name[0]?.toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-[#f4f4f5]">
                                {profile.name}
                              </p>
                              <p className="truncate text-xs text-[#a1a1aa]">
                                {profile.username ? `@${profile.username}` : "ник не выбран"}
                              </p>
                            </div>
                          </div>
                          <button
                            className="shrink-0 rounded-xl border border-[#3f3f46]/40 px-3 py-2 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10"
                            onClick={() => requestBlockChange(profile.userId, profile.name)}
                            type="button"
                          >
                            Разблокировать
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#3f3f46]/35 bg-black/20 p-3 sm:rounded-2xl sm:p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f4f4f5]/10 text-[#f4f4f5]">
                        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-sm font-medium">Аккаунт</p>
                        <p className="text-xs text-[#a1a1aa]">Данные входа и сессия.</p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className="rounded-xl border border-[#3f3f46]/30 bg-[#050505]/42 px-3 py-2.5">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a1a1aa]">Email</p>
                        <p className="mt-1 truncate text-[13px] font-medium text-[#f4f4f5]">
                          {user.email ?? "Не указан"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#3f3f46]/30 bg-[#050505]/42 px-3 py-2.5">
                        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a1a1aa]">Профиль</p>
                        <p className="mt-1 truncate text-[13px] font-medium text-[#f4f4f5]">
                          {activeUserName} {currentProfile?.username ? `· @${currentProfile.username}` : ""}
                        </p>
                      </div>
                      <button
                        className="mt-1 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-500/15 px-4 text-[13px] font-medium text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSigningOut}
                        onClick={handleSignOut}
                        type="button"
                      >
                        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <path d="M10 7V5.5A2.5 2.5 0 0 1 12.5 3h5A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 10 18.5V17M4 12h11m0 0-3.5-3.5M15 12l-3.5 3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                        {isSigningOut ? "Выходим..." : "Выйти из аккаунта"}
                      </button>
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#3f3f46]/35 bg-black/20 p-3 sm:rounded-2xl sm:p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f4f4f5]/10 text-[#f4f4f5]">
                        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <path d="M4 12a8 8 0 0 1 8-8h1a3 3 0 0 1 0 6h-1a2 2 0 0 0 0 4h1a3 3 0 0 1 0 6h-1a8 8 0 0 1-8-8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          <path d="M17 8h.01M17 16h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
                        </svg>
                      </span>
                      <div>
                        <p className="text-sm font-medium">Внешний вид</p>
                        <p className="text-xs text-[#a1a1aa]">Поведение интерфейса.</p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {[
                        {
                          description: "\u0421\u0432\u0435\u0442\u043b\u0430\u044f \u043f\u0430\u043b\u0438\u0442\u0440\u0430 \u0434\u043b\u044f \u0432\u0441\u0435\u0433\u043e \u0441\u0430\u0439\u0442\u0430. \u0412\u044b\u0431\u043e\u0440 \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u0435\u0442\u0441\u044f \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435.",
                          enabled: isLightThemeEnabled,
                          key: "hush-settings-light-theme",
                          label: "\u0421\u0432\u0435\u0442\u043b\u0430\u044f \u0442\u0435\u043c\u0430",
                          setter: setIsLightThemeEnabled,
                        },
                        {
                          description: "Мягкие подсветки, блюр и плавные hover-состояния.",
                          enabled: areSoftEffectsEnabled,
                          key: "hush-settings-soft-effects",
                          label: "Плавные эффекты",
                          setter: setAreSoftEffectsEnabled,
                        },
                      ].map((setting) => (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#3f3f46]/30 bg-[#050505]/42 px-3 py-2.5" key={setting.key}>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium">{setting.label}</p>
                            <p className="mt-0.5 text-xs leading-5 text-[#a1a1aa]">{setting.description}</p>
                          </div>
                          <button
                            aria-label={setting.label}
                            className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition ${
                              setting.enabled
                                ? "justify-end bg-[#f4f4f5]"
                                : "justify-start bg-[#f4f4f5]/18"
                            }`}
                            onClick={() =>
                              toggleStoredBooleanSetting(setting.key, setting.setter, setting.enabled)
                            }
                            type="button"
                          >
                            <span className={`h-5 w-5 rounded-full transition ${
                              setting.enabled ? "bg-[#050505]" : "bg-[#f4f4f5]"
                            }`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              selectedChatUserId === null ? (
              <div className="min-h-0 overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-5">
                <div className="mb-3 border-b border-[#3f3f46]/35 pb-3 sm:mb-4 sm:pb-4">
                  <h2 className="text-lg font-medium sm:text-xl">Сообщения</h2>
                </div>

                <div className="grid gap-2">
                  {chatProfiles.length === 0 ? (
                    <article className="rounded-xl border border-dashed border-[#3f3f46]/45 bg-black/20 p-4 text-center sm:rounded-2xl sm:p-6">
                      <p className="text-sm font-medium">Диалогов пока нет</p>
                      <p className="mt-2 text-[13px] leading-6 text-[#a1a1aa]">
                        Найди человека по @нику выше и начни переписку. Новые аккаунты больше не видят чужие чаты.
                      </p>
                    </article>
                  ) : null}

                  {chatProfiles.map((profile) => {
                    const latestProfileMessage = latestVisibleMessageByProfileId.get(profile.user_id);
                    const profileUnreadCount = unreadMessagesByUserId.get(profile.user_id) ?? 0;
                    const previewText = latestProfileMessage
                      ? getChatPreviewText(latestProfileMessage.text)
                      : "Открыть переписку";

                    return (
                      <button
                        className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition hover:border-[#3f3f46]/55 hover:bg-[#f4f4f5]/8 sm:gap-3 sm:rounded-2xl sm:p-3 ${
                          profileUnreadCount > 0
                            ? "border-[#f4f4f5]/20 bg-[#f4f4f5]/10"
                            : "border-transparent bg-[#050505]/52"
                        }`}
                        key={profile.user_id}
                        onClick={() => {
                          setSelectedChatUserId(profile.user_id);
                          setUnreadMessageCount(0);
                        }}
                        onContextMenu={(event) => openChatContextMenu(event, profile)}
                        type="button"
                      >
                        <div className="relative h-10 w-10 shrink-0 sm:h-12 sm:w-12">
                          <div className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-[13px] font-medium text-[#050505] sm:text-sm">
                            {profile.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                alt={`Аватар ${profile.display_name}`}
                                className="h-full w-full object-cover"
                                src={profile.avatar_url}
                              />
                            ) : (
                              profile.display_name[0]?.toUpperCase()
                            )}
                          </div>
                          {isProfileOnline(profile.updated_at) ? (
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#050505] bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)] sm:h-3.5 sm:w-3.5" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-[13px] font-medium text-[#f4f4f5] sm:text-sm">
                              {profile.display_name}
                            </p>
                            {latestProfileMessage ? (
                              <span className="shrink-0 text-[11px] font-medium text-[#a1a1aa] sm:text-xs">
                                {formatMessageTime(latestProfileMessage.created_at)}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <p className={`truncate text-xs sm:text-[13px] ${
                              profileUnreadCount > 0
                                ? "font-medium text-[#f4f4f5]"
                                : "text-[#a1a1aa]"
                            }`}>
                              {profileUnreadCount > 0
                                ? `Непрочитанное от ${profile.display_name}: ${previewText}`
                                : previewText}
                            </p>
                            {profileUnreadCount > 0 ? (
                              <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-[#f4f4f5] px-2 text-xs font-medium text-[#050505]">
                                {profileUnreadCount > 99 ? "99+" : profileUnreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              ) : (
              <div className="flex min-h-0 flex-col overflow-hidden">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                    <button
                      aria-label="Назад к чатам"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 text-[#f4f4f5] transition hover:bg-white/10 sm:rounded-xl"
                      onClick={() => setSelectedChatUserId(null)}
                      type="button"
                    >
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="m15 18-6-6 6-6"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                        />
                      </svg>
                    </button>
                    <button
                      className="relative h-9 w-9 shrink-0 rounded-full transition hover:scale-105 sm:h-10 sm:w-10"
                      onClick={() => {
                        setViewedProfile(
                          friendProfile ?? {
                            avatarUrl: null,
                            name: "Друг",
                            username: null,
                            updatedAt: null,
                            userId: null,
                          },
                        );
                      }}
                      type="button"
                    >
                      <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-[13px] font-medium text-[#050505] sm:text-sm">
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
                      </span>
                      {isProfileOnline(friendProfile?.updatedAt ?? null) ? (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#111111] bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)] sm:h-3.5 sm:w-3.5" />
                      ) : null}
                    </button>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-medium sm:text-lg">
                        {friendProfile?.name ?? "Друг"}
                      </h2>
                      <p className="truncate text-xs text-[#a1a1aa] sm:text-[13px]">
                        {isFriendTyping ? "\u043f\u0435\u0447\u0430\u0442\u0430\u0435\u0442..." : formatLastSeen(friendProfile?.updatedAt ?? null)}
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                    <button
                      aria-label="Удалить переписку"
                      className="grid min-h-9 w-9 place-items-center rounded-lg border border-red-400/45 bg-red-500/15 text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-55 sm:min-h-10 sm:w-10 sm:rounded-xl"
                      disabled={isDeletingChat}
                      onClick={() => {
                        setChatDeleteTargetUserId(selectedChatUserId);
                        setIsChatDeleteDialogOpen(true);
                      }}
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
                      aria-label={callStatus === "idle" ? "Позвонить" : callStatusText}
                      className="grid min-h-9 w-9 place-items-center rounded-lg bg-[#f4f4f5] text-[#050505] transition hover:bg-[#e5e5e5] disabled:cursor-not-allowed disabled:bg-[#52525b] sm:min-h-10 sm:w-10 sm:rounded-xl"
                      disabled={!friendProfile?.userId || callStatus !== "idle"}
                      onClick={() => startCall()}
                      type="button"
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
                    </button>
                  </div>
                </div>
                {isMessageSelectionMode ? (
                  <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/88 px-3 py-2 text-[#f4f4f5] shadow-[0_12px_35px_rgba(0,0,0,0.25)] backdrop-blur-md sm:mb-3">
                    <div className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-[#d4d4d8]">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f4f4f5] text-[#050505]">
                        {selectedDialogMessages.length}
                      </span>
                      <span className="truncate">
                        Выделено сообщений
                      </span>
                    </div>
                    <div className="flex flex-1 justify-end gap-2 sm:flex-none">
                      <button
                        className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-[#3f3f46]/55 bg-[#f4f4f5]/10 px-3 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-[#f4f4f5]/16 sm:flex-none"
                        onClick={forwardSelectedMessages}
                        type="button"
                      >
                        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <path d="m14 6 6 6-6 6M20 12H9a5 5 0 0 0-5 5v1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                        Переслать
                      </button>
                      <button
                        className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-red-400/45 bg-red-500/16 px-3 text-[13px] font-medium text-red-100 transition hover:bg-red-500/25 sm:flex-none"
                        onClick={() => setIsSelectedDeleteDialogOpen(true)}
                        type="button"
                      >
                        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                        Удалить
                      </button>
                    </div>
                  </div>
                ) : null}
                {activePinnedMessages.length > 0 ? (
                  <div className="mb-2 flex min-h-9 shrink-0 overflow-hidden rounded-xl border border-[#3f3f46]/45 bg-[#111111]/82 text-[13px] text-[#e5e5e5] shadow-[0_10px_30px_rgba(0,0,0,0.18)] sm:mb-3">
                    <button
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left transition hover:bg-white/[0.08]"
                      onClick={scrollToNextPinnedMessage}
                      type="button"
                    >
                      <span className="shrink-0 font-medium text-[#f4f4f5]">
                        Закрепы: {activePinnedMessages.length}
                      </span>
                      <span className="min-w-0 truncate text-[#a1a1aa]">
                        {getReadableMessageText(activePinnedMessages.at(-1)?.text ?? "")}
                      </span>
                    </button>
                    <button
                      aria-label="Открыть все закрепы"
                      className={`grid w-14 shrink-0 place-items-center border-l border-[#3f3f46]/35 transition ${
                        isPinnedMessagesViewOpen
                          ? "bg-[#f4f4f5]/14 text-[#f4f4f5]"
                          : "bg-white/[0.03] text-[#d4d4d8] hover:bg-white/[0.08] hover:text-[#f4f4f5]"
                      }`}
                      onClick={() => setIsPinnedMessagesViewOpen((isOpen) => !isOpen)}
                      type="button"
                    >
                      <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 28 24">
                        <path d="m9.2 4.4 4 4-2.4.9-3.7 3.7.4 2.8-5.2-5.2 2.8.4 3.7-3.7.4-2.9Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                        <path d="M16 7.5h8M16 12h8M16 16.5h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                      </svg>
                    </button>
                  </div>
                ) : null}

                <div
                  className="scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-[#050505]/82 p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl sm:p-4"
                  ref={messagesListRef}
                >
                  {isLoadingMessages ? (
                    <p className="text-[13px] text-[#a1a1aa]">Загружаю сообщения...</p>
                  ) : null}

                  {!isLoadingMessages && visibleDialogMessagesCount === 0 ? (
                    <p className="text-[13px] text-[#a1a1aa]">
                      {isPinnedMessagesViewOpen
                        ? "Закрепов пока нет."
                        : "Сообщений пока нет. Напиши первое."}
                    </p>
                  ) : null}

                  {visibleDialogMessages.map((message, messageIndex) => {
                    const isMine = message.user_id === user.id;
                    const previousMessage = visibleDialogMessages[messageIndex - 1];
                    const nextMessage = visibleDialogMessages[messageIndex + 1];
                    const isPreviousSameAuthor =
                      previousMessage?.user_id === message.user_id;
                    const isNextSameAuthor = nextMessage?.user_id === message.user_id;
                    const isSelected = selectedMessageIdSet.has(message.id);
                    const isPinned = activePinnedMessageIdSet.has(message.id);
                    const receiptStatus =
                      isMine && message.id > 0
                        ? messageReceiptStatuses.get(message.id) ?? "delivered"
                        : isMine && message.id < 0
                          ? "delivered"
                          : null;
                    const messageProfile = message.user_id
                      ? profilesByUserId.get(message.user_id)
                      : null;
                    const messageAuthor = messageProfile?.display_name ?? message.author;
                    const shouldShowFriendAvatar = !isMine && !isNextSameAuthor;
                    const shouldShowOwnAvatar = isMine && !isNextSameAuthor;
                    const reply = getMessageReply(message.text);
                    const displayText = reply?.body ?? message.text;
                    const imageUrl = getMessageImageUrl(displayText);
                    const videoUrl = getMessageVideoUrl(displayText);
                    const audioUrl = getMessageAudioUrl(displayText);
                    const filePayload = getMessageFilePayload(displayText);
                    const callDurationSeconds = getMessageCallDuration(displayText);
                    const sticker = getMessageSticker(displayText);
                    const hasFramedMedia = Boolean(imageUrl || videoUrl || filePayload);
                    const hasAttachment = Boolean(
                      imageUrl || videoUrl || audioUrl || filePayload || callDurationSeconds !== null || sticker,
                    );
                    const hasStandaloneBubble = Boolean(
                      audioUrl || filePayload || callDurationSeconds !== null || sticker,
                    );

                    return (
                      <article
                        className={`-mx-1 flex items-end gap-1.5 rounded-xl px-1 py-1 transition-[background-color,box-shadow] duration-300 sm:gap-2 sm:rounded-2xl ${
                          highlightedMessageId === message.id
                            ? "bg-[#f4f4f5]/12 shadow-[0_0_0_2px_rgba(244,244,245,0.26),0_0_38px_rgba(244,244,245,0.12)]"
                            : isSelected
                              ? "bg-[#f4f4f5]/8 shadow-[0_0_0_1px_rgba(244,244,245,0.12)]"
                              : "shadow-[0_0_0_0_rgba(244,244,245,0)]"
                        } ${
                          isPreviousSameAuthor ? "mt-1" : "mt-3"
                        } ${isMine ? "justify-end" : "justify-start"}`}
                        data-message-id={message.id}
                        key={message.id}
                        onClickCapture={(event) => handleMessageSelectionClick(event, message)}
                      >
                        {isMessageSelectionMode && isMine ? (
                          <span
                            className={`mb-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                              isSelected
                                ? "border-[#f4f4f5] bg-[#f4f4f5] text-[#050505]"
                                : "border-[#3f3f46]/70 bg-[#111111]/88 text-transparent"
                            }`}
                          >
                            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
                              <path d="m3.5 8.2 2.8 2.8 6.2-6.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                          </span>
                        ) : null}
                        {!isMine ? (
                          shouldShowFriendAvatar ? (
                            <button
                              className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-[11px] font-medium text-[#050505] transition hover:scale-105 sm:h-8 sm:w-8 sm:text-xs"
                              onClick={() =>
                                setViewedProfile({
                                  avatarUrl: messageProfile?.avatar_url ?? null,
                                  name: messageAuthor,
                                  username: messageProfile?.username ?? null,
                                  updatedAt: messageProfile?.updated_at ?? null,
                                  userId: message.user_id,
                                })
                              }
                              type="button"
                            >
                              {messageProfile?.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  alt="Аватар собеседника"
                                  className="h-full w-full object-cover"
                                  src={messageProfile.avatar_url}
                                />
                              ) : (
                                messageAuthor[0]?.toUpperCase()
                              )}
                            </button>
                          ) : (
                            <span className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
                          )
                        ) : null}
                        {isMessageSelectionMode && !isMine ? (
                          <span
                            className={`mb-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border transition ${
                              isSelected
                                ? "border-[#f4f4f5] bg-[#f4f4f5] text-[#050505]"
                                : "border-[#3f3f46]/70 bg-[#111111]/88 text-transparent"
                            }`}
                          >
                            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
                              <path d="m3.5 8.2 2.8 2.8 6.2-6.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                          </span>
                        ) : null}
                        {isPinned && isMine ? (
                          <span className="mb-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/55 bg-[#111111]/94 text-[#f4f4f5] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20">
                              <path d="m12.8 2.6 4.6 4.6-3 .9-4.5 4.5.5 3.5-6.5-6.5 3.5.5 4.5-4.5.9-3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                              <path d="m8.8 12.4-3.6 3.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                            </svg>
                          </span>
                        ) : null}
                        <div
                          className={`max-w-[min(84vw,92%)] rounded-[18px] sm:max-w-[72%] sm:rounded-[20px] ${
                            hasStandaloneBubble
                              ? "bg-transparent p-0 shadow-none"
                              : hasFramedMedia
                                ? "bg-transparent p-0 shadow-none"
                              : `shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${
                                  hasAttachment ? "p-1.5 sm:p-2" : "px-3 py-2 sm:px-3.5 sm:py-2.5"
                                }`
                          } ${
                            hasStandaloneBubble || hasFramedMedia
                              ? "text-[#f4f4f5]"
                              : isMine
                                ? `bg-[#f4f4f5] text-[#050505] ${
                                  isPreviousSameAuthor ? "rounded-tr-lg" : ""
                                } ${isNextSameAuthor ? "rounded-br-lg" : "rounded-br-md"}`
                                : `bg-[#262626] text-[#f4f4f5] ${
                                  isPreviousSameAuthor ? "rounded-tl-lg" : ""
                                } ${isNextSameAuthor ? "rounded-bl-lg" : "rounded-bl-md"}`
                          } ${isSelected ? "ring-2 ring-[#f4f4f5]/80" : ""}`}
                          onContextMenu={(event) => openMessageContextMenu(event, message)}
                        >
                          {!hasStandaloneBubble && !isMine && !isPreviousSameAuthor ? (
                            <p className={`${hasAttachment ? "mb-1.5 px-1" : "mb-0.5"} text-[11px] font-medium leading-4 opacity-55`}>
                              {messageAuthor}
                            </p>
                          ) : null}
                          {reply ? (
                            <button
                              className={`hush-reply-preview mb-2 block w-full rounded-xl border-l-4 px-3 py-2 text-left transition hover:scale-[1.01] ${
                                isMine
                                  ? "border-[#050505]/45 bg-[#050505]/12 hover:bg-[#050505]/18"
                                  : "border-[#f4f4f5]/45 bg-white/8 hover:bg-white/12"
                              }`}
                              onClick={() => scrollToReplyMessage(reply)}
                              type="button"
                            >
                              <p className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-55">
                                {reply.author}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-xs font-medium opacity-70">
                                {reply.text}
                              </p>
                            </button>
                          ) : null}
                          {imageUrl ? (
                            <button
                              className="block w-full overflow-hidden rounded-lg sm:rounded-xl"
                              onClick={() => setSelectedImageUrl(imageUrl)}
                              type="button"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                alt="Отправленное изображение"
                                className="max-h-[58dvh] w-full object-cover sm:max-h-[420px]"
                                src={imageUrl}
                              />
                            </button>
                        ) : videoUrl ? (
                          <video
                            className="max-h-[58dvh] w-full rounded-lg bg-black sm:max-h-[420px] sm:rounded-xl"
                            controls
                            controlsList="nodownload"
                            preload="metadata"
                            src={videoUrl}
                          />
                        ) : audioUrl ? (
                          <VoiceMessage
                            isMine={isMine}
                            sentAt={message.created_at}
                            src={audioUrl}
                          />
                        ) : filePayload ? (
                          <FileAttachment file={filePayload} isMine={isMine} />
                        ) : callDurationSeconds !== null ? (
                          <div
                            className={`min-w-[min(230px,70vw)] rounded-xl px-3 py-2 sm:min-w-[min(260px,70vw)] sm:rounded-2xl ${
                              isMine ? "bg-[#2f2f2f]" : "bg-[#262626]"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                              <div
                                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f4f4f5] text-[#050505]"
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
                                <p className="text-[13px] font-medium opacity-75">
                                  Звонок
                                </p>
                                <p className="text-xs font-medium opacity-60">
                                  Разговор {formatCallDuration(callDurationSeconds)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : sticker ? (
                          <div className="px-1 py-0.5">
                            <span className="block text-6xl leading-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.25)] sm:text-7xl">
                              {sticker}
                            </span>
                          </div>
                        ) : (
                            <p
                              className="whitespace-pre-wrap break-words text-[13px] leading-6 sm:text-[15px]"
                            >
                              {displayText}
                              <span className="ml-2 inline-flex translate-y-[1px] items-center gap-1 align-baseline">
                                <span
                                  className={`text-[11px] font-medium leading-none ${
                                    isMine ? "text-[#404040]" : "text-[#71717a]"
                                  }`}
                                >
                                  {formatMessageTime(message.created_at)}
                                </span>
                                {receiptStatus ? (
                                  <span
                                    aria-label={
                                      receiptStatus === "read" ? "Прочитано" : "Доставлено"
                                    }
                                    className="inline-flex items-center text-[#262626]"
                                  >
                                    {receiptStatus === "read" ? (
                                      <svg
                                        aria-hidden="true"
                                        className="h-3.5 w-6"
                                        fill="none"
                                        viewBox="0 0 24 16"
                                      >
                                        <path
                                          d="m3 8 3 3 7-7M11 11l8-8"
                                          stroke="currentColor"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                        />
                                      </svg>
                                    ) : (
                                      <svg
                                        aria-hidden="true"
                                        className="h-3.5 w-3.5"
                                        fill="none"
                                        viewBox="0 0 16 16"
                                      >
                                        <path
                                          d="m3 8 3 3 7-7"
                                          stroke="currentColor"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                        />
                                      </svg>
                                    )}
                                  </span>
                                ) : null}
                              </span>
                            </p>
                          )}
                          {!hasStandaloneBubble && hasAttachment ? (
                          <div className={`${hasAttachment ? "mt-2 px-1" : "mt-1"} flex items-center justify-end gap-3`}>
                            <p
                              className={`text-right text-[11px] font-medium ${
                                hasFramedMedia
                                  ? "text-[#a1a1aa]"
                                  : isMine ? "text-[#404040]" : "text-[#71717a]"
                              }`}
                            >
                              {formatMessageTime(message.created_at)}
                            </p>
                            {receiptStatus ? (
                              <span
                                aria-label={
                                  receiptStatus === "read" ? "Прочитано" : "Доставлено"
                                }
                                className={`inline-flex items-center ${hasFramedMedia ? "text-[#a1a1aa]" : "text-[#262626]"}`}
                              >
                                {receiptStatus === "read" ? (
                                  <svg
                                    aria-hidden="true"
                                    className="h-3.5 w-6"
                                    fill="none"
                                    viewBox="0 0 24 16"
                                  >
                                    <path
                                      d="m3 8 3 3 7-7M11 11l8-8"
                                      stroke="currentColor"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 16 16"
                                  >
                                    <path
                                      d="m3 8 3 3 7-7"
                                      stroke="currentColor"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                    />
                                  </svg>
                                )}
                              </span>
                            ) : null}
                          </div>
                          ) : null}
                        </div>
                        {isPinned && !isMine ? (
                          <span className="mb-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/55 bg-[#111111]/94 text-[#f4f4f5] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 20 20">
                              <path d="m12.8 2.6 4.6 4.6-3 .9-4.5 4.5.5 3.5-6.5-6.5 3.5.5 4.5-4.5.9-3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                              <path d="m8.8 12.4-3.6 3.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                            </svg>
                          </span>
                        ) : null}
                        {isMine ? (
                          shouldShowOwnAvatar ? (
                            <button
                              className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-[11px] font-medium text-[#050505] transition hover:scale-105 sm:h-8 sm:w-8 sm:text-xs"
                              onClick={() =>
                                setViewedProfile({
                                  avatarUrl: currentProfile?.avatar_url ?? null,
                                  name: activeUserName,
                                  username: currentProfile?.username ?? null,
                                  updatedAt: currentProfile?.updated_at ?? null,
                                  userId: user.id,
                                })
                              }
                              type="button"
                            >
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
                            </button>
                          ) : (
                            <span className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
                          )
                        ) : null}
                      </article>
                    );
                  })}
                </div>

                {!isPinnedMessagesViewOpen ? (
                <form
                  className="mt-2 grid grid-cols-[auto_1fr_auto_auto_auto] gap-1.5 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/82 p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:flex sm:gap-2 sm:rounded-2xl"
                  onSubmit={sendMessage}
                >
                  <input
                    className="hidden"
                    multiple
                    onChange={handleAttachmentChange}
                    ref={imageInputRef}
                    type="file"
                  />
                  <button
                    aria-label="Прикрепить файл"
                    className="grid min-h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 bg-[#f4f4f5]/12 text-[#f4f4f5] transition hover:bg-[#f4f4f5]/18 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isUploadingAttachment || isRecordingVoice || isSelectedChatBlocked}
                    onClick={() => imageInputRef.current?.click()}
                    type="button"
                  >
                    {isUploadingAttachment ? (
                      <span className="h-4 w-4 rounded-full border-2 border-[#f4f4f5] border-t-transparent" />
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
                  {isRecordingVoice ? (
                    <div className="relative col-span-3 flex min-h-10 min-w-0 flex-1 items-center rounded-lg border border-red-400/35 bg-red-500/10 px-3 text-[13px] text-[#f4f4f5] sm:col-span-1">
                      <div className="flex min-w-[86px] items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-300 shadow-[0_0_14px_rgba(252,165,165,0.65)]" />
                        <span className="font-medium tabular-nums text-red-100">
                          {formatAudioTime(voiceRecordingDuration)}
                        </span>
                      </div>
                      <button
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg px-4 py-2 text-xs font-medium text-[#e5e5e5] transition hover:bg-white/10 hover:text-[#f4f4f5]"
                        onClick={cancelVoiceRecording}
                        type="button"
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        aria-label="Текст сообщения"
                        className="min-h-10 min-w-0 flex-1 rounded-lg border border-transparent bg-[#f4f4f5]/12 px-3 text-sm text-[#f4f4f5] outline-none transition placeholder:text-[#a1a1aa]/70 focus:border-[#f4f4f5] focus:bg-[#f4f4f5]/18 sm:px-4 sm:text-[13px]"
                        disabled={isSelectedChatBlocked}
                        onChange={handleMessageTextChange}
                        placeholder={
                          isSelectedChatBlockedByMe
                            ? "Пользователь заблокирован"
                            : isSelectedChatBlockingMe
                              ? "Вы были заблокированы"
                            : editingMessage
                            ? "Измени сообщение..."
                            : replyTarget
                              ? "Ответь на сообщение..."
                              : "Напиши сообщение..."
                        }
                        ref={messageInputRef}
                        type="text"
                        value={messageText}
                      />
                      <button
                        aria-label="Стикеры"
                        className="grid min-h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#3f3f46]/35 bg-[#f4f4f5]/12 text-[#f4f4f5] transition hover:bg-[#f4f4f5]/18 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isUploadingAttachment || isSelectedChatBlocked}
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
                    </>
                  )}
                  <button
                    aria-label={isRecordingVoice ? "Отправить голосовое" : "Записать голосовое"}
                    className={`relative grid min-h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border text-[#f4f4f5] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isRecordingVoice
                        ? "border-red-400/60 bg-red-500/85 text-white hover:bg-red-400"
                        : "border-[#3f3f46]/35 bg-[#f4f4f5]/12 hover:bg-[#f4f4f5]/18"
                    }`}
                    disabled={isUploadingAttachment || isSelectedChatBlocked}
                    onClick={toggleVoiceRecording}
                    style={
                      isRecordingVoice
                        ? {
                            boxShadow: `0 0 ${16 + voiceInputLevel * 46}px rgba(248,113,113,${0.34 + voiceInputLevel * 0.58})`,
                            transform: `scale(${1 + voiceInputLevel * 0.14})`,
                          }
                        : undefined
                    }
                    type="button"
                  >
                    {isRecordingVoice ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 rounded-lg border border-white/40 transition duration-75"
                          style={{
                            opacity: 0.22 + voiceInputLevel * 0.58,
                            transform: `scale(${0.82 + voiceInputLevel * 0.34})`,
                          }}
                        />
                        <span
                          aria-hidden="true"
                          className="absolute inset-1 rounded-md bg-white/18 transition-transform duration-75"
                          style={{
                            transform: `scale(${0.42 + voiceInputLevel * 0.72})`,
                            opacity: 0.24 + voiceInputLevel * 0.58,
                          }}
                        />
                        <svg
                          aria-hidden="true"
                          className="relative h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M5 12 19 4l-3.8 16-3.6-6.1L5 12Z" />
                        </svg>
                      </>
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
                </form>
                ) : null}

                {isPinnedMessagesViewOpen && activePinnedMessages.length > 0 ? (
                  <button
                    className="mt-2 min-h-11 w-full rounded-xl border border-red-400/25 bg-red-500/10 px-4 text-[13px] font-medium text-red-100 shadow-[0_14px_40px_rgba(0,0,0,0.18)] transition hover:border-red-300/40 hover:bg-red-500/16 sm:rounded-2xl"
                    onClick={() => setIsUnpinAllDialogOpen(true)}
                    type="button"
                  >
                    Открепить {activePinnedMessages.length} сообщений
                  </button>
                ) : null}

                {!isPinnedMessagesViewOpen && (replyTarget || editingMessage) ? (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#3f3f46]/35 bg-[#111111]/82 px-3 py-2.5 text-[13px] shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-md sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#e5e5e5]">
                        {editingMessage ? "Редактирование" : "Ответ"}
                      </p>
                      <p className="mt-1 truncate font-medium text-[#f4f4f5]">
                        {getReadableMessageText((editingMessage ?? replyTarget)?.text ?? "")}
                      </p>
                    </div>
                    <button
                      className="shrink-0 rounded-xl border border-[#3f3f46]/35 px-3 py-2 text-xs font-medium text-[#f4f4f5] transition hover:bg-white/10"
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
                  <p className="mt-2 text-[13px] font-medium text-[#e5e5e5]">
                    {errorMessage}
                  </p>
                ) : null}
              </div>
              )
            )}
          </section>
        </div>
      </div>
      <audio autoPlay playsInline ref={remoteAudioRef} />
      {callStatus !== "idle" ? (
        <aside
          className={`fixed z-[60] cursor-move touch-none rounded-3xl border border-[#3f3f46]/70 bg-[#111111]/96 text-center shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl ${
            isCallPanelCollapsed
              ? "w-[min(286px,calc(100vw-16px))] border-[#3f3f46]/35 bg-[#18181b]/94 p-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.42)]"
              : "w-[min(350px,calc(100vw-16px))] p-3 sm:w-[min(350px,calc(100vw-24px))] sm:p-5"
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
            className={`absolute grid cursor-pointer place-items-center rounded-full text-[#f4f4f5] transition ${
              isCallPanelCollapsed
                ? "right-12 top-1/2 h-9 w-9 -translate-y-1/2 bg-white/[0.06] text-[#a1a1aa] hover:bg-white/12 hover:text-[#f4f4f5]"
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
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e5e5e5] text-lg font-medium text-[#111111] shadow-[0_8px_22px_rgba(0,0,0,0.32)] ring-2 ring-[#f4f4f5]/25">
                {callPanelProfile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Аватар звонка"
                    className="h-full w-full object-cover"
                    draggable={false}
                    src={callPanelProfile.avatarUrl}
                  />
                ) : (
                  callPanelProfile.name[0]?.toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1 select-none rounded-2xl py-1 text-left">
                <p className="truncate text-[13px] font-medium text-[#f4f4f5]">
                  {callPanelProfile.name}
                </p>
                <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-medium text-[#a1a1aa]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f4f4f5] shadow-[0_0_10px_rgba(244,244,245,0.55)]" />
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
              <div className="mx-auto mb-3 grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-[#e5e5e5] text-sm font-medium text-[#111111] sm:mb-4 sm:h-24 sm:w-24 sm:text-xl">
                {callPanelProfile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="Аватар звонка"
                    className="h-full w-full object-cover"
                    draggable={false}
                    src={callPanelProfile.avatarUrl}
                  />
                ) : (
                  callPanelProfile.name[0]?.toUpperCase()
                )}
              </div>

              <p className="truncate text-lg font-medium text-[#f4f4f5]">
                {callPanelProfile.name}
              </p>
              <p className="mt-1 text-[13px] font-medium text-[#a1a1aa]">
                {callStatus === "connected"
                  ? formatCallDuration(callDuration)
                  : callStatusText || "00:00"}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:mt-5 sm:gap-3">
                {callStatus === "incoming" ? (
                  <>
                    <button
                      className="min-h-11 rounded-xl bg-[#f4f4f5] px-5 text-[13px] font-medium text-[#050505] transition hover:bg-[#e5e5e5]"
                      onClick={acceptCall}
                      onPointerDown={(event) => event.stopPropagation()}
                      type="button"
                    >
                      Принять
                    </button>
                    <button
                      className="min-h-11 rounded-xl border border-red-400/50 bg-red-500/15 px-5 text-[13px] font-medium text-red-100 transition hover:bg-red-500/25"
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
                          : "border-[#3f3f46]/45 bg-[#f4f4f5]/12 text-[#f4f4f5] hover:bg-white/10"
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
                      className="min-h-12 rounded-full bg-red-500 px-5 text-[13px] font-medium text-white transition hover:bg-red-400"
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
                <p className="mt-4 text-[13px] font-medium text-[#a1a1aa]">
                  {isCallMicMuted ? "Микрофон выключен" : "Микрофон включен"}
                </p>
              ) : null}
            </>
          )}
        </aside>
      ) : null}
      {avatarGalleryUrl ? (
        <div
          className="fixed inset-0 z-[125] flex flex-col bg-black/72 p-3 backdrop-blur-md sm:p-5"
          onClick={() => setAvatarGalleryIndex(null)}
        >
          <div
            className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/82 px-3 py-2 text-[#f4f4f5] shadow-[0_14px_45px_rgba(0,0,0,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="min-w-0">
              <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-[#a1a1aa]">
                {"\u0410\u0432\u0430\u0442\u0430\u0440\u043a\u0438"}
              </p>
              <p className="mt-0.5 text-xs text-[#a1a1aa]">
                {(avatarGalleryIndex ?? 0) + 1} / {avatarGalleryItems.length}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {canDeleteAvatarFromGallery ? (
                <button
                  className="rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-2 text-[13px] font-medium text-red-100 transition hover:bg-red-500/18"
                  onClick={() => setIsAvatarDeleteDialogOpen(true)}
                  type="button"
                >
                  {"\u0423\u0434\u0430\u043b\u0438\u0442\u044c"}
                </button>
              ) : null}
              <button
                className="rounded-xl border border-[#3f3f46]/45 px-4 py-2 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
                onClick={() => setAvatarGalleryIndex(null)}
                type="button"
              >
                {"\u0417\u0430\u043a\u0440\u044b\u0442\u044c"}
              </button>
            </div>
          </div>

          <div
            className="relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded-2xl border border-[#3f3f46]/35 bg-[#050505]/72 p-3"
            onClick={(event) => event.stopPropagation()}
          >
            {avatarGalleryItems.length > 1 ? (
              <>
                <button
                  aria-label="Previous avatar"
                  className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#3f3f46]/45 bg-[#111111]/88 text-[#f4f4f5] shadow-[0_12px_34px_rgba(0,0,0,0.35)] transition hover:bg-[#f4f4f5] hover:text-[#050505]"
                  onClick={() =>
                    setAvatarGalleryIndex((currentIndex) =>
                      currentIndex === null
                        ? 0
                        : (currentIndex - 1 + avatarGalleryItems.length) % avatarGalleryItems.length,
                    )
                  }
                  type="button"
                >
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <path d="m15 18-6-6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
                <button
                  aria-label="Next avatar"
                  className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#3f3f46]/45 bg-[#111111]/88 text-[#f4f4f5] shadow-[0_12px_34px_rgba(0,0,0,0.35)] transition hover:bg-[#f4f4f5] hover:text-[#050505]"
                  onClick={() =>
                    setAvatarGalleryIndex((currentIndex) =>
                      currentIndex === null ? 0 : (currentIndex + 1) % avatarGalleryItems.length,
                    )
                  }
                  type="button"
                >
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <path d="m9 18 6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
              </>
            ) : null}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Avatar preview"
              className="h-auto max-h-[calc(100dvh-220px)] w-auto max-w-[calc(100vw-120px)] rounded-2xl object-contain shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
              src={avatarGalleryUrl}
            />
          </div>

          {avatarGalleryItems.length > 1 ? (
            <div
              className="scrollbar-hidden mt-3 flex shrink-0 gap-2 overflow-x-auto rounded-2xl border border-[#3f3f46]/35 bg-[#111111]/78 p-2"
              onClick={(event) => event.stopPropagation()}
            >
              {avatarGalleryItems.map((avatarUrl, avatarIndex) => (
                <button
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border transition ${
                    avatarIndex === avatarGalleryIndex
                      ? "border-[#f4f4f5] opacity-100"
                      : "border-[#3f3f46]/45 opacity-55 hover:opacity-100"
                  }`}
                  key={avatarUrl}
                  onClick={() => setAvatarGalleryIndex(avatarIndex)}
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="" className="h-full w-full object-cover" src={avatarUrl} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {isAvatarDeleteDialogOpen && avatarGalleryUrl ? (
        <>
          <button
            aria-label="Close avatar delete dialog"
            className="fixed inset-0 z-[130] bg-black/62 backdrop-blur-sm"
            onClick={() => setIsAvatarDeleteDialogOpen(false)}
            type="button"
          />
          <section className="fixed left-1/2 top-1/2 z-[131] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-red-400/25 bg-[#101010]/98 p-5 text-left shadow-[0_28px_90px_rgba(0,0,0,0.68)] backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-red-300/35 bg-red-500/14 text-red-100">
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-medium leading-tight text-[#f4f4f5]">
                  {"\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u0430\u0432\u0430\u0442\u0430\u0440\u043a\u0443?"}
                </h2>
                <p className="mt-2 text-[13px] leading-6 text-[#a1a1aa]">
                  {"\u0410\u0432\u0430\u0442\u0430\u0440\u043a\u0430 \u0438\u0441\u0447\u0435\u0437\u043d\u0435\u0442 \u0438\u0437 \u044d\u0442\u043e\u0439 \u0433\u0430\u043b\u0435\u0440\u0435\u0438. \u0415\u0441\u043b\u0438 \u044d\u0442\u043e \u0442\u0435\u043a\u0443\u0449\u0430\u044f \u0430\u0432\u0430\u0442\u0430\u0440\u043a\u0430, Hush \u043f\u043e\u0441\u0442\u0430\u0432\u0438\u0442 \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0443\u044e \u0438\u043b\u0438 \u043e\u0447\u0438\u0441\u0442\u0438\u0442 \u0435\u0435."}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                className="min-h-12 rounded-2xl bg-red-500 px-4 text-[13px] font-medium text-white transition hover:bg-red-400"
                onClick={() => void deleteAvatarFromGallery()}
                type="button"
              >
                {"\u0423\u0434\u0430\u043b\u0438\u0442\u044c"}
              </button>
              <button
                className="min-h-12 rounded-2xl border border-[#3f3f46]/45 bg-white/[0.03] px-4 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
                onClick={() => setIsAvatarDeleteDialogOpen(false)}
                type="button"
              >
                {"\u041e\u0442\u043c\u0435\u043d\u0430"}
              </button>
            </div>
          </section>
        </>
      ) : null}
      {selectedImageUrl ? (
        <button
          aria-label="Закрыть изображение"
          className="fixed inset-0 z-[120] grid place-items-center bg-black/58 p-4 backdrop-blur-sm"
          onClick={() => setSelectedImageUrl(null)}
          type="button"
        >
          <span className="absolute right-4 top-4 rounded-full border border-[#3f3f46]/45 bg-[#111111]/90 px-4 py-2 text-[13px] font-medium text-[#f4f4f5]">
            Закрыть
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Просмотр изображения"
            className="max-h-[78dvh] max-w-[92vw] rounded-xl border border-[#3f3f46]/35 object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:max-w-[82vw] sm:rounded-2xl"
            onClick={(event) => event.stopPropagation()}
            src={selectedImageUrl}
          />
        </button>
      ) : null}
      {chatContextMenu ? (
        <>
          <button
            aria-label="Закрыть меню чата"
            className="fixed inset-0 z-[80] cursor-default bg-transparent"
            onClick={() => setChatContextMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setChatContextMenu(null);
            }}
            type="button"
          />
          <div
            className="hush-context-menu fixed z-[90] w-[min(286px,calc(100vw-24px))] overflow-visible rounded-xl border border-white/10 bg-[#18181b]/98 py-1.5 text-[#f4f4f5] shadow-[0_22px_70px_rgba(0,0,0,0.58)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
            style={{ left: chatContextMenu.left, top: chatContextMenu.top }}
          >
            <p className="truncate px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-[#a1a1aa]">
              Чат с {chatContextMenu.profile.display_name}
            </p>
            <button
              className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
              onClick={() => runChatMenuStub("Архив скоро подключим.")}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                <path d="M4 7h16v13H4V7ZM7 4h10l3 3H4l3-3ZM9 12h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              В архив
            </button>
            <div className="group relative">
              <button
                className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
                type="button"
              >
                <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                  <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                <span className="min-w-0 flex-1">Добавить в папку</span>
                <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-[#a1a1aa]" fill="none" viewBox="0 0 24 24">
                  <path d="m9 18 6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </button>
              <div className="hush-context-menu invisible absolute left-[calc(100%-6px)] top-0 z-[91] w-[220px] rounded-xl border border-white/10 bg-[#18181b]/98 py-1.5 opacity-0 shadow-[0_22px_70px_rgba(0,0,0,0.58)] transition group-hover:visible group-hover:opacity-100">
                <button className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10" onClick={() => runChatMenuStub("Создание папок скоро подключим.")} type="button">
                  <span className="grid h-5 w-5 place-items-center">+</span>
                  Новая папка
                </button>
                <button className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10" onClick={() => runChatMenuStub("Папки скоро подключим.")} type="button">
                  <span className="grid h-5 w-5 place-items-center">#</span>
                  Выбрать папку
                </button>
              </div>
            </div>
            <button
              className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
              onClick={() => {
                requestBlockChange(
                  chatContextMenu.profile.user_id,
                  chatContextMenu.profile.username
                    ? `@${chatContextMenu.profile.username}`
                    : chatContextMenu.profile.display_name,
                );
                setChatContextMenu(null);
              }}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                <path d="M18 11v8H6v-8M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              {blockedByMeProfileIds.includes(chatContextMenu.profile.user_id) ? "Разблокировать" : "Заблокировать"}
            </button>
            <div className="group relative">
              {isProfileMuted(mutedProfiles, chatContextMenu.profile.user_id) ? (
                <button
                  className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
                  onClick={() => {
                    unmuteProfileNotifications(chatContextMenu.profile.user_id);
                    setChatContextMenu(null);
                  }}
                  type="button"
                >
                  <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                    <path d="M5 9v6h4l5 4V5L9 9H5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    <path d="M18 9a5 5 0 0 1 0 6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                  </svg>
                  Включить уведомления
                </button>
              ) : (
                <>
                  <button
                    className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
                    type="button"
                  >
                    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                      <path d="M5 9v6h4l5 4V5L9 9H5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      <path d="m19 9-4 4M15 9l4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                    <span className="min-w-0 flex-1">Выключить уведомления</span>
                    <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-[#a1a1aa]" fill="none" viewBox="0 0 24 24">
                      <path d="m9 18 6-6-6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                  </button>
                  <div className="hush-context-menu invisible absolute left-[calc(100%-6px)] top-0 z-[91] w-[260px] rounded-xl border border-white/10 bg-[#18181b]/98 py-1.5 opacity-0 shadow-[0_22px_70px_rgba(0,0,0,0.58)] transition group-hover:visible group-hover:opacity-100">
                    {[
                      { durationMs: 30 * 60 * 1000, label: "Выключить на 30 минут" },
                      { durationMs: 60 * 60 * 1000, label: "Выключить на 1 час" },
                      { durationMs: 2 * 60 * 60 * 1000, label: "Выключить на 2 часа" },
                      { durationMs: 8 * 60 * 60 * 1000, label: "Выключить на 8 часов" },
                    ].map((option) => (
                      <button
                        className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
                        key={option.label}
                        onClick={() => {
                          muteProfileNotifications(chatContextMenu.profile.user_id, option.durationMs);
                          setChatContextMenu(null);
                        }}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                    <button
                      className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium text-red-100 transition hover:bg-red-500/18"
                      onClick={() => {
                        muteProfileNotifications(chatContextMenu.profile.user_id, null);
                        setChatContextMenu(null);
                      }}
                      type="button"
                    >
                      Отключить уведомления
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium text-red-100 transition hover:bg-red-500/18"
              onClick={() => requestChatDeleteFromMenu(chatContextMenu.profile)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Удалить чат
            </button>
          </div>
        </>
      ) : null}
      {messageContextMenu ? (
        <>
          {(() => {
            const isContextMessageMine = messageContextMenu.message.user_id === user?.id;

            return (
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
            className="hush-context-menu fixed z-[90] w-[min(220px,calc(100vw-24px))] overflow-hidden rounded-lg border border-white/10 bg-[#18181b] py-1.5 text-[#f4f4f5] shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
            style={{
              left: messageContextMenu.left,
              top: messageContextMenu.top,
            }}
          >
            <button
              className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
              onClick={() => replyToMessage(messageContextMenu.message)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                <path d="M9 14 4 9l5-5M4 9h9a7 7 0 0 1 7 7v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Ответить
            </button>
            {isContextMessageMine ? (
              <button
                className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
                onClick={() => startEditingMessage(messageContextMenu.message)}
                type="button"
              >
                <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                  <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                Изменить
              </button>
            ) : null}
            <button
              className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
              onClick={() =>
                activePinnedMessageIdSet.has(messageContextMenu.message.id)
                  ? requestUnpinPinnedMessage(messageContextMenu.message)
                  : requestPinnedMessage(messageContextMenu.message)
              }
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                <path d="m14.5 4.5 5 5-3.4 1.1-4.8 4.8.7 3.6-7-7 3.6.7 4.8-4.8 1.1-3.4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="m9.5 14.5-4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
              {activePinnedMessageIdSet.has(messageContextMenu.message.id) ? "Открепить" : "Закрепить"}
            </button>
            <button
              className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
              onClick={() => copyMessageText(messageContextMenu.message)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                <rect height="14" rx="2" stroke="currentColor" strokeWidth="2" width="12" x="8" y="8" />
                <path d="M4 16V6a2 2 0 0 1 2-2h10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
              Копировать текст
            </button>
            {isContextMessageMine ? (
              <button
                className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium text-red-100 transition hover:bg-red-500/18"
                onClick={() => requestMessageDelete(messageContextMenu.message)}
                type="button"
              >
                <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
                Удалить
              </button>
            ) : null}
            <button
              className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
              onClick={() => toggleSelectedMessage(messageContextMenu.message)}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                <path d="M9 12.5 11 14.5 15.5 9.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              {selectedMessageIdSet.has(messageContextMenu.message.id)
                ? "Снять выделение"
                : "Выделить"}
            </button>
          </div>
              </>
            );
          })()}
        </>
      ) : null}
      {favoriteContextMenu ? (
        <>
          {(() => {
            const isFavoritePinned = pinnedFavoriteItem?.id === favoriteContextMenu.item.id;
            const isFavoriteSelected = selectedMessageIdSet.has(favoriteContextMenu.item.id);

            return (
              <>
                <button
                  aria-label="Закрыть меню избранного"
                  className="fixed inset-0 z-[80] cursor-default bg-transparent"
                  onClick={() => setFavoriteContextMenu(null)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setFavoriteContextMenu(null);
                  }}
                  type="button"
                />
                <div
                  className="hush-context-menu fixed z-[90] w-[min(220px,calc(100vw-24px))] overflow-hidden rounded-lg border border-white/10 bg-[#18181b] py-1.5 text-[#f4f4f5] shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
                  onClick={(event) => event.stopPropagation()}
                  onContextMenu={(event) => event.preventDefault()}
                  style={{
                    left: favoriteContextMenu.left,
                    top: favoriteContextMenu.top,
                  }}
                >
                  <button
                    className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
                    onClick={() => replyToFavoriteItem(favoriteContextMenu.item)}
                    type="button"
                  >
                    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                      <path d="M9 14 4 9l5-5M4 9h9a7 7 0 0 1 7 7v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    Ответить
                  </button>
                  <button
                    className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
                    onClick={() => startEditingFavoriteItem(favoriteContextMenu.item)}
                    type="button"
                  >
                    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                      <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    Изменить
                  </button>
                  <button
                    className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
                    onClick={() => togglePinnedFavoriteItem(favoriteContextMenu.item)}
                    type="button"
                  >
                    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                      <path d="m14.5 4.5 5 5-3.4 1.1-4.8 4.8.7 3.6-7-7 3.6.7 4.8-4.8 1.1-3.4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      <path d="m9.5 14.5-4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                    {isFavoritePinned ? "Открепить" : "Закрепить"}
                  </button>
                  <button
                    className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
                    onClick={() => copyFavoriteText(favoriteContextMenu.item)}
                    type="button"
                  >
                    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                      <rect height="14" rx="2" stroke="currentColor" strokeWidth="2" width="12" x="8" y="8" />
                      <path d="M4 16V6a2 2 0 0 1 2-2h10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                    Копировать текст
                  </button>
                  <button
                    className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium text-red-100 transition hover:bg-red-500/18"
                    onClick={() => removeFavoriteItem(favoriteContextMenu.item.id)}
                    type="button"
                  >
                    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    Удалить
                  </button>
                  <button
                    className="flex min-h-10 w-full items-center gap-3 px-4 text-left text-[13px] font-medium transition hover:bg-white/10"
                    onClick={() => toggleSelectedFavoriteItem(favoriteContextMenu.item)}
                    type="button"
                  >
                    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
                      <path d="M9 12.5 11 14.5 15.5 9.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    {isFavoriteSelected ? "Снять выделение" : "Выделить"}
                  </button>
                </div>
              </>
            );
          })()}
        </>
      ) : null}
      {isUnpinAllDialogOpen ? (
        <>
          <button
            aria-label="Закрыть окно открепления"
            className="fixed inset-0 z-[95] bg-black/58 backdrop-blur-sm"
            onClick={() => setIsUnpinAllDialogOpen(false)}
            type="button"
          />
          <section className="fixed left-1/2 top-1/2 z-[96] w-[min(440px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-red-400/25 bg-[#111111]/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:rounded-3xl sm:p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.18),transparent_36%),linear-gradient(145deg,rgba(255,255,255,0.05),transparent_48%)]" />
            <div className="relative">
              <div className="mb-4 flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-red-300/25 bg-red-500/14 text-red-100">
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <path d="m14.5 4.5 5 5-3.4 1.1-4.8 4.8.7 3.6-7-7 3.6.7 4.8-4.8 1.1-3.4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    <path d="m9.5 14.5-4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-medium text-[#f4f4f5]">
                    Открепить все закрепы?
                  </h2>
                  <p className="mt-1 text-[13px] leading-6 text-[#a1a1aa]">
                    Закрепы исчезнут из списка этого чата. Общие закрепы открепятся для обоих.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/22 px-3 py-2.5">
                <p className="text-[13px] font-medium text-[#f4f4f5]">
                  {activePinnedMessages.length} сообщений
                </p>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  className="min-h-12 rounded-xl border border-[#3f3f46]/35 px-4 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
                  onClick={() => setIsUnpinAllDialogOpen(false)}
                  type="button"
                >
                  Оставить
                </button>
                <button
                  className="min-h-12 rounded-xl bg-red-500 px-4 text-[13px] font-medium text-white transition hover:bg-red-400"
                  onClick={unpinAllActivePinnedMessages}
                  type="button"
                >
                  Открепить
                </button>
              </div>
            </div>
          </section>
        </>
      ) : null}
      {messagePinTarget ? (
        <>
          <button
            aria-label="Закрыть окно закрепления сообщения"
            className="fixed inset-0 z-[95] bg-black/58 backdrop-blur-sm"
            onClick={() => setMessagePinTarget(null)}
            type="button"
          />
          <section className="fixed left-1/2 top-1/2 z-[96] max-h-[calc(100dvh-24px)] w-[min(448px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:w-[min(448px,calc(100vw-32px))] sm:rounded-3xl sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f4f4f5]/18 text-[#e5e5e5]">
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path d="m14.5 4.5 5 5-3.4 1.1-4.8 4.8.7 3.6-7-7 3.6.7 4.8-4.8 1.1-3.4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  <path d="m9.5 14.5-4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-medium text-[#f4f4f5]">
                  {activePinnedMessageIdSet.has(messagePinTarget.id)
                    ? "Открепление сообщения"
                    : "Закрепление сообщения"}
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-[#a1a1aa]">
                  {activePinnedMessageIdSet.has(messagePinTarget.id)
                    ? "Желаете открепить сообщение?"
                    : "Выберите, закрепить сообщение только у себя или сделать его общим для обоих участников переписки."}
                </p>
              </div>
            </div>

            {!activePinnedMessageIdSet.has(messagePinTarget.id) ? (
              <>
                <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/20 p-3">
                  <p className="line-clamp-3 text-[13px] font-medium text-[#f4f4f5]">
                    {getReadableMessageText(messagePinTarget.text)}
                  </p>
                </div>

                <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-[#3f3f46]/35 bg-[#f4f4f5]/8 p-3 text-[13px] font-medium text-[#f4f4f5]">
                  <input
                    checked={shouldPinForBoth}
                    className="h-5 w-5 accent-[#f4f4f5]"
                    onChange={(event) => setShouldPinForBoth(event.target.checked)}
                    type="checkbox"
                  />
                  <span>Закрепить для двоих</span>
                </label>
              </>
            ) : null}

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                className="min-h-12 rounded-xl bg-[#f4f4f5] px-4 text-[13px] font-medium text-[#050505] transition hover:bg-[#e5e5e5]"
                onClick={
                  activePinnedMessageIdSet.has(messagePinTarget.id)
                    ? confirmUnpinPinnedMessage
                    : confirmPinnedMessage
                }
                type="button"
              >
                {activePinnedMessageIdSet.has(messagePinTarget.id) ? "Да" : "Закрепить"}
              </button>
              <button
                className="min-h-12 rounded-xl border border-[#3f3f46]/35 px-4 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
                onClick={() => setMessagePinTarget(null)}
                type="button"
              >
                {activePinnedMessageIdSet.has(messagePinTarget.id) ? "Нет" : "Отмена"}
              </button>
            </div>
          </section>
        </>
      ) : null}
      {messageDeleteTarget ? (
        <>
          <button
            aria-label="Закрыть окно удаления сообщения"
            className="fixed inset-0 z-[95] bg-black/58 backdrop-blur-sm"
            onClick={() => setMessageDeleteTarget(null)}
            type="button"
          />
          <section
            className="fixed left-1/2 top-1/2 z-[96] max-h-[calc(100dvh-24px)] w-[min(448px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:w-[min(448px,calc(100vw-32px))] sm:rounded-3xl sm:p-5"
          >
            <div className="mb-4 flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/14 text-red-100">
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-medium text-[#f4f4f5]">
                  Удаление сообщения
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-[#a1a1aa]">
                  Выберите, удалить сообщение только у себя или у обоих участников переписки.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/20 p-3">
              <p className="line-clamp-3 text-[13px] font-medium text-[#f4f4f5]">
                {getReadableMessageText(messageDeleteTarget.text)}
              </p>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                className="min-h-12 rounded-xl border border-[#3f3f46]/35 px-4 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
                onClick={() => hideMessageForMe(messageDeleteTarget)}
                type="button"
              >
                Только у себя
              </button>
              <button
                className="min-h-12 rounded-xl bg-red-500 px-4 text-[13px] font-medium text-white transition hover:bg-red-400"
                onClick={() => deleteMessage(messageDeleteTarget)}
                type="button"
              >
                У обоих
              </button>
            </div>

            <button
              className="mt-3 min-h-11 w-full rounded-xl px-4 text-[13px] font-medium text-[#a1a1aa] transition hover:bg-white/10 hover:text-[#f4f4f5]"
              onClick={() => setMessageDeleteTarget(null)}
              type="button"
            >
              Отмена
            </button>
          </section>
        </>
      ) : null}
      {isSelectedDeleteDialogOpen && selectedDialogMessages.length > 0 ? (
        <>
          <button
            aria-label="Close selected messages delete menu"
            className="fixed inset-0 z-[95] bg-black/58 backdrop-blur-sm"
            onClick={() => setIsSelectedDeleteDialogOpen(false)}
            type="button"
          />
          <section
            className="fixed left-1/2 top-1/2 z-[96] max-h-[calc(100dvh-24px)] w-[min(448px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:w-[min(448px,calc(100vw-32px))] sm:rounded-3xl sm:p-5"
          >
            <div className="mb-4 flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/14 text-red-100">
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-medium text-[#f4f4f5]">
                  {"\u0423\u0434\u0430\u043b\u0435\u043d\u0438\u0435 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0439"}
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-[#a1a1aa]">
                  {"\u0412\u044b\u0431\u0435\u0440\u0438, \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0432\u044b\u0434\u0435\u043b\u0435\u043d\u043d\u044b\u0435 \u0442\u043e\u043b\u044c\u043a\u043e \u0443 \u0441\u0435\u0431\u044f \u0438\u043b\u0438 \u0443 \u043e\u0431\u043e\u0438\u0445 \u0443\u0447\u0430\u0441\u0442\u043d\u0438\u043a\u043e\u0432 \u043f\u0435\u0440\u0435\u043f\u0438\u0441\u043a\u0438."}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/20 p-3">
              <p className="text-[13px] font-medium text-[#f4f4f5]">
                {selectedDialogMessages.length} {"\u0441\u043e\u043e\u0431\u0449."}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-[#a1a1aa]">
                {getReadableMessageText(selectedDialogMessages.at(-1)?.text ?? "")}
              </p>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                className="min-h-12 rounded-xl border border-[#3f3f46]/35 px-4 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
                onClick={hideSelectedMessagesForMe}
                type="button"
              >
                {"\u0422\u043e\u043b\u044c\u043a\u043e \u0443 \u0441\u0435\u0431\u044f"}
              </button>
              <button
                className="min-h-12 rounded-xl bg-red-500 px-4 text-[13px] font-medium text-white transition hover:bg-red-400"
                onClick={deleteSelectedMessagesForBoth}
                type="button"
              >
                {"\u0423 \u043e\u0431\u043e\u0438\u0445"}
              </button>
            </div>

            <button
              className="mt-3 min-h-11 w-full rounded-xl px-4 text-[13px] font-medium text-[#a1a1aa] transition hover:bg-white/10 hover:text-[#f4f4f5]"
              onClick={() => setIsSelectedDeleteDialogOpen(false)}
              type="button"
            >
              {"\u041e\u0442\u043c\u0435\u043d\u0430"}
            </button>
          </section>
        </>
      ) : null}
      {isChatDeleteDialogOpen ? (
        <>
          <button
            aria-label="Закрыть окно удаления переписки"
            className="fixed inset-0 z-[95] bg-black/62 backdrop-blur-sm"
            onClick={() => {
              setIsChatDeleteDialogOpen(false);
              setChatDeleteTargetUserId(null);
            }}
            type="button"
          />
          <section className="fixed left-1/2 top-1/2 z-[96] w-[min(460px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-red-400/25 bg-[#111111]/96 p-4 text-left shadow-[0_24px_90px_rgba(0,0,0,0.65)] sm:rounded-3xl sm:p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(248,113,113,0.18),transparent_34%),linear-gradient(135deg,rgba(244,244,245,0.04),transparent_54%)]"
            />
            <div className="relative">
              <div className="mb-4 flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-red-300/25 bg-red-500/16 text-red-100 shadow-[0_10px_30px_rgba(239,68,68,0.18)]">
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-medium text-[#f4f4f5]">
                    Удалить чат у двоих?
                  </h2>
                  <p className="mt-2 text-[13px] leading-6 text-[#a1a1aa]">
                    Сообщения этой переписки исчезнут у тебя и собеседника. Отменить действие не получится.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/24 p-3">
                <p className="text-[13px] font-medium text-[#f4f4f5]">
                  {chatDeleteTargetProfile?.name
                    ? `Чат с ${chatDeleteTargetProfile.name}`
                    : "Текущий чат"}
                </p>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  className="min-h-12 rounded-xl border border-[#3f3f46]/35 px-4 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
                  onClick={() => {
                    setIsChatDeleteDialogOpen(false);
                    setChatDeleteTargetUserId(null);
                  }}
                  type="button"
                >
                  Оставить
                </button>
                <button
                  className="min-h-12 rounded-xl bg-red-500 px-4 text-[13px] font-medium text-white shadow-[0_14px_34px_rgba(239,68,68,0.22)] transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isDeletingChat}
                  onClick={confirmDeleteChat}
                  type="button"
                >
                  {isDeletingChat ? "Удаляю..." : "Удалить у двоих"}
                </button>
              </div>
            </div>
          </section>
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
            className="fixed z-[80] w-[min(300px,calc(100vw-24px))] rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/98 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.58)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            style={{
              left: stickerPickerPosition.left,
              top: stickerPickerPosition.top,
            }}
          >
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-[#e5e5e5]">
                Стикеры
              </p>
              <button
                className="rounded-full px-2 py-1 text-xs font-medium text-[#a1a1aa] transition hover:bg-white/10 hover:text-[#f4f4f5]"
                onClick={() => setIsStickerPickerOpen(false)}
                type="button"
              >
                Закрыть
              </button>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {stickerOptions.map((sticker) => (
                <button
                  className="grid h-14 place-items-center rounded-xl bg-[#f4f4f5]/10 text-3xl leading-none transition hover:scale-[1.03] hover:bg-[#f4f4f5]/18 active:scale-95"
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
      {blockConfirmation ? (
        <>
          <button
            aria-label="Закрыть подтверждение блокировки"
            className="fixed inset-0 z-[115] bg-black/62 backdrop-blur-md"
            onClick={() => setBlockConfirmation(null)}
            type="button"
          />
          <section className="fixed left-1/2 top-1/2 z-[116] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-[#3f3f46]/55 bg-[#101010]/98 p-5 text-left shadow-[0_28px_90px_rgba(0,0,0,0.68)] backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${
                blockConfirmation.action === "block"
                  ? "border-red-300/35 bg-red-500/14 text-red-100"
                  : "border-emerald-300/30 bg-emerald-400/12 text-emerald-100"
              }`}>
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M18 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2ZM8 11V7a4 4 0 0 1 8 0v4"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-medium leading-tight text-[#f4f4f5]">
                  {blockConfirmation.action === "block"
                    ? `Заблокировать пользователя ${blockConfirmation.targetLabel}?`
                    : `Разблокировать пользователя ${blockConfirmation.targetLabel}?`}
                </h2>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                className={`min-h-12 rounded-2xl px-4 text-[13px] font-medium transition ${
                  blockConfirmation.action === "block"
                    ? "bg-red-500 text-white hover:bg-red-400"
                    : "bg-[#f4f4f5] text-[#050505] hover:bg-[#e5e5e5]"
                }`}
                onClick={() => void confirmBlockChange()}
                type="button"
              >
                Да
              </button>
              <button
                className="min-h-12 rounded-2xl border border-[#3f3f46]/45 bg-white/[0.03] px-4 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
                onClick={() => setBlockConfirmation(null)}
                type="button"
              >
                Нет
              </button>
            </div>
          </section>
        </>
      ) : null}
      {viewedProfile ? (
        <>
          <button
            aria-label="Закрыть профиль"
            className="fixed inset-0 z-[95] bg-black/62 backdrop-blur-md"
            onClick={() => setViewedProfile(null)}
            type="button"
          />
          <section className="fixed left-1/2 top-1/2 z-[96] max-h-[calc(100dvh-24px)] w-[min(520px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[28px] border border-[#3f3f46]/50 bg-[#101010]/96 p-4 text-left shadow-[0_28px_90px_rgba(0,0,0,0.68)] backdrop-blur-xl sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <button
                  aria-label="Открыть аватар"
                  className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[24px] bg-[#f4f4f5] text-2xl font-medium text-[#050505] shadow-[0_18px_45px_rgba(0,0,0,0.35)] transition hover:scale-[1.03] disabled:cursor-default disabled:hover:scale-100 sm:h-24 sm:w-24"
                  disabled={!viewedProfile.avatarUrl}
                  onClick={() => {
                    if (viewedProfile.avatarUrl) {
                      void openProfileAvatarGallery(viewedProfile);
                    }
                  }}
                  type="button"
                >
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
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#a1a1aa]">
                    Профиль
                  </p>
                  <h2 className="mt-1 truncate text-2xl font-medium leading-none text-[#f4f4f5] sm:text-3xl">
                    {viewedProfile.name}
                  </h2>
                  <p className="mt-2 truncate text-sm font-medium text-[#a1a1aa]">
                    {viewedProfile.username ? `@${viewedProfile.username}` : "@ник пока не выбран"}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-100">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.8)]" />
                    {formatLastSeen(viewedProfile.updatedAt)}
                  </div>
                </div>
              </div>
              <button
                aria-label="Закрыть профиль"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#3f3f46]/45 bg-white/[0.03] text-[#d4d4d8] transition hover:bg-white/10"
                onClick={() => setViewedProfile(null)}
                type="button"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path
                    d="m6 6 12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2">
              <button
                aria-label="Открыть чат"
                className="flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#3f3f46]/40 bg-black/24 text-center text-[#f4f4f5] transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={
                  !viewedProfile.userId ||
                  viewedProfile.userId === user?.id ||
                  blockedProfileIds.includes(viewedProfile.userId)
                }
                onClick={() => {
                  if (!viewedProfile.userId || viewedProfile.userId === user?.id) {
                    return;
                  }

                  setSelectedChatUserId(viewedProfile.userId);
                  setActiveView("messages");
                  setViewedProfile(null);
                }}
                type="button"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 1 1 17 0Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span className="text-[11px] font-medium leading-none text-[#d4d4d8]">Чат</span>
              </button>
              <button
                aria-label="Позвонить"
                className="flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#3f3f46]/40 bg-black/24 text-center text-[#f4f4f5] transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={
                  !viewedProfile.userId ||
                  viewedProfile.userId === user?.id ||
                  blockedProfileIds.includes(viewedProfile.userId) ||
                  callStatus !== "idle"
                }
                onClick={() => {
                  if (!viewedProfile.userId || viewedProfile.userId === user?.id) {
                    return;
                  }

                  setSelectedChatUserId(viewedProfile.userId);
                  setActiveView("messages");
                  setViewedProfile(null);
                  void startCall(viewedProfile.userId);
                }}
                type="button"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.5a16 16 0 0 0 6.5 6.5l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 16.9Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span className="text-[11px] font-medium leading-none text-[#d4d4d8]">Телефон</span>
              </button>
              <div className="relative">
                <button
                  aria-expanded={profileNotificationMenuUserId === viewedProfile.userId}
                  aria-label="Уведомления"
                  className={`flex min-h-[74px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border text-center transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    viewedProfile.userId && isProfileMuted(mutedProfiles, viewedProfile.userId)
                      ? "border-amber-300/35 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15"
                      : "border-[#3f3f46]/40 bg-black/24 text-[#f4f4f5] hover:bg-white/[0.08]"
                  }`}
                  disabled={!viewedProfile.userId || viewedProfile.userId === user?.id}
                  onClick={() => {
                    if (!viewedProfile.userId || viewedProfile.userId === user?.id) {
                      return;
                    }

                    setProfileNotificationMenuUserId((currentUserId) =>
                      currentUserId === viewedProfile.userId ? null : viewedProfile.userId,
                    );
                  }}
                  type="button"
                >
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <path
                      d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM13.7 21a2 2 0 0 1-3.4 0"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                  <span className="text-[11px] font-medium leading-none text-[#d4d4d8]">
                    {viewedProfile.userId && isProfileMuted(mutedProfiles, viewedProfile.userId)
                      ? "Без звука"
                      : "Уведомл."}
                  </span>
                </button>
                {profileNotificationMenuUserId === viewedProfile.userId && viewedProfile.userId ? (
                  <>
                  <button
                    aria-label="Закрыть меню уведомлений"
                    className="fixed inset-0 z-[105] cursor-default bg-transparent"
                    onClick={() => setProfileNotificationMenuUserId(null)}
                    type="button"
                  />
                  <div className="absolute left-1/2 top-[calc(100%+8px)] z-[110] w-64 -translate-x-1/2 rounded-2xl border border-[#3f3f46]/55 bg-[#171717]/98 p-1.5 text-left shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                    {isProfileMuted(mutedProfiles, viewedProfile.userId) ? (
                      <button
                        className="min-h-10 w-full rounded-xl px-3 text-left text-[13px] font-medium text-emerald-100 transition hover:bg-emerald-400/10"
                        onClick={() => unmuteProfileNotifications(viewedProfile.userId!)}
                        type="button"
                      >
                        Включить уведомления
                      </button>
                    ) : (
                      [
                        { durationMs: 30 * 60 * 1000, label: "Выключить на 30 минут" },
                        { durationMs: 60 * 60 * 1000, label: "Выключить на 1 час" },
                        { durationMs: 2 * 60 * 60 * 1000, label: "Выключить на 2 часа" },
                        { durationMs: 8 * 60 * 60 * 1000, label: "Выключить на 8 часов" },
                        { durationMs: null, label: "Отключить уведомления" },
                      ].map((option) => (
                        <button
                          className="min-h-10 w-full whitespace-nowrap rounded-xl px-3 text-left text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
                          key={option.label}
                          onClick={() =>
                            viewedProfile.userId
                              ? muteProfileNotifications(
                                  viewedProfile.userId,
                                  option.durationMs,
                                )
                              : undefined
                          }
                          type="button"
                        >
                          {option.label}
                        </button>
                      ))
                    )}
                  </div>
                  </>
                ) : null}
              </div>
              <button
                aria-label="Заблокировать"
                className={`flex min-h-[74px] flex-col items-center justify-center gap-1.5 rounded-2xl border text-center transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  viewedProfile.userId && blockedByMeProfileIds.includes(viewedProfile.userId)
                    ? "border-red-300/45 bg-red-500/12 text-red-100 hover:bg-red-500/18"
                    : "border-[#3f3f46]/40 bg-black/24 text-[#f4f4f5] hover:bg-white/[0.08]"
                }`}
                disabled={!viewedProfile.userId || viewedProfile.userId === user?.id}
                onClick={() => {
                  if (!viewedProfile.userId || viewedProfile.userId === user?.id) {
                    return;
                  }

                  requestBlockChange(
                    viewedProfile.userId,
                    viewedProfile.username ? `@${viewedProfile.username}` : viewedProfile.name,
                  );
                }}
                type="button"
              >
                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M18 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2ZM8 11V7a4 4 0 0 1 8 0v4"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <span className="text-[11px] font-medium leading-none text-[#d4d4d8]">
                  {viewedProfile.userId && blockedByMeProfileIds.includes(viewedProfile.userId)
                    ? "Разблок"
                    : "Блок"}
                </span>
              </button>
            </div>
            <div className="mt-5 grid gap-3">
              <article className="rounded-3xl border border-[#3f3f46]/40 bg-black/22 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#e5e5e5]">
                  О себе
                </p>
                <p className="mt-2 text-[13px] leading-6 text-[#a1a1aa]">
                  Пока ничего не написал о себе.
                </p>
              </article>

              <article className="rounded-3xl border border-[#3f3f46]/40 bg-black/22 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#e5e5e5]">
                  Телефон
                </p>
                <p className="mt-2 text-[13px] leading-6 text-[#a1a1aa]">
                  Скрыт настройками приватности. Позже добавим показ только с разрешения пользователя.
                </p>
              </article>

              <article className="rounded-3xl border border-[#3f3f46]/40 bg-black/22 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#e5e5e5]">
                  Общие данные
                </p>
                <p className="mt-2 text-[13px] leading-6 text-[#a1a1aa]">
                  Общие чаты и группы появятся здесь позже.
                </p>
              </article>
            </div>

          </section>
        </>
      ) : null}
    </main>
  );
}
