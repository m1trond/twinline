export function BrandMark({
  compact = false,
  iconOnly = false,
}: {
  compact?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <div className={`flex min-w-0 items-center ${iconOnly ? "justify-center" : "gap-3"}`}>
      <div className={`grid shrink-0 place-items-center rounded-[14px] border border-[#f4f4f5]/12 bg-[#f4f4f5] text-[#050505] shadow-[0_10px_28px_rgba(244,244,245,0.16)] ${
        compact ? "h-10 w-10 sm:h-11 sm:w-11" : "h-11 w-11"
      }`}>
        <HushGlyph className={compact ? "h-8 w-8 sm:h-9 sm:w-9" : "h-9 w-9"} />
      </div>
      {iconOnly ? null : (
        <h1 className={`${compact ? "text-base sm:text-base" : "text-base"} min-w-0 font-medium tracking-normal`}>
          Hush
        </h1>
      )}
    </div>
  );
}

function HushGlyph({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 64 64"
    >
      <path
        d="M14 17.5C14 14.46 16.46 12 19.5 12H24.4C27.1 12 29.42 13.95 29.88 16.61L31.45 25.68C31.64 26.79 32.36 26.79 32.55 25.68L34.12 16.61C34.58 13.95 36.9 12 39.6 12H44.5C47.54 12 50 14.46 50 17.5V46.5C50 49.54 47.54 52 44.5 52H39.6C36.9 52 34.58 50.05 34.12 47.39L32.55 38.32C32.36 37.21 31.64 37.21 31.45 38.32L29.88 47.39C29.42 50.05 27.1 52 24.4 52H19.5C16.46 52 14 49.54 14 46.5V17.5Z"
        fill="currentColor"
      />
      <path
        d="M23.5 19.5C23.5 18.67 24.17 18 25 18C25.83 18 26.5 18.67 26.5 19.5V44.5C26.5 45.33 25.83 46 25 46C24.17 46 23.5 45.33 23.5 44.5V19.5Z"
        fill="#F4F4F5"
      />
      <path
        d="M37.5 19.5C37.5 18.67 38.17 18 39 18C39.83 18 40.5 18.67 40.5 19.5V44.5C40.5 45.33 39.83 46 39 46C38.17 46 37.5 45.33 37.5 44.5V19.5Z"
        fill="#F4F4F5"
      />
      <path
        d="M26.5 32H37.5"
        stroke="#F4F4F5"
        strokeLinecap="round"
        strokeWidth="5"
      />
    </svg>
  );
}
