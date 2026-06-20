export type MessageRow = {
  id: number;
  author: string;
  text: string;
  created_at: string;
  client_key?: string;
  edited_at?: string | null;
  recipient_id: string | null;
  user_id: string | null;
};

export type MessageReceiptStatus = "delivered" | "played" | "read";

export type MessageReceiptRow = {
  id: number;
  message_id: number;
  sender_id: string;
  recipient_id: string;
  status: MessageReceiptStatus;
  created_at: string;
};

export type MessageTypingAction = "start" | "stop";

export type MessageTypingStateRow = {
  action: MessageTypingAction;
  event_at: string;
  expires_at: string;
  recipient_id: string;
  sender_id: string;
};

export type MessagePinRow = {
  created_at: string;
  is_pinned: boolean;
  message_id: number;
  pinner_id: string;
  recipient_id: string;
  updated_at: string;
};

export type FavoriteItem = MessageRow & {
  saved_at: string;
};

export type ProfileRow = {
  user_id: string;
  display_name: string;
  username: string | null;
  bio: string | null;
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

export type ForwardMessagePayload = {
  authorName: string;
  authorUserId: string | null;
  text: string;
};

export type FileMessagePayload = {
  caption?: string;
  name: string;
  size: number;
  type: string;
  url: string;
};

export type MediaMessagePayload = {
  caption?: string;
  url: string;
};

export type PinMessagePayload = {
  action: "pin" | "unpin";
  messageId: number;
};

export type ReceiptMessagePayload = {
  messageId: number;
  status: MessageReceiptStatus;
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

export type ActiveView = "profile" | "messages" | "favorites" | "music" | "access" | "settings";
export type AuthMode = "sign-in" | "sign-up";
export type CallStatus = "idle" | "calling" | "incoming" | "connecting" | "connected";
export type MutedProfileUntil = Record<string, number | null>;
export type PinnedMessageIdsByChat = Record<string, number[]>;

export type AccessProfileRow = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  email: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ChatFolder = {
  color?: string;
  id: string;
  name: string;
  createdAt: string;
};

export type StoredNavigationState = {
  activeView?: ActiveView;
  selectedChatUserId?: string | null;
};
