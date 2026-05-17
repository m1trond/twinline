import type { FavoriteItem, MessageRow } from "@/shared/types";
import type { ReactNode } from "react";

type MessageContextMenuState = {
  left: number;
  message: MessageRow;
  top: number;
};

type FavoriteContextMenuState = {
  item: FavoriteItem;
  left: number;
  top: number;
};

type MessageContextMenuProps = {
  activePinnedMessageIdSet: Set<number>;
  contextMenu: MessageContextMenuState | null;
  copyMessageText: (message: MessageRow) => void;
  currentUserId: string | undefined;
  replyToMessage: (message: MessageRow) => void;
  requestMessageDelete: (message: MessageRow) => void;
  requestPinnedMessage: (message: MessageRow) => void;
  requestUnpinPinnedMessage: (message: MessageRow) => void;
  selectedMessageIdSet: Set<number>;
  setMessageContextMenu: (menu: MessageContextMenuState | null) => void;
  startEditingMessage: (message: MessageRow) => void;
  toggleSelectedMessage: (message: MessageRow) => void;
};

type FavoriteContextMenuProps = {
  contextMenu: FavoriteContextMenuState | null;
  copyFavoriteText: (item: FavoriteItem) => void;
  pinnedFavoriteItem: FavoriteItem | null;
  removeFavoriteItem: (favoriteItemId: number) => void;
  replyToFavoriteItem: (item: FavoriteItem) => void;
  selectedMessageIdSet: Set<number>;
  setFavoriteContextMenu: (menu: FavoriteContextMenuState | null) => void;
  startEditingFavoriteItem: (item: FavoriteItem) => void;
  togglePinnedFavoriteItem: (item: FavoriteItem) => void;
  toggleSelectedFavoriteItem: (item: FavoriteItem) => void;
};

export function MessageContextMenu({
  activePinnedMessageIdSet,
  contextMenu,
  copyMessageText,
  currentUserId,
  replyToMessage,
  requestMessageDelete,
  requestPinnedMessage,
  requestUnpinPinnedMessage,
  selectedMessageIdSet,
  setMessageContextMenu,
  startEditingMessage,
  toggleSelectedMessage,
}: MessageContextMenuProps) {
  if (!contextMenu) {
    return null;
  }

  const isMine = contextMenu.message.user_id === currentUserId;
  const isPinned = activePinnedMessageIdSet.has(contextMenu.message.id);
  const isSelected = selectedMessageIdSet.has(contextMenu.message.id);

  return (
    <>
      <MenuBackdrop
        ariaLabel="Закрыть меню сообщения"
        onClose={() => setMessageContextMenu(null)}
      />
      <div
        className="hush-context-menu fixed z-[90] w-[min(220px,calc(100vw-24px))] overflow-hidden rounded-lg border border-white/10 bg-[#18181b] py-1.5 text-[#f4f4f5] shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
        style={{ left: contextMenu.left, top: contextMenu.top }}
      >
        <MenuButton icon={<ReplyIcon />} onClick={() => replyToMessage(contextMenu.message)}>
          Ответить
        </MenuButton>
        {isMine ? (
          <MenuButton
            icon={<EditIcon />}
            onClick={() => startEditingMessage(contextMenu.message)}
          >
            Изменить
          </MenuButton>
        ) : null}
        <MenuButton
          icon={<PinIcon />}
          onClick={() =>
            isPinned
              ? requestUnpinPinnedMessage(contextMenu.message)
              : requestPinnedMessage(contextMenu.message)
          }
        >
          {isPinned ? "Открепить" : "Закрепить"}
        </MenuButton>
        <MenuButton icon={<CopyIcon />} onClick={() => copyMessageText(contextMenu.message)}>
          Копировать текст
        </MenuButton>
        {isMine ? (
          <MenuButton
            danger
            icon={<TrashIcon />}
            onClick={() => requestMessageDelete(contextMenu.message)}
          >
            Удалить
          </MenuButton>
        ) : null}
        <MenuButton
          icon={<SelectIcon />}
          onClick={() => toggleSelectedMessage(contextMenu.message)}
        >
          {isSelected ? "Снять выделение" : "Выделить"}
        </MenuButton>
      </div>
    </>
  );
}

export function FavoriteContextMenu({
  contextMenu,
  copyFavoriteText,
  pinnedFavoriteItem,
  removeFavoriteItem,
  replyToFavoriteItem,
  selectedMessageIdSet,
  setFavoriteContextMenu,
  startEditingFavoriteItem,
  togglePinnedFavoriteItem,
  toggleSelectedFavoriteItem,
}: FavoriteContextMenuProps) {
  if (!contextMenu) {
    return null;
  }

  const isPinned = pinnedFavoriteItem?.id === contextMenu.item.id;
  const isSelected = selectedMessageIdSet.has(contextMenu.item.id);

  return (
    <>
      <MenuBackdrop
        ariaLabel="Закрыть меню избранного"
        onClose={() => setFavoriteContextMenu(null)}
      />
      <div
        className="hush-context-menu fixed z-[90] w-[min(220px,calc(100vw-24px))] overflow-hidden rounded-lg border border-white/10 bg-[#18181b] py-1.5 text-[#f4f4f5] shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
        style={{ left: contextMenu.left, top: contextMenu.top }}
      >
        <MenuButton icon={<ReplyIcon />} onClick={() => replyToFavoriteItem(contextMenu.item)}>
          Ответить
        </MenuButton>
        <MenuButton icon={<EditIcon />} onClick={() => startEditingFavoriteItem(contextMenu.item)}>
          Изменить
        </MenuButton>
        <MenuButton icon={<PinIcon />} onClick={() => togglePinnedFavoriteItem(contextMenu.item)}>
          {isPinned ? "Открепить" : "Закрепить"}
        </MenuButton>
        <MenuButton icon={<CopyIcon />} onClick={() => copyFavoriteText(contextMenu.item)}>
          Копировать текст
        </MenuButton>
        <MenuButton danger icon={<TrashIcon />} onClick={() => removeFavoriteItem(contextMenu.item.id)}>
          Удалить
        </MenuButton>
        <MenuButton icon={<SelectIcon />} onClick={() => toggleSelectedFavoriteItem(contextMenu.item)}>
          {isSelected ? "Снять выделение" : "Выделить"}
        </MenuButton>
      </div>
    </>
  );
}

function MenuBackdrop({
  ariaLabel,
  onClose,
}: {
  ariaLabel: string;
  onClose: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="fixed inset-0 z-[80] cursor-default bg-transparent"
      onClick={onClose}
      onContextMenu={(event) => {
        event.preventDefault();
        onClose();
      }}
      type="button"
    />
  );
}

function MenuButton({
  children,
  danger = false,
  icon,
  onClick,
}: {
  children: string;
  danger?: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex min-h-10 w-full items-center gap-3 px-4 text-left text-sm font-medium transition ${
        danger ? "text-red-100 hover:bg-red-500/18" : "hover:bg-white/10"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function ReplyIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M9 14 4 9l5-5M4 9h9a7 7 0 0 1 7 7v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="m14.5 4.5 5 5-3.4 1.1-4.8 4.8.7 3.6-7-7 3.6.7 4.8-4.8 1.1-3.4Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m9.5 14.5-4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <rect height="14" rx="2" stroke="currentColor" strokeWidth="2" width="12" x="8" y="8" />
      <path d="M4 16V6a2 2 0 0 1 2-2h10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function SelectIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M9 12.5 11 14.5 15.5 9.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
