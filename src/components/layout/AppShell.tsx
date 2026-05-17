import type { Dispatch, ReactNode, SetStateAction } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { NavButton, NavIcon } from "@/components/navigation/NavButton";
import { navItems, settingsNavItem } from "@/shared/constants";
import type { ActiveView, ProfileRow } from "@/shared/types";
import type { ViewedProfileState } from "@/features/navigation/useNavigationState";

type AppShellProps = {
  activeView: ActiveView;
  chatSearchQuery: string;
  children: ReactNode;
  isLightThemeEnabled: boolean;
  searchableProfiles: ProfileRow[];
  setActiveView: Dispatch<SetStateAction<ActiveView>>;
  setChatSearchQuery: Dispatch<SetStateAction<string>>;
  setSelectedChatUserId: Dispatch<SetStateAction<string | null>>;
  setUnreadMessageCount: Dispatch<SetStateAction<number>>;
  setViewedProfile: Dispatch<SetStateAction<ViewedProfileState | null>>;
  totalUnreadMessageCount: number;
};

export function AppShell({
  activeView,
  chatSearchQuery,
  children,
  isLightThemeEnabled,
  searchableProfiles,
  setActiveView,
  setChatSearchQuery,
  setSelectedChatUserId,
  setUnreadMessageCount,
  setViewedProfile,
  totalUnreadMessageCount,
}: AppShellProps) {
  function selectView(view: ActiveView) {
    setActiveView(view);

    if (view === "messages") {
      setSelectedChatUserId(null);
    }
  }

  return (
    <main className={`hush-shell ${isLightThemeEnabled ? "hush-light" : ""} relative h-dvh overflow-hidden bg-[#050505] text-[#f4f4f5]`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(244,244,245,0.10),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(245,245,245,0.06),transparent_28%),linear-gradient(135deg,#050505_0%,#111111_46%,#000000_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(245,245,245,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(245,245,245,0.35)_1px,transparent_1px)] [background-size:44px_44px]"
      />
      <div className="relative h-full overflow-hidden bg-[#0a0a0a]/35">
        <div className="safe-bottom flex h-full w-full flex-col overflow-hidden px-1.5 py-1.5 sm:px-3 sm:py-3 lg:px-4 xl:px-5">
          <header className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-xl border border-[#3f3f46]/45 bg-[#111111]/82 px-3 py-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4 lg:hidden">
            <BrandMark compact />
          </header>

          <nav className="scrollbar-hidden mb-2 flex shrink-0 gap-1.5 overflow-x-auto rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 p-1.5 shadow-[0_14px_45px_rgba(0,0,0,0.24)] backdrop-blur-md sm:mb-3 sm:gap-2 sm:rounded-2xl sm:p-2 lg:hidden">
            {[...navItems, settingsNavItem].map((item) => (
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

          <section className="grid min-h-0 flex-1 gap-2 overflow-hidden lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)]">
            <aside className="hidden min-h-0 flex-col rounded-2xl border border-[#3f3f46]/45 bg-[#111111]/78 p-3 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md lg:flex">
              <div className="mb-5 flex items-center gap-3">
                <BrandMark />
              </div>

              <div className="mb-4">
                <label className="flex min-h-10 items-center gap-2 rounded-lg bg-[#f4f4f5]/10 px-3 text-[#a1a1aa] transition focus-within:bg-[#f4f4f5]/14 focus-within:text-[#f4f4f5]">
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
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
                    className="min-w-0 flex-1 bg-transparent text-sm text-[#f4f4f5] outline-none placeholder:text-[#a1a1aa]/75"
                    onChange={(event) => setChatSearchQuery(event.target.value)}
                    placeholder="Найти..."
                    type="text"
                    value={chatSearchQuery}
                  />
                </label>
                {chatSearchQuery.trim().length > 0 ? (
                  <div className="mt-2 grid max-h-64 gap-1.5 overflow-y-auto pr-1">
                    {chatSearchQuery.trim().replace(/^@+/, "").length < 2 ? (
                      <p className="px-2 py-1 text-xs text-[#a1a1aa]">
                        Введи минимум 2 символа после @.
                      </p>
                    ) : searchableProfiles.length === 0 ? (
                      <p className="px-2 py-1 text-xs text-[#a1a1aa]">
                        Пользователь не найден.
                      </p>
                    ) : (
                      searchableProfiles.map((profile) => (
                        <button
                          className="flex items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-[#f4f4f5]/10"
                          key={"search-" + profile.user_id}
                          onClick={() => {
                            setViewedProfile({
                              avatarUrl: profile.avatar_url,
                              name: profile.display_name,
                              username: profile.username,
                              updatedAt: profile.updated_at,
                              userId: profile.user_id,
                            });
                            setChatSearchQuery("");
                            setUnreadMessageCount(0);
                          }}
                          type="button"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4f4f5] text-xs font-medium text-[#050505]">
                            {profile.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                alt={"Avatar " + profile.display_name}
                                className="h-full w-full object-cover"
                                src={profile.avatar_url}
                              />
                            ) : (
                              profile.display_name[0]?.toUpperCase()
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-[#f4f4f5]">
                              {profile.display_name}
                            </span>
                            <span className="block truncate text-xs text-[#a1a1aa]">
                              {profile.username ? "@" + profile.username : "@ник пока не выбран"}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#e5e5e5]">
                  Меню
                </p>
              </div>

              <nav className="grid gap-2">
                {navItems.map((item) => (
                  <NavButton
                    activeView={activeView}
                    item={item}
                    key={item.view}
                    onSelect={selectView}
                    unreadCount={totalUnreadMessageCount}
                  />
                ))}
              </nav>
              <button
                className={`mt-auto flex min-h-10 items-center rounded-xl px-4 py-2.5 text-left text-sm font-medium leading-none transition ${
                  activeView === settingsNavItem.view
                    ? "bg-[#f4f4f5] text-[#050505]"
                    : "border border-[#3f3f46]/25 text-[#f4f4f5] opacity-80 hover:bg-white/10 hover:opacity-100"
                }`}
                onClick={() => setActiveView(settingsNavItem.view)}
                type="button"
              >
                <span className="inline-flex min-w-0 items-center gap-2.5">
                  <NavIcon view={settingsNavItem.view} />
                  <span className="truncate">{settingsNavItem.label}</span>
                </span>
              </button>
            </aside>

            <div className="hush-view-transition min-h-0 overflow-hidden" key={activeView}>
              {children}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
