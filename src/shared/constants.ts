import type { ActiveView } from "./types";

export const imageMessagePrefix = "image::";
export const videoMessagePrefix = "video::";
export const audioMessagePrefix = "audio::";
export const fileMessagePrefix = "file::";
export const callMessagePrefix = "call::";
export const stickerMessagePrefix = "sticker::";
export const replyMessagePrefix = "reply::";
export const pinMessagePrefix = "pin::";
export const receiptMessagePrefix = "receipt::";
export const typingMessagePrefix = "typing::";
export const blockMessagePrefix = "block::";

export const maxAttachmentSize = 50 * 1024 * 1024;
export const profileColumns = "user_id, display_name, username, username_changed_at, avatar_url, name_changed_at, updated_at";
export const usernameProfileColumns = "user_id, display_name, username, avatar_url, name_changed_at, updated_at";
export const legacyProfileColumns = "user_id, display_name, avatar_url, name_changed_at, updated_at";
export const messageColumns = "id, author, text, created_at, user_id, recipient_id";
export const usernamePattern = /^[a-z0-9_]{3,24}$/;
export const activeViews: ActiveView[] = ["profile", "messages", "favorites", "music", "settings"];

export const navItems: Array<{ label: string; view: ActiveView }> = [
  { label: "Профиль", view: "profile" },
  { label: "Сообщения", view: "messages" },
  { label: "Избранное", view: "favorites" },
  { label: "Музыка", view: "music" },
];

export const settingsNavItem: { label: string; view: ActiveView } = {
  label: "Настройки",
  view: "settings",
};

export const stickerOptions = [
  "😂",
  "❤️",
  "🔥",
  "🤝",
  "😎",
  "😭",
  "🥱",
  "😡",
  "🫡",
  "💀",
  "🥳",
  "🤯",
  "👍",
  "👎",
  "🍻",
  "✨",
];

export function isActiveView(value: unknown): value is ActiveView {
  return typeof value === "string" && activeViews.includes(value as ActiveView);
}
