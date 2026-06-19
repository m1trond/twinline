import type { FavoriteItem, MessageRow } from "@/shared/types";
import type { ReactNode } from "react";
import { useState } from "react";
import { useI18n } from "@/shared/i18n-context";
import { getMessageAudioUrl } from "@/shared/utils/messages";

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
  copyMessageText: (message: MessageRow) => void | Promise<void>;
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
  copyFavoriteText: (item: FavoriteItem) => void | Promise<void>;
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
  const { t } = useI18n();
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);

  if (!contextMenu) {
    return null;
  }

  const closeContextMenu = () => {
    setCopiedMessageId(null);
    setMessageContextMenu(null);
  };

  const isMine = contextMenu.message.user_id === currentUserId;
  const canEditMessage = isMine && !getMessageAudioUrl(contextMenu.message.text);
  const isPinned = activePinnedMessageIdSet.has(contextMenu.message.id);
  const isSelected = selectedMessageIdSet.has(contextMenu.message.id);

  return (
    <>
      <MenuBackdrop
        ariaLabel={t("cancel")}
        onClose={closeContextMenu}
      />
      <div
        className="hush-context-menu fixed z-[90] w-[min(220px,calc(100vw-24px))] overflow-hidden rounded-lg border border-white/10 bg-[#18181b] py-1 text-[#f4f4f5] shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
        style={{ left: contextMenu.left, top: contextMenu.top }}
      >
        <MenuButton icon={<ReplyIcon />} onClick={() => replyToMessage(contextMenu.message)}>
          {t("reply")}
        </MenuButton>
        {canEditMessage ? (
          <MenuButton
            icon={<EditIcon />}
            onClick={() => startEditingMessage(contextMenu.message)}
          >
            {t("edit")}
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
          {isPinned ? t("unpin") : t("pin")}
        </MenuButton>
        <MenuButton
          icon={<CopyIcon />}
          rightIcon={copiedMessageId === contextMenu.message.id ? <CheckIcon /> : null}
          onClick={() => {
            const messageId = contextMenu.message.id;
            void Promise.resolve(copyMessageText(contextMenu.message)).then(() => {
              setCopiedMessageId(messageId);
            });
          }}
        >
          {copiedMessageId === contextMenu.message.id ? "Скопировано" : t("copyText")}
        </MenuButton>
        {isMine ? (
          <MenuButton
            danger
            icon={<TrashIcon />}
            onClick={() => requestMessageDelete(contextMenu.message)}
          >
            {t("delete")}
          </MenuButton>
        ) : null}
        <MenuButton
          icon={<SelectIcon />}
          onClick={() => toggleSelectedMessage(contextMenu.message)}
        >
          {isSelected ? t("removeSelection") : t("select")}
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
  const { t } = useI18n();
  const [copiedFavoriteId, setCopiedFavoriteId] = useState<number | null>(null);

  if (!contextMenu) {
    return null;
  }

  const closeContextMenu = () => {
    setCopiedFavoriteId(null);
    setFavoriteContextMenu(null);
  };

  const isPinned = pinnedFavoriteItem?.id === contextMenu.item.id;
  const canEditItem = !getMessageAudioUrl(contextMenu.item.text);
  const isSelected = selectedMessageIdSet.has(contextMenu.item.id);

  return (
    <>
      <MenuBackdrop
        ariaLabel={t("cancel")}
        onClose={closeContextMenu}
      />
      <div
        className="hush-context-menu fixed z-[90] w-[min(220px,calc(100vw-24px))] overflow-hidden rounded-lg border border-white/10 bg-[#18181b] py-1 text-[#f4f4f5] shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
        style={{ left: contextMenu.left, top: contextMenu.top }}
      >
        <MenuButton icon={<ReplyIcon />} onClick={() => replyToFavoriteItem(contextMenu.item)}>
          {t("reply")}
        </MenuButton>
        {canEditItem ? (
          <MenuButton icon={<EditIcon />} onClick={() => startEditingFavoriteItem(contextMenu.item)}>
            {t("edit")}
          </MenuButton>
        ) : null}
        <MenuButton icon={<PinIcon />} onClick={() => togglePinnedFavoriteItem(contextMenu.item)}>
          {isPinned ? t("unpin") : t("pin")}
        </MenuButton>
        <MenuButton
          icon={<CopyIcon />}
          rightIcon={copiedFavoriteId === contextMenu.item.id ? <CheckIcon /> : null}
          onClick={() => {
            const favoriteId = contextMenu.item.id;
            void Promise.resolve(copyFavoriteText(contextMenu.item)).then(() => {
              setCopiedFavoriteId(favoriteId);
            });
          }}
        >
          {copiedFavoriteId === contextMenu.item.id ? "Скопировано" : t("copyText")}
        </MenuButton>
        <MenuButton danger icon={<TrashIcon />} onClick={() => removeFavoriteItem(contextMenu.item.id)}>
          {t("delete")}
        </MenuButton>
        <MenuButton icon={<SelectIcon />} onClick={() => toggleSelectedFavoriteItem(contextMenu.item)}>
          {isSelected ? t("removeSelection") : t("select")}
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
  rightIcon = null,
}: {
  children: string;
  danger?: boolean;
  icon: ReactNode;
  onClick: () => void;
  rightIcon?: ReactNode;
}) {
  return (
    <button
      className={`flex min-h-8 w-full items-center gap-2.5 px-3.5 text-left text-sm font-medium transition ${
        danger ? "text-[#f4f4f5] hover:bg-white/10" : "hover:bg-white/10"
      }`}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {rightIcon}
    </button>
  );
}

function ReplyIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M20 20v-7a4 4 0 0 0-4-4H4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M9 14 4 9l5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m15 5 4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M12 17v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <rect height="14" rx="2" ry="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" width="14" x="8" y="8" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
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
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
