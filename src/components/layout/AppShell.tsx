import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useSidebarResize, clampSidebarWidth } from "./useSidebarResize";
import { SearchResultList } from "./SidebarSearch";
import { BrandMark } from "@/components/brand/BrandMark";
import { NavButton, NavIcon } from "@/components/navigation/NavButton";
import { useI18n } from "@/shared/i18n-context";
import { accessNavItem, navItems, settingsNavItem } from "@/shared/constants";
import type { ActiveView, ProfileRow } from "@/shared/types";
import type { ViewedProfileState } from "@/features/navigation/useNavigationState";

type AppShellProps = {
  activeView: ActiveView;
  canViewAccess: boolean;
  chatSearchQuery: string;
  children: ReactNode;
  areSoftEffectsEnabled: boolean;
  isLightThemeEnabled: boolean;
  searchableProfiles: ProfileRow[];
  setActiveView: (view: ActiveView) => void;
  setChatSearchQuery: (query: string) => void;
  setSelectedChatUserId: (userId: string | null) => void;
  setViewedProfile: (profile: ViewedProfileState | null) => void;
  totalUnreadMessageCount: number;
};

const sidebarStorageKey = "hush-sidebar-width";
const legacySidebarStorageKey = "twinline-sidebar-width";
const defaultSidebarWidth = 270;
const collapsedSidebarThreshold = 190;

