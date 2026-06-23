import {
  audioMessagePrefix,
  blockMessagePrefix,
  callMessagePrefix,
  fileMessagePrefix,
  forwardMessagePrefix,
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
  ForwardMessagePayload,
  MediaMessagePayload,
  MessageRow,
  PinMessagePayload,
  ReceiptMessagePayload,
  ReplyMessagePayload,
  TypingMessagePayload,
} from "../types";

const cache = new Map<string, any>();
function withCache<T>(keyPrefix: string, text: string, fn: () => T): T {
  const cacheKey = `${keyPrefix}:${text}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  const result = fn();
  if (cache.size > 5000) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) {
      cache.delete(firstKey);
    }
  }
  cache.set(cacheKey, result);
  return result;
}

function createMediaMessageText(prefix: string, payload: MediaMessagePayload) {
  const normalizedCaption = payload.caption?.trim();

  if (!normalizedCaption) {
    return `${prefix}${payload.url}`;
  }

  return `${prefix}${encodeURIComponent(
    JSON.stringify({
      caption: normalizedCaption,
      url: payload.url,
    } satisfies MediaMessagePayload),
  )}`;
}

function getMediaMessagePayload(text: string, prefix: string): MediaMessagePayload | null {
  return withCache(`media:${prefix}`, text, () => {
    if (!text.startsWith(prefix)) {
      return null;
    }

    const rawPayload = text.slice(prefix.length);

    if (!rawPayload) {
      return null;
    }

    try {
      const parsedPayload = JSON.parse(decodeURIComponent(rawPayload));

      if (parsedPayload && typeof parsedPayload.url === "string") {
        return {
          caption:
            typeof parsedPayload.caption === "string"
              ? parsedPayload.caption
              : undefined,
          url: parsedPayload.url,
        };
      }
    } catch {
      return { url: rawPayload };
    }

    return { url: rawPayload };
  });
}



function createImageMessageText(payload: MediaMessagePayload) {
  return createMediaMessageText(imageMessagePrefix, payload);
}

function createVideoMessageText(payload: MediaMessagePayload) {
  return createMediaMessageText(videoMessagePrefix, payload);
}

function createAudioMessageText(payload: MediaMessagePayload) {
  return createMediaMessageText(audioMessagePrefix, payload);
}

function getMessageImagePayload(text: string) {
  return getMediaMessagePayload(text, imageMessagePrefix);
}

function getMessageVideoPayload(text: string) {
  return getMediaMessagePayload(text, videoMessagePrefix);
}

function getMessageAudioPayload(text: string) {
  return getMediaMessagePayload(text, audioMessagePrefix);
}

export function getMessageImageUrl(text: string) {
  return getMessageImagePayload(text)?.url ?? null;
}

export function getMessageVideoUrl(text: string) {
  return getMessageVideoPayload(text)?.url ?? null;
}

export function getMessageAudioUrl(text: string) {
  return getMessageAudioPayload(text)?.url ?? null;
}

export function createFileMessageText(payload: FileMessagePayload) {
  return `${fileMessagePrefix}${encodeURIComponent(JSON.stringify(payload))}`;
}

export function getMessageFilePayload(text: string): FileMessagePayload | null {
  return withCache("file", text, () => {
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
          caption: typeof parsedPayload.caption === "string" ? parsedPayload.caption : undefined,
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
  });
}

export function getMessageAttachmentCaption(text: string) {
  return (
    getMessageFilePayload(text)?.caption ??
    getMessageImagePayload(text)?.caption ??
    getMessageVideoPayload(text)?.caption ??
    getMessageAudioPayload(text)?.caption ??
    null
  );
}

export function isCaptionEditableMessage(text: string) {
  return Boolean(
    getMessageFilePayload(text) ||
      getMessageImagePayload(text) ||
      getMessageVideoPayload(text) ||
      getMessageAudioPayload(text),
  );
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
  return withCache("reply", text, () => {
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
  });
}

export function createForwardMessageText(message: MessageRow, authorName: string) {
  const reply = getMessageReply(message.text);
  const forwarded = getMessageForward(reply?.body ?? message.text);

  return `${forwardMessagePrefix}${encodeURIComponent(
    JSON.stringify({
      authorName: forwarded?.authorName ?? authorName,
      authorUserId: forwarded ? forwarded.authorUserId : message.user_id,
      text: forwarded?.text ?? reply?.body ?? message.text,
    } satisfies ForwardMessagePayload),
  )}`;
}

export function getMessageForward(text: string): ForwardMessagePayload | null {
  return withCache("forward", text, () => {
    if (!text.startsWith(forwardMessagePrefix)) {
      return null;
    }

    try {
      const parsedPayload = JSON.parse(
        decodeURIComponent(text.slice(forwardMessagePrefix.length)),
      );

      if (
        parsedPayload &&
        typeof parsedPayload.authorName === "string" &&
        typeof parsedPayload.text === "string"
      ) {
        return {
          authorName: parsedPayload.authorName,
          authorUserId:
            typeof parsedPayload.authorUserId === "string"
              ? parsedPayload.authorUserId
              : null,
          text: parsedPayload.text,
        };
      }
    } catch {
      return null;
    }

    return null;
  });
}

export function createPinMessageText(messageId: number, action: PinMessagePayload["action"]) {
  return `${pinMessagePrefix}${JSON.stringify({ action, messageId })}`;
}

export function getPinMessagePayload(text: string): PinMessagePayload | null {
  return withCache("pinPayload", text, () => {
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
  });
}

export function createReceiptMessageText(
  messageId: number,
  status: ReceiptMessagePayload["status"],
) {
  return `${receiptMessagePrefix}${JSON.stringify({ messageId, status })}`;
}

export function getReceiptMessagePayload(text: string): ReceiptMessagePayload | null {
  return withCache("receiptPayload", text, () => {
    if (!text.startsWith(receiptMessagePrefix)) {
      return null;
    }

    try {
      const parsedPayload = JSON.parse(text.slice(receiptMessagePrefix.length));

      if (
        parsedPayload &&
        Number.isInteger(parsedPayload.messageId) &&
        (
          parsedPayload.status === "delivered" ||
          parsedPayload.status === "played" ||
          parsedPayload.status === "read"
        )
      ) {
        return parsedPayload;
      }
    } catch {
      return null;
    }

    return null;
  });
}

export function createTypingMessageText(action: "start" | "stop", eventAt: string) {
  return `${typingMessagePrefix}${JSON.stringify({
    action,
    eventAt,
  } satisfies TypingMessagePayload)}`;
}

export function getTypingMessagePayload(text: string): TypingMessagePayload | null {
  return withCache("typingPayload", text, () => {
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
  });
}

export function createBlockMessageText(blockedId: string, action: BlockMessagePayload["action"]) {
  return `${blockMessagePrefix}${JSON.stringify({ action, blockedId })}`;
}

export function getBlockMessagePayload(text: string): BlockMessagePayload | null {
  return withCache("blockPayload", text, () => {
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
  });
}

export function isServiceMessage(text: string) {
  return withCache("isService", text, () => {
    if (
      !text.startsWith(pinMessagePrefix) &&
      !text.startsWith(receiptMessagePrefix) &&
      !text.startsWith(typingMessagePrefix) &&
      !text.startsWith(blockMessagePrefix)
    ) {
      return false;
    }
    return Boolean(
      getPinMessagePayload(text) ||
        getReceiptMessagePayload(text) ||
        getTypingMessagePayload(text) ||
        getBlockMessagePayload(text),
    );
  });
}

export function getReadableMessageText(text: string): string {
  const reply = getMessageReply(text);

  if (reply) {
    return reply.body;
  }

  const forward = getMessageForward(text);

  if (forward) {
    return `Переслано: ${getReadableMessageText(forward.text)}`;
  }

  if (isServiceMessage(text)) {
    return "Служебное событие";
  }

  if (text.startsWith(imageMessagePrefix)) {
    return getMessageImagePayload(text)?.caption || "Изображение";
  }

  if (text.startsWith(videoMessagePrefix)) {
    return getMessageVideoPayload(text)?.caption || "Видео";
  }

  if (text.startsWith(audioMessagePrefix)) {
    return getMessageAudioPayload(text)?.caption || "Голосовое сообщение";
  }

  if (text.startsWith(fileMessagePrefix)) {
    const filePayload = getMessageFilePayload(text);

    return filePayload?.caption || filePayload?.name || "Файл";
  }

  if (text.startsWith(callMessagePrefix)) {
    return "Звонок";
  }

  if (text.startsWith(stickerMessagePrefix)) {
    return getMessageSticker(text) ?? "Стикер";
  }

  return text;
}

export function getNotificationMessageText(text: string): string {
  const reply = getMessageReply(text);

  if (reply) {
    return `Ответ: ${reply.body}`;
  }

  const forward = getMessageForward(text);

  if (forward) {
    return `Переслано: ${getNotificationMessageText(forward.text)}`;
  }

  if (text.startsWith(imageMessagePrefix)) {
    const caption = getMessageImagePayload(text)?.caption;

    return caption ? `Изображение: ${caption}` : "Отправлено изображение";
  }

  if (text.startsWith(videoMessagePrefix)) {
    const caption = getMessageVideoPayload(text)?.caption;

    return caption ? `Видео: ${caption}` : "Отправлено видео";
  }

  if (text.startsWith(audioMessagePrefix)) {
    const caption = getMessageAudioPayload(text)?.caption;

    return caption ? `Голосовое сообщение: ${caption}` : "Голосовое сообщение";
  }

  if (text.startsWith(fileMessagePrefix)) {
    const filePayload = getMessageFilePayload(text);

    return filePayload
      ? `Файл: ${filePayload.caption || filePayload.name}`
      : "Отправлен файл";
  }

  if (text.startsWith(callMessagePrefix)) {
    return "Звонок завершен";
  }

  if (text.startsWith(stickerMessagePrefix)) {
    return "Стикер";
  }

  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

export function getChatPreviewText(text: string): string {
  const reply = getMessageReply(text);
  const forward = getMessageForward(reply?.body ?? text);
  const previewText = forward?.text ?? reply?.body ?? text;

  if (previewText.startsWith(imageMessagePrefix)) {
    const caption = getMessageImagePayload(previewText)?.caption;

    return caption ? `Фото: ${caption}` : "Фото";
  }

  if (previewText.startsWith(videoMessagePrefix)) {
    const caption = getMessageVideoPayload(previewText)?.caption;

    return caption ? `Видео: ${caption}` : "Видео";
  }

  if (previewText.startsWith(audioMessagePrefix)) {
    const caption = getMessageAudioPayload(previewText)?.caption;

    return caption ? `Голосовое сообщение: ${caption}` : "Голосовое сообщение";
  }

  if (previewText.startsWith(fileMessagePrefix)) {
    const filePayload = getMessageFilePayload(previewText);

    return filePayload ? `Файл: ${filePayload.caption || filePayload.name}` : "Файл";
  }

  if (previewText.startsWith(callMessagePrefix)) {
    return "Звонок";
  }

  if (previewText.startsWith(stickerMessagePrefix)) {
    return `Стикер ${getMessageSticker(previewText) ?? ""}`.trim();
  }

  return forward
    ? `Переслано: ${getReadableMessageText(previewText)}`
    : getReadableMessageText(text);
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

export function updateEditableMessageText(text: string, body: string) {
  const caption = body.trim() || undefined;
  const filePayload = getMessageFilePayload(text);

  if (filePayload) {
    return createFileMessageText({
      ...filePayload,
      caption,
    });
  }

  const imagePayload = getMessageImagePayload(text);

  if (imagePayload) {
    return createImageMessageText({
      ...imagePayload,
      caption,
    });
  }

  const videoPayload = getMessageVideoPayload(text);

  if (videoPayload) {
    return createVideoMessageText({
      ...videoPayload,
      caption,
    });
  }

  const audioPayload = getMessageAudioPayload(text);

  if (audioPayload) {
    return createAudioMessageText({
      ...audioPayload,
      caption,
    });
  }

  return updateReplyMessageBody(text, body);
}

export function mergeMessages(currentMessages: MessageRow[], nextMessages: MessageRow[]) {
  const messagesById = new Map<number, MessageRow>();

  for (const message of currentMessages) {
    messagesById.set(message.id, message);
  }

  for (const message of nextMessages) {
    if (message.id > 0) {
      let matchingOptimisticMessage: MessageRow | null = null;
      for (const existingMsg of messagesById.values()) {
        if (
          existingMsg.id < 0 &&
          existingMsg.user_id === message.user_id &&
          existingMsg.recipient_id === message.recipient_id &&
          existingMsg.text === message.text
        ) {
          matchingOptimisticMessage = existingMsg;
          break;
        }
      }

      if (matchingOptimisticMessage) {
        messagesById.delete(matchingOptimisticMessage.id);
        const mergedMessage: MessageRow = {
          ...message,
          client_key: matchingOptimisticMessage.client_key ?? message.client_key,
        };
        messagesById.set(message.id, mergedMessage);
        continue;
      }
    }

    const existingMessage = messagesById.get(message.id);

    messagesById.set(
      message.id,
      existingMessage?.client_key && !message.client_key
        ? {
            ...message,
            client_key: existingMessage.client_key,
            created_at: existingMessage.created_at,
          }
        : message,
    );
  }

  const mergedList = Array.from(messagesById.values());
  const timestamps = new Map<number, number>();
  for (const msg of mergedList) {
    timestamps.set(msg.id, new Date(msg.created_at).getTime());
  }

  return mergedList.sort((firstMessage, secondMessage) => {
    const isFirstMine = firstMessage.user_id && firstMessage.recipient_id;
    const isSecondMine = secondMessage.user_id && secondMessage.recipient_id;

    if (isFirstMine && isSecondMine) {
      const isSameChat =
        (firstMessage.user_id === secondMessage.user_id && firstMessage.recipient_id === secondMessage.recipient_id) ||
        (firstMessage.user_id === secondMessage.recipient_id && firstMessage.recipient_id === secondMessage.user_id);

      if (isSameChat) {
        const isFirstOptimistic = firstMessage.id < 0;
        const isSecondOptimistic = secondMessage.id < 0;

        if (isFirstOptimistic !== isSecondOptimistic) {
          return isFirstOptimistic ? 1 : -1;
        }
      }
    }

    const firstTime = timestamps.get(firstMessage.id) ?? 0;
    const secondTime = timestamps.get(secondMessage.id) ?? 0;
    const createdAtDiff = firstTime - secondTime;

    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }

    return compareMessageIds(firstMessage.id, secondMessage.id);
  });
}

export function compareMessageIds(firstId: number, secondId: number) {
  const isFirstOptimistic = firstId < 0;
  const isSecondOptimistic = secondId < 0;

  if (isFirstOptimistic && isSecondOptimistic) {
    return Math.abs(firstId) - Math.abs(secondId);
  }

  if (isFirstOptimistic) {
    return 1;
  }

  if (isSecondOptimistic) {
    return -1;
  }

  return firstId - secondId;
}

export function settleOptimisticMessage(
  currentMessages: MessageRow[],
  optimisticMessage: MessageRow,
  savedMessage: MessageRow,
) {
  const settledMessage: MessageRow = {
    ...savedMessage,
    client_key:
      optimisticMessage.client_key ?? `optimistic-message-${optimisticMessage.id}`,
    created_at: savedMessage.created_at,
  };

  return mergeMessages(
    currentMessages.map((message) =>
      message.id === optimisticMessage.id ? settledMessage : message,
    ),
    [],
  );
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

