import {
  audioMessagePrefix,
  blockMessagePrefix,
  callMessagePrefix,
  fileMessagePrefix,
  imageMessagePrefix,
  pinMessagePrefix,
  receiptMessagePrefix,
  replyMessagePrefix,
  stickerMessagePrefix,
  typingMessagePrefix,
  videoMessagePrefix,
} from "../constants";
import type {
  BlockMessagePayload,
  FileMessagePayload,
  MessageRow,
  PinMessagePayload,
  ReceiptMessagePayload,
  ReplyMessagePayload,
  TypingMessagePayload,
} from "../types";
export function getMessageImageUrl(text: string) {
  return text.startsWith(imageMessagePrefix)
    ? text.slice(imageMessagePrefix.length)
    : null;
}

export function getMessageVideoUrl(text: string) {
  return text.startsWith(videoMessagePrefix)
    ? text.slice(videoMessagePrefix.length)
    : null;
}

export function getMessageAudioUrl(text: string) {
  return text.startsWith(audioMessagePrefix)
    ? text.slice(audioMessagePrefix.length)
    : null;
}

export function createFileMessageText(payload: FileMessagePayload) {
  return `${fileMessagePrefix}${encodeURIComponent(JSON.stringify(payload))}`;
}

export function getMessageFilePayload(text: string): FileMessagePayload | null {
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

export function getMessageCallDuration(text: string) {
  if (!text.startsWith(callMessagePrefix)) {
    return null;
  }

  const duration = Number(text.slice(callMessagePrefix.length));

  return Number.isFinite(duration) ? duration : 0;
}

export function getMessageSticker(text: string) {
  return text.startsWith(stickerMessagePrefix)
    ? text.slice(stickerMessagePrefix.length)
    : null;
}

export function getMessageReply(text: string): ReplyMessagePayload | null {
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

export function createPinMessageText(messageId: number, action: PinMessagePayload["action"]) {
  return `${pinMessagePrefix}${JSON.stringify({ action, messageId })}`;
}

export function getPinMessagePayload(text: string): PinMessagePayload | null {
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

export function createReceiptMessageText(
  messageId: number,
  status: ReceiptMessagePayload["status"],
) {
  return `${receiptMessagePrefix}${JSON.stringify({ messageId, status })}`;
}

export function getReceiptMessagePayload(text: string): ReceiptMessagePayload | null {
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

export function createTypingMessageText(action: "start" | "stop", eventAt: string) {
  return `${typingMessagePrefix}${JSON.stringify({
    action,
    eventAt,
  } satisfies TypingMessagePayload)}`;
}

export function getTypingMessagePayload(text: string): TypingMessagePayload | null {
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

export function createBlockMessageText(blockedId: string, action: BlockMessagePayload["action"]) {
  return `${blockMessagePrefix}${JSON.stringify({ action, blockedId })}`;
}

export function getBlockMessagePayload(text: string): BlockMessagePayload | null {
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

export function isServiceMessage(text: string) {
  return Boolean(
    getPinMessagePayload(text) ||
      getReceiptMessagePayload(text) ||
      getTypingMessagePayload(text) ||
      getBlockMessagePayload(text),
  );
}

export function getReadableMessageText(text: string) {
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

export function getNotificationMessageText(text: string) {
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

export function getChatPreviewText(text: string) {
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

export function createReplyMessageText(replyTarget: MessageRow, body: string) {
  return `${replyMessagePrefix}${encodeURIComponent(
    JSON.stringify({
      author: replyTarget.author,
      body,
      messageId: replyTarget.id,
      text: getReadableMessageText(replyTarget.text).slice(0, 140),
    } satisfies ReplyMessagePayload),
  )}`;
}

export function updateReplyMessageBody(text: string, body: string) {
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

export function mergeMessages(currentMessages: MessageRow[], nextMessages: MessageRow[]) {
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

export function isDirectMessageForUser(message: MessageRow, userId: string) {
  return message.user_id === userId || message.recipient_id === userId;
}

export function isMessageBetweenUsers(message: MessageRow, firstUserId: string, secondUserId: string) {
  return (
    (message.user_id === firstUserId && message.recipient_id === secondUserId) ||
    (message.user_id === secondUserId && message.recipient_id === firstUserId)
  );
}

