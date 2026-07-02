import { memo, useCallback, useEffect, useState } from "react";
import { useChat } from "@/features/messages/contexts/ChatContext";
import { useI18n } from "@/shared/i18n-context";
import { MessageItem } from "@/features/messages/components/MessageItem";

export const MessageViewport = memo(
  function MessageViewport() {
    const { language } = useI18n();
    const {
      activeDialogMessages,
      loadedDialogUserIds,
      isLoadingMessages,
      selectedChatUserId,
      messagesListRef,
      messagesBottomAnchorRef,
      scrollbarTrackRef,
      scrollbarThumbRef,
      scrollButtonRef,
      scrollToBottom,
      isPinnedMessagesViewOpen,
      unreadMessagesByUserId,
    } = useChat();
    const [isScrollbarZoneHovered, setIsScrollbarZoneHovered] = useState(false);
    const [isScrollbarDragging, setIsScrollbarDragging] = useState(false);

    const isActiveDialogLoading = Boolean(
      selectedChatUserId && !loadedDialogUserIds.has(selectedChatUserId)
    );

    const visibleDialogMessages = isActiveDialogLoading ? [] : activeDialogMessages;
    const visibleDialogMessagesCount = visibleDialogMessages.length;
    const selectedChatUnreadCount = selectedChatUserId
      ? unreadMessagesByUserId.get(selectedChatUserId) ?? 0
      : 0;

    const syncScrollControls = useCallback((messagesList = messagesListRef.current) => {
      if (!messagesList) {
        return;
      }

      const maxScrollTop = messagesList.scrollHeight - messagesList.clientHeight;
      const isUp = maxScrollTop - messagesList.scrollTop > 450;
      const shouldShowButton = isUp && !isPinnedMessagesViewOpen;
      const shouldShowScrollbar =
        maxScrollTop > 0 &&
        !isPinnedMessagesViewOpen &&
        (isScrollbarZoneHovered || isScrollbarDragging);

      const button = scrollButtonRef.current;
      if (button) {
        if (shouldShowButton) {
          button.classList.remove("opacity-0", "pointer-events-none");
          button.classList.add("opacity-100");
        } else {
          button.classList.remove("opacity-100");
          button.classList.add("opacity-0", "pointer-events-none");
        }
      }

      const track = scrollbarTrackRef.current;
      const thumb = scrollbarThumbRef.current;
      if (!track || !thumb) {
        return;
      }

      if (shouldShowScrollbar) {
        track.classList.remove("opacity-0", "pointer-events-none");
        track.classList.add("opacity-100");

        const trackHeight = track.clientHeight;
        const visibleRatio = messagesList.clientHeight / messagesList.scrollHeight;
        const thumbHeight = Math.max(20, trackHeight * visibleRatio);
        const scrollableTrack = trackHeight - thumbHeight;
        const scrollableContent = messagesList.scrollHeight - messagesList.clientHeight;
        const scrollProgress = scrollableContent > 0 ? messagesList.scrollTop / scrollableContent : 0;
        const thumbTranslateY = scrollProgress * scrollableTrack;

        thumb.style.height = `${thumbHeight}px`;
        thumb.style.transform = `translateY(${thumbTranslateY}px)`;
      } else {
        track.classList.remove("opacity-100");
        track.classList.add("opacity-0", "pointer-events-none");
      }
    }, [
      isPinnedMessagesViewOpen,
      isScrollbarDragging,
      isScrollbarZoneHovered,
      messagesListRef,
      scrollButtonRef,
      scrollbarThumbRef,
      scrollbarTrackRef,
    ]);

    // Reset button/scrollbar on chat change
    useEffect(() => {
      const button = scrollButtonRef.current;
      if (button) {
        button.classList.remove("opacity-100");
        button.classList.add("opacity-0", "pointer-events-none");
      }
      const track = scrollbarTrackRef.current;
      if (track) {
        track.classList.remove("opacity-100");
        track.classList.add("opacity-0", "pointer-events-none");
      }
      setIsScrollbarZoneHovered(false);
      setIsScrollbarDragging(false);
    }, [selectedChatUserId, scrollButtonRef, scrollbarTrackRef]);

    // Handle scrollbar visible state and positioning
    useEffect(() => {
      if (isPinnedMessagesViewOpen) {
        const button = scrollButtonRef.current;
        if (button) {
          button.classList.remove("opacity-100");
          button.classList.add("opacity-0", "pointer-events-none");
        }
        const track = scrollbarTrackRef.current;
        if (track) {
          track.classList.remove("opacity-100");
          track.classList.add("opacity-0", "pointer-events-none");
        }
      } else {
        syncScrollControls();
      }
    }, [isPinnedMessagesViewOpen, scrollButtonRef, scrollbarTrackRef, syncScrollControls]);

    useEffect(() => {
      syncScrollControls();
    }, [syncScrollControls, visibleDialogMessagesCount]);

    // Handle scrollbar drag event listeners
    useEffect(() => {
      const track = scrollbarTrackRef.current;
      const thumb = scrollbarThumbRef.current;
      const viewport = messagesListRef.current;

      if (!track || !thumb || !viewport) {
        return;
      }

      let isDragging = false;
      let startY = 0;
      let startScrollTop = 0;

      const handlePointerDown = (event: PointerEvent) => {
        event.preventDefault();
        const target = event.target as HTMLElement;

        if (target === thumb) {
          isDragging = true;
          setIsScrollbarDragging(true);
          startY = event.clientY;
          startScrollTop = viewport.scrollTop;
          thumb.setPointerCapture(event.pointerId);
          thumb.classList.remove("bg-white/32", "hover:bg-white/45");
          thumb.classList.add("bg-white/60");
          return;
        }

        if (target === track) {
          const rect = track.getBoundingClientRect();
          const clickY = event.clientY - rect.top;
          const visibleRatio = viewport.clientHeight / viewport.scrollHeight;
          const thumbHeight = Math.max(20, rect.height * visibleRatio);

          const scrollableTrack = rect.height - thumbHeight;
          const clickProgress = scrollableTrack > 0 ? (clickY - thumbHeight / 2) / scrollableTrack : 0;
          const clampedProgress = Math.max(0, Math.min(1, clickProgress));

          const maxScroll = viewport.scrollHeight - viewport.clientHeight;
          viewport.scrollTop = clampedProgress * maxScroll;

          isDragging = true;
          setIsScrollbarDragging(true);
          startY = event.clientY;
          startScrollTop = viewport.scrollTop;

          thumb.setPointerCapture(event.pointerId);
          thumb.classList.remove("bg-white/32", "hover:bg-white/45");
          thumb.classList.add("bg-white/60");
        }
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (!isDragging) {
          return;
        }

        const deltaY = event.clientY - startY;
        const trackHeight = track.clientHeight;
        const visibleRatio = viewport.clientHeight / viewport.scrollHeight;
        const thumbHeight = Math.max(20, trackHeight * visibleRatio);

        const scrollableTrack = trackHeight - thumbHeight;
        const scrollableContent = viewport.scrollHeight - viewport.clientHeight;

        if (scrollableTrack > 0) {
          const scrollDelta = (deltaY / scrollableTrack) * scrollableContent;
          viewport.scrollTop = startScrollTop + scrollDelta;
        }
      };

      const handlePointerUp = (event: PointerEvent) => {
        if (!isDragging) {
          return;
        }

        isDragging = false;
        setIsScrollbarDragging(false);
        thumb.releasePointerCapture(event.pointerId);
        thumb.classList.remove("bg-white/60");
        thumb.classList.add("bg-white/32", "hover:bg-white/45");
      };

      track.addEventListener("pointerdown", handlePointerDown);
      thumb.addEventListener("pointermove", handlePointerMove);
      thumb.addEventListener("pointerup", handlePointerUp);
      thumb.addEventListener("pointercancel", handlePointerUp);

      return () => {
        track.removeEventListener("pointerdown", handlePointerDown);
        thumb.removeEventListener("pointermove", handlePointerMove);
        thumb.removeEventListener("pointerup", handlePointerUp);
        thumb.removeEventListener("pointercancel", handlePointerUp);
      };
    }, [selectedChatUserId, messagesListRef, scrollbarTrackRef, scrollbarThumbRef]);

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
      syncScrollControls(event.currentTarget);
    };

    return (
      <>
        {/* Main Message List Viewport Wrapper */}
        <div
          className="relative flex min-h-0 flex-1 flex-col"
          onPointerEnter={() => setIsScrollbarZoneHovered(true)}
          onPointerLeave={() => setIsScrollbarZoneHovered(false)}
        >
          <div
            className="hush-messages-viewport scrollbar-hidden flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border border-[#3f3f46]/45 bg-transparent p-2.5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:rounded-2xl sm:p-4 w-full h-full"
            ref={messagesListRef}
            onScroll={handleScroll}
          >
            {(isLoadingMessages || isActiveDialogLoading) && visibleDialogMessagesCount === 0 ? (
              <p className="text-sm text-[#a1a1aa]">
                {language === "en" ? "Loading messages..." : "Загружаю сообщения..."}
              </p>
            ) : null}

            {!(isLoadingMessages || isActiveDialogLoading) && visibleDialogMessagesCount === 0 ? (
              <p className="text-sm text-[#a1a1aa]">
                {language === "en"
                  ? "No messages yet. Write the first one."
                  : "Сообщений пока нет. Напиши первое."}
              </p>
            ) : null}

            {visibleDialogMessages.map((message, messageIndex) => (
              <MessageItem
                key={message.client_key ?? message.id}
                message={message}
                messageIndex={messageIndex}
                messagesArray={visibleDialogMessages}
                isFromPinnedList={false}
              />
            ))}

            <div
              aria-hidden="true"
              className="h-px shrink-0"
              ref={messagesBottomAnchorRef}
            />
          </div>

          {/* Custom Scrollbar Track */}
          <div
            className="absolute right-[4px] top-[6px] bottom-[6px] w-[6px] rounded-full bg-white/[0.03] hover:bg-white/[0.08] opacity-0 transition-[opacity,background-color] duration-200 pointer-events-none z-20 cursor-pointer"
            ref={scrollbarTrackRef}
          >
            {/* Custom Scrollbar Thumb */}
            <div
              className="w-full rounded-full bg-white/32 hover:bg-white/45 transition-[background-color] duration-150 cursor-grab active:cursor-grabbing"
              ref={scrollbarThumbRef}
              style={{ height: "0px", transform: "translateY(0px)" }}
            />
          </div>
        </div>

        <button
          className="hush-scroll-bottom-btn relative z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#3f3f46]/35 bg-[#18181c]/75 text-[#f4f4f5] shadow-[0_4px_12px_rgba(0,0,0,0.4)] opacity-0 pointer-events-none hover:bg-[#f4f4f5] hover:text-[#050505]"
          onClick={scrollToBottom}
          ref={scrollButtonRef}
          type="button"
        >
          {selectedChatUnreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#f4f4f5] px-1.5 text-[10px] font-semibold leading-none text-[#050505] shadow-[0_4px_14px_rgba(0,0,0,0.45)]">
              {selectedChatUnreadCount > 99 ? "99+" : selectedChatUnreadCount}
            </span>
          ) : null}
          <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
            />
          </svg>
        </button>
      </>
    );
  }
);
