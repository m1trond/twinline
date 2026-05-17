import type { Dispatch, PointerEvent, SetStateAction } from "react";
import type { CallStatus } from "@/shared/types";
import { formatCallDuration } from "@/shared/utils/format";

type CallPanelProfile = {
  avatarUrl: string | null;
  name: string;
};

type CallPanelProps = {
  acceptCall: () => void | Promise<void>;
  callDuration: number;
  callPanelPosition: { left: number; top: number };
  callPanelProfile: CallPanelProfile;
  callStatus: CallStatus;
  callStatusText: string;
  closeCall: (notifyPartner: boolean) => void | Promise<void>;
  dragCallPanel: (event: PointerEvent<HTMLElement>) => void;
  isCallMicMuted: boolean;
  isCallPanelCollapsed: boolean;
  setIsCallPanelCollapsed: Dispatch<SetStateAction<boolean>>;
  startCallPanelDrag: (event: PointerEvent<HTMLElement>) => void;
  stopCallPanelDrag: (event: PointerEvent<HTMLElement>) => void;
  toggleCallMicrophone: () => void;
};

export function CallPanel({
  acceptCall,
  callDuration,
  callPanelPosition,
  callPanelProfile,
  callStatus,
  callStatusText,
  closeCall,
  dragCallPanel,
  isCallMicMuted,
  isCallPanelCollapsed,
  setIsCallPanelCollapsed,
  startCallPanelDrag,
  stopCallPanelDrag,
  toggleCallMicrophone,
}: CallPanelProps) {
  if (callStatus === "idle") {
    return null;
  }

  const statusText =
    callStatus === "connected"
      ? formatCallDuration(callDuration)
      : callStatusText || "00:00";

  return (
    <aside
      className={`fixed z-[60] cursor-move touch-none rounded-3xl border border-[#3f3f46]/70 bg-[#111111]/96 text-center shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl ${
        isCallPanelCollapsed
          ? "w-[min(286px,calc(100vw-16px))] border-[#3f3f46]/35 bg-[#18181b]/94 p-2.5 shadow-[0_18px_55px_rgba(0,0,0,0.42)]"
          : "w-[min(350px,calc(100vw-16px))] p-3 sm:w-[min(350px,calc(100vw-24px))] sm:p-5"
      }`}
      onPointerDown={startCallPanelDrag}
      onPointerMove={dragCallPanel}
      onPointerUp={stopCallPanelDrag}
      style={{
        left: callPanelPosition.left,
        top: callPanelPosition.top,
      }}
    >
      <button
        aria-label={isCallPanelCollapsed ? "Развернуть звонок" : "Свернуть звонок"}
        className={`absolute grid cursor-pointer place-items-center rounded-full text-[#f4f4f5] transition ${
          isCallPanelCollapsed
            ? "right-12 top-1/2 h-9 w-9 -translate-y-1/2 bg-white/[0.06] text-[#a1a1aa] hover:bg-white/12 hover:text-[#f4f4f5]"
            : "right-3 top-3 h-8 w-8 bg-white/[0.06] hover:bg-white/12"
        }`}
        onClick={(event) => {
          event.stopPropagation();
          setIsCallPanelCollapsed((isCollapsed) => !isCollapsed);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          {isCallPanelCollapsed ? (
            <>
              <path
                d="M8 3H5a2 2 0 0 0-2 2v3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M21 8V5a2 2 0 0 0-2-2h-3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M3 16v3a2 2 0 0 0 2 2h3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
              <path
                d="M16 21h3a2 2 0 0 0 2-2v-3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </>
          ) : (
            <path d="M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          )}
        </svg>
      </button>

      {isCallPanelCollapsed ? (
        <div className="flex items-center gap-3 pr-[84px] text-left">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e5e5e5] text-base font-medium text-[#111111] shadow-[0_8px_22px_rgba(0,0,0,0.32)] ring-2 ring-[#f4f4f5]/25">
            {callPanelProfile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Аватар звонка"
                className="h-full w-full object-cover"
                draggable={false}
                src={callPanelProfile.avatarUrl}
              />
            ) : (
              callPanelProfile.name[0]?.toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1 select-none rounded-2xl py-1 text-left">
            <p className="truncate text-sm font-medium text-[#f4f4f5]">
              {callPanelProfile.name}
            </p>
            <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-medium text-[#a1a1aa]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f4f4f5] shadow-[0_0_10px_rgba(244,244,245,0.55)]" />
              {statusText}
            </p>
          </div>
          <button
            aria-label="Завершить звонок"
            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-red-500 text-white shadow-[0_10px_24px_rgba(239,68,68,0.32)] transition hover:bg-red-400"
            onClick={() => closeCall(true)}
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
          >
            <PhoneIcon className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <>
          <div className="mx-auto mb-3 grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-[#e5e5e5] text-sm font-medium text-[#111111] sm:mb-4 sm:h-24 sm:w-24 sm:text-base">
            {callPanelProfile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="Аватар звонка"
                className="h-full w-full object-cover"
                draggable={false}
                src={callPanelProfile.avatarUrl}
              />
            ) : (
              callPanelProfile.name[0]?.toUpperCase()
            )}
          </div>

          <p className="truncate text-base font-medium text-[#f4f4f5]">
            {callPanelProfile.name}
          </p>
          <p className="mt-1 text-sm font-medium text-[#a1a1aa]">
            {statusText}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:mt-5 sm:gap-3">
            {callStatus === "incoming" ? (
              <>
                <button
                  className="min-h-11 rounded-xl bg-[#f4f4f5] px-5 text-sm font-medium text-[#050505] transition hover:bg-[#e5e5e5]"
                  onClick={acceptCall}
                  onPointerDown={(event) => event.stopPropagation()}
                  type="button"
                >
                  Принять
                </button>
                <button
                  className="min-h-11 rounded-xl border border-red-400/50 bg-red-500/15 px-5 text-sm font-medium text-red-100 transition hover:bg-red-500/25"
                  onClick={() => closeCall(true)}
                  onPointerDown={(event) => event.stopPropagation()}
                  type="button"
                >
                  Сбросить
                </button>
              </>
            ) : (
              <>
                <button
                  aria-label={isCallMicMuted ? "Включить микрофон" : "Выключить микрофон"}
                  className={`grid h-12 w-12 place-items-center rounded-full border transition ${
                    isCallMicMuted
                      ? "border-red-400/55 bg-red-500/20 text-red-100"
                      : "border-[#3f3f46]/45 bg-[#f4f4f5]/12 text-[#f4f4f5] hover:bg-white/10"
                  }`}
                  onClick={toggleCallMicrophone}
                  onPointerDown={(event) => event.stopPropagation()}
                  type="button"
                >
                  <MicIcon muted={isCallMicMuted} />
                </button>
                <button
                  className="min-h-12 rounded-full bg-red-500 px-5 text-sm font-medium text-white transition hover:bg-red-400"
                  onClick={() => closeCall(true)}
                  onPointerDown={(event) => event.stopPropagation()}
                  type="button"
                >
                  Завершить
                </button>
              </>
            )}
          </div>

          {callStatus !== "incoming" ? (
            <p className="mt-4 text-sm font-medium text-[#a1a1aa]">
              {isCallMicMuted ? "Микрофон выключен" : "Микрофон включен"}
            </p>
          ) : null}
        </>
      )}
    </aside>
  );
}

function PhoneIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MicIcon({ muted }: { muted: boolean }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      {muted ? (
        <>
          <path
            d="M12 19v3"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M15 9.34V5a3 3 0 0 0-5.68-1.33"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M16.95 16.95A7 7 0 0 1 5 12v-2"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M18.89 13.23A7 7 0 0 0 19 12v-2"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="m2 2 20 20"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M9 9v3a3 3 0 0 0 5.12 2.12"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </>
      ) : (
        <>
          <path
            d="M12 19v3"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d="M19 10v2a7 7 0 0 1-14 0v-2"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <rect
            height="13"
            rx="3"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            width="6"
            x="9"
            y="2"
          />
        </>
      )}
    </svg>
  );
}
