import type { ActiveView } from "@/shared/types";

export function NavButton({
  activeView,
  item,
  onSelect,
  unreadCount = 0,
  variant = "sidebar",
}: {
  activeView: ActiveView;
  item: { label: string; view: ActiveView };
  onSelect: (view: ActiveView) => void;
  unreadCount?: number;
  variant?: "mobile" | "sidebar";
}) {
  const isActive = activeView === item.view;
  const isMobile = variant === "mobile";

  return (
    <button
      className={`${isMobile ? "shrink-0 rounded-lg px-3 py-2 sm:rounded-xl sm:px-4 sm:py-2.5" : "rounded-xl px-4 py-2.5 text-left"} text-[13px] font-medium transition ${
        isActive
          ? "bg-[#f4f4f5] text-[#050505]"
          : `${isMobile ? "" : "border border-transparent"} text-[#f4f4f5] opacity-80 hover:bg-white/10 hover:opacity-100`
      }`}
      onClick={() => onSelect(item.view)}
      type="button"
    >
      <span className={`${isMobile ? "inline-flex" : "flex"} items-center justify-between gap-3`}>
        <span>{item.label}</span>
        {item.view === "messages" && unreadCount > 0 ? (
          <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-medium ${
            isActive ? "bg-[#050505] text-[#f4f4f5]" : "bg-[#f4f4f5] text-[#050505]"
          }`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </span>
    </button>
  );
}
