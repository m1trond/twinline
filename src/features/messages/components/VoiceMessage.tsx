import { ChangeEvent, useRef, useState } from "react";
import { MessageReceiptIcon } from "@/features/messages/components/MessageReceiptIcon";
import type { MessageReceiptStatus } from "@/features/messages/components/MessageReceiptIcon";
import { formatAudioTime, formatMessageTime } from "@/shared/utils/format";

export function VoiceMessage({
  isMine,
  receiptStatus = null,
  sentAt,
  src,
}: {
  isMine: boolean;
  receiptStatus?: MessageReceiptStatus | null;
  sentAt: string;
  src: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const progress = duration ? Math.min(1, currentTime / duration) : 0;
  const waveBars = [
    12, 18, 10, 24, 32, 22, 30, 16, 26, 20, 34, 28, 14, 24, 18, 30, 22, 16,
    26, 20, 32, 18, 24, 14, 28, 22, 30, 18, 12, 20, 16, 24, 14, 18,
  ];

  function togglePlayback() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  function seekAudio(event: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    const nextTime = Number(event.target.value);

    if (!audio) {
      return;
    }

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <div
      className={`hush-voice-message min-w-[min(300px,70vw)] rounded-xl px-2.5 py-1.5 ${
        isMine ? "bg-[#2f2f2f] text-[#f4f4f5]" : "bg-[#262626] text-[#f4f4f5]"
      }`}
    >
      <audio
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        preload="metadata"
        ref={audioRef}
        src={src}
      />
      <div className="flex items-center gap-2.5">
        <button
          aria-label={isPlaying ? "Пауза" : "Воспроизвести голосовое"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4f4f5] text-[#050505] shadow-[0_10px_24px_rgba(0,0,0,0.22)] transition hover:scale-105"
          onClick={togglePlayback}
          type="button"
        >
          {isPlaying ? (
            <span className="h-3.5 w-2.5 border-x-[3px] border-[#050505]" />
          ) : (
            <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-[#050505]" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="relative h-6">
            <div
              aria-hidden="true"
              className="absolute inset-0 flex items-center gap-[2px] overflow-hidden"
            >
              {waveBars.map((height, index) => {
                const isPlayed = index / waveBars.length <= progress;

                return (
                  <span
                    className={`w-[3px] rounded-full transition-colors ${
                      isPlayed ? "bg-[#f4f4f5]" : "bg-[#f4f4f5]/38"
                    }`}
                    key={`${height}-${index}`}
                    style={{ height: Math.max(8, Math.round(height * 0.72)) }}
                  />
                );
              })}
            </div>
            <input
              aria-label="Позиция голосового сообщения"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              max={duration || 0}
              min="0"
              onChange={seekAudio}
              step="0.1"
              type="range"
              value={currentTime}
            />
          </div>
          <p className="mt-0 flex items-center justify-between gap-3 text-xs font-medium leading-4 tabular-nums opacity-65">
            <span>{formatAudioTime(currentTime || duration)}</span>
            <span className="inline-flex items-center gap-1">
              {formatMessageTime(sentAt)}
              {receiptStatus ? (
                <MessageReceiptIcon className="h-4 w-4" status={receiptStatus} />
              ) : null}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
