import type { Dispatch, SetStateAction } from "react";
import type { MessageRow } from "@/shared/types";

type ChatDeleteTargetProfile = {
  name: string;
  userId: string;
};

type MessagePinDialogProps = {
  activePinnedMessageIdSet: Set<number>;
  confirmPinnedMessage: () => void;
  confirmUnpinPinnedMessage: () => void;
  getReadableMessageText: (text: string) => string;
  messagePinTarget: MessageRow | null;
  setMessagePinTarget: (message: MessageRow | null) => void;
  setShouldPinForBoth: Dispatch<SetStateAction<boolean>>;
  shouldPinForBoth: boolean;
};

type MessageDeleteDialogProps = {
  deleteMessage: (message: MessageRow) => void;
  getReadableMessageText: (text: string) => string;
  hideMessageForMe: (message: MessageRow) => void;
  messageDeleteTarget: MessageRow | null;
  setMessageDeleteTarget: (message: MessageRow | null) => void;
};

type SelectedMessagesDeleteDialogProps = {
  deleteSelectedMessagesForBoth: () => void;
  getReadableMessageText: (text: string) => string;
  hideSelectedMessagesForMe: () => void;
  isOpen: boolean;
  selectedDialogMessages: MessageRow[];
  setIsSelectedDeleteDialogOpen: (isOpen: boolean) => void;
};

type ChatDeleteDialogProps = {
  chatDeleteTargetProfile: ChatDeleteTargetProfile | null;
  confirmDeleteChat: () => void;
  isDeletingChat: boolean;
  isOpen: boolean;
  onClose: () => void;
};

