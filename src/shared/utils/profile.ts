import type { User } from "@supabase/supabase-js";
import { usernamePattern } from "../constants";
export function normalizeUsername(username: string) {
  return username.trim().replace(/^@+/, "").toLowerCase();
}

export function formatUsernameInput(username: string) {
  return username
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

export function getUsernameError(username: string) {
  if (!username) {
    return "Ник обязателен.";
  }

  if (!usernamePattern.test(username)) {
    return "Ник должен быть от 3 до 24 символов: латиница, цифры и подчёркивание.";
  }

  return "";
}

export function formatLastSeen(updatedAt: string | null) {
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

export function isProfileOnline(updatedAt: string | null) {
  if (!updatedAt) {
    return false;
  }

  const updatedTime = new Date(updatedAt).getTime();

  return Number.isFinite(updatedTime) && Date.now() - updatedTime < 90_000;
}

export function getDisplayName(user: User | null) {
  const metadataName = user?.user_metadata?.display_name;

  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  return user?.email?.split("@")[0] ?? "Гость";
}

export function canChangeName(nameChangedAt: string | null) {
  if (!nameChangedAt) {
    return true;
  }

  const nextChangeTime = new Date(nameChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000;

  return Date.now() >= nextChangeTime;
}

export function getNextNameChangeDate(nameChangedAt: string | null) {
  if (!nameChangedAt) {
    return null;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(new Date(nameChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000));
}

