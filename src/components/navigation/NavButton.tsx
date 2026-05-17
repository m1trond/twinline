import type { ActiveView } from "@/shared/types";

export function NavIcon({ view }: { view: ActiveView }) {
  const iconClassName = "h-5 w-5 shrink-0";

  if (view === "profile") {
    return (
      <svg
        aria-hidden="true"
        className={iconClassName}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="8" r="5" stroke="currentColor" strokeWidth="2" />
        <path
          d="M20 21a8 8 0 0 0-16 0"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (view === "messages") {
    return (
      <svg
        aria-hidden="true"
        className={iconClassName}
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (view === "favorites") {
    return (
      <svg
        aria-hidden="true"
        className={iconClassName}
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={iconClassName}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function NavButton({
  activeView,
  iconOnly = false,
  item,
  onSelect,
  unreadCount = 0,
  variant = "sidebar",
}: {
  activeView: ActiveView;
  iconOnly?: boolean;
  item: { label: string; view: ActiveView };
  onSelect: (view: ActiveView) => void;
  unreadCount?: number;
  variant?: "mobile" | "sidebar";
}) {
  const isActive = activeView === item.view;
  const isMobile = variant === "mobile";

  return (
    <button
      aria-label={iconOnly ? item.label : undefined}
      title={iconOnly ? item.label : undefined}
      className={`${iconOnly ? "relative grid min-h-10 w-full place-items-center rounded-xl px-0 py-0" : isMobile ? "shrink-0 rounded-lg px-3 py-2 sm:rounded-xl sm:px-4 sm:py-2.5" : "rounded-xl px-4 py-2.5 text-left"} text-sm font-medium transition ${
        isActive
          ? "bg-[#f4f4f5] text-[#050505]"
          : `${isMobile || iconOnly ? "" : "border border-transparent"} text-[#f4f4f5] opacity-80 hover:bg-white/10 hover:opacity-100`
      }`}
      onClick={() => onSelect(item.view)}
      type="button"
    >
      <span className={`${iconOnly ? "grid place-items-center" : isMobile ? "inline-flex" : "flex"} items-center justify-between gap-3`}>
        <span className="inline-flex min-w-0 items-center gap-2.5">
          <NavIcon view={item.view} />
          {iconOnly ? null : <span className="truncate">{item.label}</span>}
        </span>
        {item.view === "messages" && unreadCount > 0 ? (
          <span className={`${iconOnly ? "absolute right-1 top-1" : ""} grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-medium ${
            isActive ? "bg-[#050505] text-[#f4f4f5]" : "bg-[#f4f4f5] text-[#050505]"
          }`}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </span>
    </button>
  );
}
