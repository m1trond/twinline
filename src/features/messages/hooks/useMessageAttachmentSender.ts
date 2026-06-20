import { useCallback } from "react";
import type { ActiveView, MessageRow } from "@/shared/types";
import { supabase } from "@/lib/supabase";
import {
  audioMessagePrefix,
  imageMessagePrefix,
  maxAttachmentSize,
  videoMessagePrefix,
} from "@/shared/constants";
import {
  getAttachmentFolder,
  getSafeFileExtension,
} from "@/shared/utils/files";
import { createFileMessageText } from "@/shared/utils/messages";

type SendDirectMessage = (
  text: string,
  options: {
    errorMessage: string;
    onError?: () => void;
    recipientId?: string | null;
  },
) => Promise<MessageRow | null>;

type UseMessageAttachmentSenderParams = {
  activeView: ActiveView;
  addFavoriteChatMessage: (text: string) => void;
  selectedChatUserId: string | null;
  sendDirectMessage: SendDirectMessage;
  setErrorMessage: (message: string) => void;
  setIsUploadingAttachment: (isUploading: boolean) => void;
  userId: string | null | undefined;
};

async function uploadMessageFile(
  filePath: string,
  file: Blob,
  contentType: string,
) {
  const { error } = await supabase.storage
    .from("message-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType,
      upsert: false,
    });

  if (error) {
    return { error, publicUrl: "" };
  }

  const { data } = supabase.storage
    .from("message-images")
    .getPublicUrl(filePath);

  return { error: null, publicUrl: data.publicUrl };
}

export function useMessageAttachmentSender({
  activeView,
  addFavoriteChatMessage,
  selectedChatUserId,
  sendDirectMessage,
  setErrorMessage,
  setIsUploadingAttachment,
  userId,
}: UseMessageAttachmentSenderParams) {
  const sendAttachment = useCallback(
    async (file: File) => {
      if (!userId) {
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
      const filePath = `${userId}/${getAttachmentFolder(file)}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
      const { error, publicUrl } = await uploadMessageFile(
        filePath,
        file,
        file.type || "application/octet-stream",
      );

      if (error) {
        console.error("Hush file upload failed:", error.message);
        setIsUploadingAttachment(false);
        setErrorMessage("Не получилось загрузить файл.");
        return;
      }

      const messageText = isImage
        ? `${imageMessagePrefix}${publicUrl}`
        : isVideo
          ? `${videoMessagePrefix}${publicUrl}`
          : createFileMessageText({
              name: file.name || "Файл",
              size: file.size,
              type: file.type,
              url: publicUrl,
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

      await sendDirectMessage(messageText, {
        errorMessage: "Не получилось отправить файл.",
      });
      setIsUploadingAttachment(false);
    },
    [
      activeView,
      addFavoriteChatMessage,
      selectedChatUserId,
      sendDirectMessage,
      setErrorMessage,
      setIsUploadingAttachment,
      userId,
    ],
  );

  const sendVoiceMessage = useCallback(
    async (audioBlob: Blob) => {
      if (!userId) {
        setErrorMessage("Сначала войди в аккаунт.");
        return;
      }

      if (audioBlob.size > maxAttachmentSize) {
        setErrorMessage("Голосовое сообщение должно быть меньше 50 МБ.");
        return;
      }

      setIsUploadingAttachment(true);
      setErrorMessage("");

      const filePath = `${userId}/voice-${Date.now()}-${crypto.randomUUID()}.webm`;
      const { error, publicUrl } = await uploadMessageFile(
        filePath,
        audioBlob,
        audioBlob.type || "audio/webm",
      );

      if (error) {
        setIsUploadingAttachment(false);
        setErrorMessage("Не получилось загрузить голосовое сообщение.");
        return;
      }

      const messageText = `${audioMessagePrefix}${publicUrl}`;

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

      await sendDirectMessage(messageText, {
        errorMessage: "Не получилось отправить голосовое сообщение.",
      });
      setIsUploadingAttachment(false);
    },
    [
      activeView,
      addFavoriteChatMessage,
      selectedChatUserId,
      sendDirectMessage,
      setErrorMessage,
      setIsUploadingAttachment,
      userId,
    ],
  );

  return {
    sendAttachment,
    sendVoiceMessage,
  };
}
