import type { FormEvent } from "react";
import { useI18n } from "@/shared/i18n-context";
import type { ChatFolder } from "@/shared/types";

export type FolderContextMenuState = {
  folder: ChatFolder | null;
  left: number;
  top: number;
};

export type FolderDialogState = {
  folder: ChatFolder | null;
  mode: "create" | "rename";
  profileUserId?: string;
};

const folderColors = [
  "#f4f4f5",
  "#60a5fa",
  "#34d399",
  "#f59e0b",
  "#f472b6",
  "#a78bfa",
  "#fb7185",
];

export function FolderContextMenu({
  contextMenu,
  openRenameDialog,
  requestDeleteFolder,
  setContextMenu,
  updateFolderColor,
}: {
  contextMenu: FolderContextMenuState | null;
  openRenameDialog: (folder: ChatFolder | null) => void;
  requestDeleteFolder: (folder: ChatFolder) => void;
  setContextMenu: (menu: FolderContextMenuState | null) => void;
  updateFolderColor: (folderId: string, color: string) => void;
}) {
  const { t } = useI18n();

  if (!contextMenu) {
    return null;
  }

  const isBaseFolder = contextMenu.folder === null;

  return (
    <>
      <button
        aria-label={t("cancel")}
        className="fixed inset-0 z-[80] cursor-default bg-transparent"
        onClick={() => setContextMenu(null)}
        onContextMenu={(event) => {
          event.preventDefault();
          setContextMenu(null);
        }}
        type="button"
      />
      <div
        className="hush-context-menu fixed z-[90] w-[min(236px,calc(100vw-24px))] overflow-hidden rounded-xl border border-white/10 bg-[#18181b]/98 py-1.5 text-[#f4f4f5] shadow-[0_22px_70px_rgba(0,0,0,0.58)] backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
        style={{ left: contextMenu.left, top: contextMenu.top }}
      >
        <MenuButton onClick={() => openRenameDialog(contextMenu.folder)}>
          {t("edit")}
        </MenuButton>
        {!isBaseFolder ? (
          <>
            <div className="px-3 py-2">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-[#a1a1aa]">
                {t("changeColor")}
              </p>
              <div className="grid grid-cols-7 gap-1.5">
                {folderColors.map((color) => (
                  <button
                    aria-label={color}
                    className="h-6 w-6 rounded-full border border-white/15 transition hover:scale-110"
                    key={color}
                    onClick={() => {
                      if (contextMenu.folder) {
                        updateFolderColor(contextMenu.folder.id, color);
                      }
                    }}
                    style={{ backgroundColor: color }}
                    type="button"
                  />
                ))}
              </div>
            </div>
            <MenuButton danger onClick={() => requestDeleteFolder(contextMenu.folder!)}>
              {t("delete")}
            </MenuButton>
          </>
        ) : null}
      </div>
    </>
  );
}

export function FolderDeleteDialog({
  folder,
  onCancel,
  onConfirm,
}: {
  folder: ChatFolder | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();

  if (!folder) {
    return null;
  }

  return (
    <>
      <button
        aria-label={t("cancel")}
        className="fixed inset-0 z-[115] bg-black/62 backdrop-blur-md"
        onClick={onCancel}
        type="button"
      />
      <section className="hush-modal-transition fixed left-1/2 top-1/2 z-[116] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[24px] border border-red-400/25 bg-[#101010]/98 p-4 text-left shadow-[0_28px_90px_rgba(0,0,0,0.68)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.16),transparent_36%),linear-gradient(145deg,rgba(255,255,255,0.05),transparent_48%)]" />
        <div className="relative">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-red-300/25 bg-red-500/14 text-red-100">
              <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path
                  d="M10 11v6M14 11v6M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-medium text-[#f4f4f5]">
                {t("deleteFolderTitle")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#a1a1aa]">
                {t("deleteFolderDescription")}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#3f3f46]/35 bg-black/22 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-[#f4f4f5]">{folder.name}</p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              className="min-h-11 rounded-xl border border-[#3f3f46]/35 px-4 text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
              onClick={onCancel}
              type="button"
            >
              {t("cancel")}
            </button>
            <button
              className="min-h-11 rounded-xl bg-red-500 px-4 text-sm font-medium text-white transition hover:bg-red-400"
              onClick={onConfirm}
              type="button"
            >
              {t("delete")}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export function FolderDialog({
  dialog,
  folderName,
  onClose,
  onSubmit,
  setFolderName,
}: {
  dialog: FolderDialogState | null;
  folderName: string;
  onClose: () => void;
  onSubmit: () => void;
  setFolderName: (name: string) => void;
}) {
  const { t } = useI18n();

  if (!dialog) {
    return null;
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <>
      <button
        aria-label={t("cancel")}
        className="fixed inset-0 z-[115] bg-black/62 backdrop-blur-md"
        onClick={onClose}
        type="button"
      />
      <form
        className="hush-modal-transition fixed left-1/2 top-1/2 z-[116] w-[min(430px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-[#3f3f46]/55 bg-[#101010]/98 p-4 text-left shadow-[0_28px_90px_rgba(0,0,0,0.68)] backdrop-blur-xl"
        onSubmit={submitForm}
      >
        <h2 className="text-base font-medium text-[#f4f4f5]">
          {dialog.mode === "create" ? t("newFolder") : t("edit")}
        </h2>
        <label className="mt-4 grid gap-2">
          <span className="text-sm font-medium text-[#d4d4d8]">{t("folderName")}</span>
          <input
            autoFocus
            className="min-h-11 rounded-xl border border-[#3f3f46]/40 bg-[#f4f4f5]/12 px-3 text-sm text-[#f4f4f5] outline-none transition placeholder:text-[#a1a1aa]/65 focus:border-[#f4f4f5]"
            maxLength={28}
            onChange={(event) => setFolderName(event.target.value)}
            value={folderName}
          />
        </label>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-11 rounded-xl bg-[#f4f4f5] px-4 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5]"
            type="submit"
          >
            {t("save")}
          </button>
          <button
            className="min-h-11 rounded-xl border border-[#3f3f46]/45 bg-white/[0.03] px-4 text-sm font-medium text-[#f4f4f5] transition hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            {t("cancel")}
          </button>
        </div>
      </form>
    </>
  );
}

function MenuButton({
  children,
  danger = false,
  onClick,
}: {
  children: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex min-h-10 w-full items-center px-4 text-left text-sm font-medium transition ${
        danger ? "text-red-100 hover:bg-red-500/18" : "hover:bg-white/10"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
