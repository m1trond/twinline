export type MessageRow = {
  id: number;
  author: string;
  text: string;
  created_at: string;
  recipient_id: string | null;
  user_id: string | null;
};

export type FavoriteItem = MessageRow & {
  saved_at: string;
};

export type ProfileRow = {
  user_id: string;
  display_name: string;
  username: string | null;
  username_changed_at: string | null;
  avatar_url: string | null;
  name_changed_at: string | null;
  updated_at: string;
};

export type CallSignalType = "offer" | "answer" | "ice" | "end";

export type CallSignal = {
  id: string;
  sender_id: string;
  receiver_id: string;
  type: CallSignalType;
  payload: unknown;
  created_at: string;
};

export type ReplyMessagePayload = {
  author: string;
  body: string;
  messageId?: number;
  text: string;
};

export type FileMessagePayload = {
  name: string;
  size: number;
  type: string;
  url: string;
};

export type PinMessagePayload = {
  action: "pin" | "unpin";
  messageId: number;
};

export type ReceiptMessagePayload = {
  messageId: number;
  status: "delivered" | "read";
};

export type TypingMessagePayload = {
  action?: "start" | "stop";
  eventAt?: string;
  expiresAt?: string;
};

export type BlockMessagePayload = {
  action: "block" | "unblock";
  blockedId: string;
};

export type ActiveView = "profile" | "messages" | "favorites" | "settings";
export type AuthMode = "sign-in" | "sign-up";
export type AuthContactMethod = "email" | "phone";
export type CallStatus = "idle" | "calling" | "incoming" | "connecting" | "connected";
export type MutedProfileUntil = Record<string, number | null>;
export type PinnedMessageIdsByChat = Record<string, number[]>;

export type StoredNavigationState = {
  activeView?: ActiveView;
  selectedChatUserId?: string | null;
};
