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
    return "РќРёРє РѕР±СЏР·Р°С‚РµР»РµРЅ.";
  }

  if (!usernamePattern.test(username)) {
    return "РќРёРє РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РѕС‚ 3 РґРѕ 24 СЃРёРјРІРѕР»РѕРІ: Р»Р°С‚РёРЅРёС†Р°, С†РёС„СЂС‹ Рё РїРѕРґС‡С‘СЂРєРёРІР°РЅРёРµ.";
  }

  return "";
}

export function formatLastSeen(updatedAt: string | null) {
  if (!updatedAt) {
    return "Р±С‹Р» РЅРµРґР°РІРЅРѕ";
  }

  const updatedDate = new Date(updatedAt);
  const updatedTime = updatedDate.getTime();

  if (!Number.isFinite(updatedTime)) {
    return "Р±С‹Р» РЅРµРґР°РІРЅРѕ";
  }

  const now = Date.now();
  const diffSeconds = Math.max(0, Math.floor((now - updatedTime) / 1000));
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffSeconds < 90) {
    return "РІ СЃРµС‚Рё";
  }

  if (diffMinutes < 60) {
    return `Р±С‹Р» ${Math.max(1, diffMinutes)} РјРёРЅ. РЅР°Р·Р°Рґ`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `Р±С‹Р» ${diffHours} С‡. РЅР°Р·Р°Рґ`;
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
    return `Р±С‹Р» СЃРµРіРѕРґРЅСЏ РІ ${formattedTime}`;
  }

  if (isSameDate(updatedDate, yesterday)) {
    return `Р±С‹Р» РІС‡РµСЂР° РІ ${formattedTime}`;
  }

  return `Р±С‹Р» ${new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(updatedDate)} РІ ${formattedTime}`;
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

  return user?.email?.split("@")[0] ?? "Р“РѕСЃС‚СЊ";
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