export function AppShell({
  activeView,
  canViewAccess,
  chatSearchQuery,
  children,
  areSoftEffectsEnabled,
  isLightThemeEnabled,
  searchableProfiles,
  setActiveView,
  setChatSearchQuery,
  setSelectedChatUserId,
  setViewedProfile,
  totalUnreadMessageCount,
}: AppShellProps) {
  const { t } = useI18n();
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") {
      return defaultSidebarWidth;
    }

    const storedSidebarWidth =
      window.localStorage.getItem(sidebarStorageKey) ??
      window.localStorage.getItem(legacySidebarStorageKey);
    const storedWidth = Number(storedSidebarWidth);

    if (storedSidebarWidth !== null) {
      window.localStorage.setItem(sidebarStorageKey, storedSidebarWidth);
    }

    return clampSidebarWidth(Number.isFinite(storedWidth) && storedWidth > 0 ? storedWidth : defaultSidebarWidth);
  });
  const isSidebarCollapsed = sidebarWidth <= collapsedSidebarThreshold;
  const isSidebarIconMode = isSidebarCollapsed;
  const [isCollapsedSearchOpen, setIsCollapsedSearchOpen] = useState(false);
  const isCollapsedSearchVisible = isSidebarIconMode && isCollapsedSearchOpen;
  const collapsedSearchButtonRef = useRef<HTMLButtonElement | null>(null);
  const collapsedSearchPopoverRef = useRef<HTMLDivElement | null>(null);
  const sidebarGridRef = useRef<HTMLElement | null>(null);
  const sidebarGridStyle = {
    "--sidebar-width": `${sidebarWidth}px`,
  } as CSSProperties;
  const translatedNavItems = navItems.map((item) => ({
    ...item,
    label:
      item.view === "profile"
        ? t("profile")
        : item.view === "messages"
          ? t("messages")
          : item.view === "favorites"
            ? t("favorites")
            : item.view === "music"
              ? t("music")
              : item.label,
  }));
  const translatedAccessNavItem = {
    ...accessNavItem,
    label: t("access"),
  };
  const translatedSettingsNavItem = {
    ...settingsNavItem,
    label: t("settings"),
  };

  useEffect(() => {
    function handleWindowResize() {
      setSidebarWidth((currentWidth) => clampSidebarWidth(currentWidth, sidebarGridRef.current));
    }

    handleWindowResize();
    window.addEventListener("resize", handleWindowResize);

    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(sidebarStorageKey, String(Math.round(sidebarWidth)));
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isCollapsedSearchVisible) {
      return;
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCollapsedSearchOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscapeKey);

    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [isCollapsedSearchVisible]);

  useEffect(() => {
    if (!isCollapsedSearchVisible) {
      return;
    }

    function handleOutsidePointerDown(event: globalThis.PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        collapsedSearchButtonRef.current?.contains(target) ||
        collapsedSearchPopoverRef.current?.contains(target)
      ) {
        return;
      }

      setIsCollapsedSearchOpen(false);
    }

    window.addEventListener("pointerdown", handleOutsidePointerDown);

    return () => window.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [isCollapsedSearchVisible]);

  function selectView(view: ActiveView) {
    setActiveView(view);

    if (view === "messages") {
      setSelectedChatUserId(null);
    }
  }

  const { startSidebarResize } = useSidebarResize({
    sidebarWidth,
    setSidebarWidth,
    sidebarGridRef,
  });

  return (
    <main className={`hush-shell ${isLightThemeEnabled ? "hush-light" : ""} ${areSoftEffectsEnabled ? "" : "hush-reduced-effects"} relative h-dvh overflow-hidden bg-[#000000] text-[#f4f4f5]`}>
      {isLightThemeEnabled ? (
        <>
          <div
            aria-hidden="true"
            className="hush-galaxy-background absolute inset-0"
          />
          <div
            aria-hidden="true"
            className="hush-galaxy-stars absolute inset-0"
          />
        </>
      ) : null}
      <div className="relative h-full overflow-hidden bg-transparent">
        <div className="safe-bottom flex h-full w-full flex-col overflow-hidden px-1.5 py-1.5 sm:px-3 sm:py-3 lg:px-4 xl:px-5">
          <header className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-[#3f3f46]/45 bg-black px-3 py-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] sm:rounded-2xl sm:px-4 lg:hidden">
            <BrandMark compact />
          </header>

          <nav className="scrollbar-hidden mb-2 flex shrink-0 gap-1.5 overflow-x-auto rounded-xl border border-[#3f3f46]/45 bg-black p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.24)] sm:mb-3 sm:gap-2 sm:rounded-2xl sm:p-2 lg:hidden">
            {[...translatedNavItems, ...(canViewAccess ? [translatedAccessNavItem] : []), translatedSettingsNavItem].map((item) => (
              <NavButton
                activeView={activeView}
                item={item}
                key={item.view}
                onSelect={selectView}
                unreadCount={totalUnreadMessageCount}
                variant="mobile"
              />
            ))}
          </nav>

          <section
            className="grid min-h-0 flex-1 gap-2 overflow-hidden lg:overflow-visible lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]"
            ref={sidebarGridRef}
            style={sidebarGridStyle}
          >
            <aside className={`relative z-[70] hidden min-h-0 flex-col rounded-2xl border border-[#3f3f46]/45 bg-black p-3 shadow-[0_14px_45px_rgba(0,0,0,0.28)] lg:flex ${
              isSidebarIconMode ? "items-center" : ""
            }`}>
              <div className={`flex h-10 w-full items-center ${isSidebarIconMode ? "mb-4 justify-center" : "mb-5 gap-3"}`}>
                <BrandMark iconOnly={isSidebarIconMode} />
              </div>

              {isSidebarIconMode ? (
                <div className="relative mb-4 h-10 w-full">
                  <button
                    aria-expanded={isCollapsedSearchVisible}
                    aria-label="Открыть поиск"
                    className="mx-auto grid h-10 min-h-10 w-10 place-items-center rounded-xl text-[#f4f4f5] opacity-80 transition hover:bg-white/10 hover:opacity-100"
                    onClick={() => setIsCollapsedSearchOpen((isOpen) => !isOpen)}
                    ref={collapsedSearchButtonRef}
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="m21 21-4.34-4.34"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                      <circle
                        cx="11"
                        cy="11"
                        r="8"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </button>
                  {isCollapsedSearchVisible ? (
                    <div
                      className="hush-modal-transition absolute left-[calc(100%+10px)] top-0 z-50 w-[min(300px,calc(100vw-104px))] rounded-xl border border-[#3f3f46]/50 bg-[#111111]/96 p-2 shadow-[0_18px_56px_rgba(0,0,0,0.52)] backdrop-blur-xl"
                      ref={collapsedSearchPopoverRef}
                    >
                        <label className="flex h-9 min-h-9 items-center rounded-lg bg-[#f4f4f5]/10 px-3 text-[#a1a1aa] transition focus-within:bg-[#f4f4f5]/14 focus-within:text-[#f4f4f5]">
                          <input
                            aria-label="User search by username"
                            autoFocus
                            className="h-5 min-w-0 flex-1 bg-transparent text-sm leading-5 text-[#f4f4f5] outline-none placeholder:text-[#a1a1aa]/75"
                            onChange={(event) => setChatSearchQuery(event.target.value)}
                            placeholder={t("searchPlaceholder")}
                            type="text"
                            value={chatSearchQuery}
                          />
                        </label>
                        {chatSearchQuery.trim().length > 0 ? (
                          <div className="mt-2 grid max-h-64 gap-1 overflow-y-auto pr-1">
                            <SearchResultList
                              query={chatSearchQuery}
                              searchableProfiles={searchableProfiles}
                              onSelectProfile={(profile) => {
                                setViewedProfile({
                                  avatarUrl: profile.avatar_url,
                                  bio: profile.bio,
                                  name: profile.display_name,
                                  username: profile.username,
                                  updatedAt: profile.updated_at,
                                  userId: profile.user_id,
                                });
                                setChatSearchQuery("");
                                setIsCollapsedSearchOpen(false);
                              }}
                              t={t}
                              itemClassName="flex min-h-9 items-center gap-2 rounded-lg px-2 py-1 text-left transition hover:bg-[#f4f4f5]/10"
                              keyPrefix="collapsed-search-"
                            />
                          </div>
                        ) : (
                          <p className="px-2 py-1.5 text-xs leading-5 text-[#a1a1aa]">
                            {t("searchUserByUsername")}
                          </p>
                        )}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className={`mb-3 w-full ${isSidebarIconMode ? "hidden" : ""}`}>
                <label className="flex h-9 min-h-9 items-center gap-2 rounded-lg bg-[#f4f4f5]/10 px-3 text-[#a1a1aa] transition focus-within:bg-[#f4f4f5]/14 focus-within:text-[#f4f4f5]">
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 self-center"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="m21 21-4.34-4.34"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                    <circle
                      cx="11"
                      cy="11"
                      r="8"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  <input
                    aria-label="User search by username"
                    className="h-5 min-w-0 flex-1 bg-transparent text-sm leading-5 text-[#f4f4f5] outline-none placeholder:text-[#a1a1aa]/75"
                    onChange={(event) => setChatSearchQuery(event.target.value)}
                    placeholder={t("searchPlaceholder")}
                    type="text"
                    value={chatSearchQuery}
                  />
                </label>
                {chatSearchQuery.trim().length > 0 ? (
                  <div className="mt-2 grid max-h-64 gap-1.5 overflow-y-auto pr-1">
                    <SearchResultList
                      query={chatSearchQuery}
                      searchableProfiles={searchableProfiles}
                      onSelectProfile={(profile) => {
                        setViewedProfile({
                          avatarUrl: profile.avatar_url,
                          bio: profile.bio,
                          name: profile.display_name,
                          username: profile.username,
                          updatedAt: profile.updated_at,
                          userId: profile.user_id,
                        });
                        setChatSearchQuery("");
                      }}
                      t={t}
                      itemClassName="flex items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-[#f4f4f5]/10"
                      keyPrefix="search-"
                    />
                  </div>
                ) : null}
              </div>

              <div className={`w-full ${isSidebarIconMode ? "h-0 overflow-hidden" : "mb-3 h-5"}`}>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#e5e5e5]">
                  Меню
                </p>
              </div>

              <nav className={`grid w-full gap-1.5 ${isSidebarIconMode ? "justify-items-center" : ""}`}>
                {translatedNavItems.map((item) => (
                  <NavButton
                    activeView={activeView}
                    iconOnly={isSidebarIconMode}
                    item={item}
                    key={item.view}
                    onSelect={selectView}
                    unreadCount={totalUnreadMessageCount}
                  />
                ))}
              </nav>
              <div className={`mt-auto grid w-full gap-1.5 ${isSidebarIconMode ? "justify-items-center" : ""}`}>
                {canViewAccess ? (
                  <NavButton
                    activeView={activeView}
                    iconOnly={isSidebarIconMode}
                    item={translatedAccessNavItem}
                    onSelect={selectView}
                  />
                ) : null}
                <button
                  aria-label={isSidebarIconMode ? translatedSettingsNavItem.label : undefined}
                  title={isSidebarIconMode ? translatedSettingsNavItem.label : undefined}
                  className={`hush-nav-button border ${isSidebarIconMode ? "mx-auto grid h-9 min-h-9 w-9 place-items-center px-0 py-0" : "flex h-9 min-h-9 items-center px-3.5 py-0 text-left"} rounded-xl text-sm font-medium leading-normal transition ${
                    activeView === translatedSettingsNavItem.view
                      ? "border-transparent bg-[#f4f4f5] text-[#050505]"
                      : "border-[#3f3f46]/25 text-[#f4f4f5] opacity-80 hover:bg-white/10 hover:opacity-100"
                  }`}
                  onClick={() => setActiveView(translatedSettingsNavItem.view)}
                  type="button"
                >
                  <span className="inline-flex min-w-0 items-center gap-2.5">
                    <NavIcon view={translatedSettingsNavItem.view} />
                    {isSidebarIconMode ? null : <span className="truncate">{translatedSettingsNavItem.label}</span>}
                  </span>
                </button>
              </div>
              <div
                aria-label="Изменить ширину панели"
                aria-orientation="vertical"
                className="hush-sidebar-resize-handle group absolute -right-1.5 top-1/2 hidden h-28 w-3 -translate-y-1/2 cursor-col-resize touch-none rounded-full text-transparent transition lg:grid lg:place-items-center"
                onPointerDown={startSidebarResize}
                role="separator"
              >
                <span className="h-12 w-0.5 rounded-full bg-[#f4f4f5]/18 transition group-hover:bg-[#f4f4f5]/45" />
              </div>
            </aside>

            <div className="hush-view-transition">
              {children}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
