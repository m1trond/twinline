import { useState } from "react";

export function useMessageComposerState() {
  const [messageText, setMessageText] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordingDuration, setVoiceRecordingDuration] = useState(0);
  const [voiceRecordingStartedAt, setVoiceRecordingStartedAt] = useState<number | null>(null);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [stickerPickerPosition, setStickerPickerPosition] = useState({ left: 0, top: 0 });

  return {
    messageText,
    setMessageText,
    chatSearchQuery,
    setChatSearchQuery,
    isLoadingMessages,
    setIsLoadingMessages,
    isUploadingAttachment,
    setIsUploadingAttachment,
    isRecordingVoice,
    setIsRecordingVoice,
    voiceRecordingDuration,
    setVoiceRecordingDuration,
    voiceRecordingStartedAt,
    setVoiceRecordingStartedAt,
    isStickerPickerOpen,
    setIsStickerPickerOpen,
    stickerPickerPosition,
    setStickerPickerPosition,
  };
}
