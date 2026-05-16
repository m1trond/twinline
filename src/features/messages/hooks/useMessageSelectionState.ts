import { useState } from "react";
import type { MessageRow } from "@/shared/types";

export function useMessageSelectionState() {
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [replyTarget, setReplyTarget] = useState<MessageRow | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageRow | null>(null);
  const [isPinnedMessagesViewOpen, setIsPinnedMessagesViewOpen] = useState(false);
  const [isUnpinAllDialogOpen, setIsUnpinAllDialogOpen] = useState(false);
  const [pinnedNavigationIndex, setPinnedNavigationIndex] = useState(0);
  const [messagePinTarget, setMessagePinTarget] = useState<MessageRow | null>(null);
  const [shouldPinForBoth, setShouldPinForBoth] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<number[]>([]);
  const [messageDeleteTarget, setMessageDeleteTarget] = useState<MessageRow | null>(null);
  const [isSelectedDeleteDialogOpen, setIsSelectedDeleteDialogOpen] = useState(false);
  const [isChatDeleteDialogOpen, setIsChatDeleteDialogOpen] = useState(false);
  const [chatDeleteTargetUserId, setChatDeleteTargetUserId] = useState<string | null>(null);
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  return {
    highlightedMessageId,
    setHighlightedMessageId,
    unreadMessageCount,
    setUnreadMessageCount,
    replyTarget,
    setReplyTarget,
    editingMessage,
    setEditingMessage,
    isPinnedMessagesViewOpen,
    setIsPinnedMessagesViewOpen,
    isUnpinAllDialogOpen,
    setIsUnpinAllDialogOpen,
    pinnedNavigationIndex,
    setPinnedNavigationIndex,
    messagePinTarget,
    setMessagePinTarget,
    shouldPinForBoth,
    setShouldPinForBoth,
    selectedMessageIds,
    setSelectedMessageIds,
    messageDeleteTarget,
    setMessageDeleteTarget,
    isSelectedDeleteDialogOpen,
    setIsSelectedDeleteDialogOpen,
    isChatDeleteDialogOpen,
    setIsChatDeleteDialogOpen,
    chatDeleteTargetUserId,
    setChatDeleteTargetUserId,
    isDeletingChat,
    setIsDeletingChat,
  };
}