type UnpinAllDialogProps = {
  isOpen: boolean;
  messageCount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

function DeleteIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function MessagePinDialog({
  activePinnedMessageIdSet,
  confirmPinnedMessage,
  confirmUnpinPinnedMessage,
  getReadableMessageText,
  messagePinTarget,
  setMessagePinTarget,
  setShouldPinForBoth,
  shouldPinForBoth,
}: MessagePinDialogProps) {
  if (!messagePinTarget) {
    return null;
  }

  const isPinned = activePinnedMessageIdSet.has(messagePinTarget.id);

  return (
    <>
      <button
        aria-label="Закрыть окно закрепления сообщения"
        className="fixed inset-0 z-[95] bg-black/58 backdrop-blur-sm"
        onClick={() => setMessagePinTarget(null)}
        type="button"
      />
      <section className="fixed left-1/2 top-1/2 z-[96] max-h-[calc(100dvh-24px)] w-[min(448px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:w-[min(448px,calc(100vw-32px))] sm:rounded-3xl sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f4f4f5]/14 text-[#f4f4f5]">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path
                d="m14.5 4.5 5 5-3.4 1.1-4.8 4.8.7 3.6-7-7 3.6.7 4.8-4.8 1.1-3.4Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path d="m9.5 14.5-4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-medium text-[#f4f4f5]">
              {isPinned ? "Открепить сообщение?" : "Закрепить сообщение?"}
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-[#a1a1aa]">
              {isPinned
                ? "Сообщение исчезнет из закрепа в этом чате."
                : "Сообщение будет видно сверху переписки."}
            </p>
          </div>
        </div>

        {!isPinned ? (
          <>
            <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/20 p-3">
              <p className="line-clamp-3 text-[13px] font-medium text-[#f4f4f5]">
                {getReadableMessageText(messagePinTarget.text)}
              </p>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-[#3f3f46]/35 bg-[#f4f4f5]/8 p-3 text-[13px] font-medium text-[#f4f4f5]">
              <input
                checked={shouldPinForBoth}
                className="h-5 w-5 accent-[#f4f4f5]"
                onChange={(event) => setShouldPinForBoth(event.target.checked)}
                type="checkbox"
              />
              <span>Закрепить для двоих</span>
            </label>
          </>
        ) : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-12 rounded-xl bg-[#f4f4f5] px-4 text-[13px] font-medium text-[#050505] transition hover:bg-[#e5e5e5]"
            onClick={isPinned ? confirmUnpinPinnedMessage : confirmPinnedMessage}
            type="button"
          >
            {isPinned ? "Да" : "Закрепить"}
          </button>
          <button
            className="min-h-12 rounded-xl border border-[#3f3f46]/35 px-4 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
            onClick={() => setMessagePinTarget(null)}
            type="button"
          >
            {isPinned ? "Нет" : "Отмена"}
          </button>
        </div>
      </section>
    </>
  );
}

export function MessageDeleteDialog({
  deleteMessage,
  getReadableMessageText,
  hideMessageForMe,
  messageDeleteTarget,
  setMessageDeleteTarget,
}: MessageDeleteDialogProps) {
  if (!messageDeleteTarget) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Закрыть окно удаления сообщения"
        className="fixed inset-0 z-[95] bg-black/58 backdrop-blur-sm"
        onClick={() => setMessageDeleteTarget(null)}
        type="button"
      />
      <section className="fixed left-1/2 top-1/2 z-[96] max-h-[calc(100dvh-24px)] w-[min(448px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:w-[min(448px,calc(100vw-32px))] sm:rounded-3xl sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/14 text-red-100">
            <DeleteIcon />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-medium text-[#f4f4f5]">
              Удаление сообщения
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-[#a1a1aa]">
              Выберите, удалить сообщение только у себя или у обоих участников переписки.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/20 p-3">
          <p className="line-clamp-3 text-[13px] font-medium text-[#f4f4f5]">
            {getReadableMessageText(messageDeleteTarget.text)}
          </p>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-12 rounded-xl border border-[#3f3f46]/35 px-4 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
            onClick={() => hideMessageForMe(messageDeleteTarget)}
            type="button"
          >
            Только у себя
          </button>
          <button
            className="min-h-12 rounded-xl bg-red-500 px-4 text-[13px] font-medium text-white transition hover:bg-red-400"
            onClick={() => deleteMessage(messageDeleteTarget)}
            type="button"
          >
            У обоих
          </button>
        </div>

        <button
          className="mt-3 min-h-11 w-full rounded-xl px-4 text-[13px] font-medium text-[#a1a1aa] transition hover:bg-white/10 hover:text-[#f4f4f5]"
          onClick={() => setMessageDeleteTarget(null)}
          type="button"
        >
          Отмена
        </button>
      </section>
    </>
  );
}

export function SelectedMessagesDeleteDialog({
  deleteSelectedMessagesForBoth,
  getReadableMessageText,
  hideSelectedMessagesForMe,
  isOpen,
  selectedDialogMessages,
  setIsSelectedDeleteDialogOpen,
}: SelectedMessagesDeleteDialogProps) {
  if (!isOpen || selectedDialogMessages.length === 0) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Закрыть окно удаления выбранных сообщений"
        className="fixed inset-0 z-[95] bg-black/58 backdrop-blur-sm"
        onClick={() => setIsSelectedDeleteDialogOpen(false)}
        type="button"
      />
      <section className="fixed left-1/2 top-1/2 z-[96] max-h-[calc(100dvh-24px)] w-[min(448px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:w-[min(448px,calc(100vw-32px))] sm:rounded-3xl sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/14 text-red-100">
            <DeleteIcon />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-medium text-[#f4f4f5]">
              Удаление сообщений
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-[#a1a1aa]">
              Выбери, удалить выделенные только у себя или у обоих участников переписки.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/20 p-3">
          <p className="text-[13px] font-medium text-[#f4f4f5]">
            {selectedDialogMessages.length} сообщ.
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-[#a1a1aa]">
            {getReadableMessageText(selectedDialogMessages.at(-1)?.text ?? "")}
          </p>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-12 rounded-xl border border-[#3f3f46]/35 px-4 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
            onClick={hideSelectedMessagesForMe}
            type="button"
          >
            Только у себя
          </button>
          <button
            className="min-h-12 rounded-xl bg-red-500 px-4 text-[13px] font-medium text-white transition hover:bg-red-400"
            onClick={deleteSelectedMessagesForBoth}
            type="button"
          >
            У обоих
          </button>
        </div>

        <button
          className="mt-3 min-h-11 w-full rounded-xl px-4 text-[13px] font-medium text-[#a1a1aa] transition hover:bg-white/10 hover:text-[#f4f4f5]"
          onClick={() => setIsSelectedDeleteDialogOpen(false)}
          type="button"
        >
          Отмена
        </button>
      </section>
    </>
  );
}

export function ChatDeleteDialog({
  chatDeleteTargetProfile,
  confirmDeleteChat,
  isDeletingChat,
  isOpen,
  onClose,
}: ChatDeleteDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Закрыть окно удаления переписки"
        className="fixed inset-0 z-[95] bg-black/62 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <section className="fixed left-1/2 top-1/2 z-[96] w-[min(460px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-red-400/25 bg-[#111111]/96 p-4 text-left shadow-[0_24px_90px_rgba(0,0,0,0.65)] sm:rounded-3xl sm:p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(248,113,113,0.18),transparent_34%),linear-gradient(135deg,rgba(244,244,245,0.04),transparent_54%)]"
        />
        <div className="relative">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-red-300/25 bg-red-500/16 text-red-100 shadow-[0_10px_30px_rgba(239,68,68,0.18)]">
              <DeleteIcon />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-medium text-[#f4f4f5]">
                Удалить чат у двоих?
              </h2>
              <p className="mt-2 text-[13px] leading-6 text-[#a1a1aa]">
                Сообщения этой переписки исчезнут у тебя и собеседника. Отменить действие не получится.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/24 p-3">
            <p className="text-[13px] font-medium text-[#f4f4f5]">
              {chatDeleteTargetProfile?.name
                ? `Чат с ${chatDeleteTargetProfile.name}`
                : "Текущий чат"}
            </p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              className="min-h-12 rounded-xl border border-[#3f3f46]/35 px-4 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
              onClick={onClose}
              type="button"
            >
              Оставить
            </button>
            <button
              className="min-h-12 rounded-xl bg-red-500 px-4 text-[13px] font-medium text-white shadow-[0_14px_34px_rgba(239,68,68,0.22)] transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDeletingChat}
              onClick={confirmDeleteChat}
              type="button"
            >
              {isDeletingChat ? "Удаляю..." : "Удалить у двоих"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export function UnpinAllDialog({
  isOpen,
  messageCount,
  onCancel,
  onConfirm,
}: UnpinAllDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        aria-label="Закрыть окно открепления"
        className="fixed inset-0 z-[95] bg-black/58 backdrop-blur-sm"
        onClick={onCancel}
        type="button"
      />
      <section className="fixed left-1/2 top-1/2 z-[96] w-[min(440px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-red-400/25 bg-[#111111]/96 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.58)] sm:rounded-3xl sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.18),transparent_36%),linear-gradient(145deg,rgba(255,255,255,0.05),transparent_48%)]" />
        <div className="relative">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-red-300/25 bg-red-500/14 text-red-100">
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path
                  d="m14.5 4.5 5 5-3.4 1.1-4.8 4.8.7 3.6-7-7 3.6.7 4.8-4.8 1.1-3.4Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <path d="m9.5 14.5-4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-medium text-[#f4f4f5]">
                Открепить все закрепы?
              </h2>
              <p className="mt-1 text-[13px] leading-6 text-[#a1a1aa]">
                Закрепы исчезнут из списка этого чата. Общие закрепы открепятся для обоих.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#3f3f46]/35 bg-black/22 px-3 py-2.5">
            <p className="text-[13px] font-medium text-[#f4f4f5]">
              {messageCount} сообщ.
            </p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              className="min-h-12 rounded-xl border border-[#3f3f46]/35 px-4 text-[13px] font-medium text-[#f4f4f5] transition hover:bg-white/10"
              onClick={onCancel}
              type="button"
            >
              Оставить
            </button>
            <button
              className="min-h-12 rounded-xl bg-red-500 px-4 text-[13px] font-medium text-white transition hover:bg-red-400"
              onClick={onConfirm}
              type="button"
            >
              Открепить
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
