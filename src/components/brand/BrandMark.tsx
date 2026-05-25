export function BrandMark({
  compact = false,
  iconOnly = false,
}: {
  compact?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <div className={`flex min-w-0 items-center ${iconOnly ? "justify-center" : "gap-3"}`}>
      <div className={`grid shrink-0 place-items-center rounded-xl bg-[#f4f4f5] text-[#050505] shadow-[0_8px_24px_rgba(244,244,245,0.14)] ${
        compact ? "h-9 w-9 sm:h-10 sm:w-10" : "h-10 w-10"
      }`}>
        <HushGlyph className={compact ? "h-6 w-6 sm:h-7 sm:w-7" : "h-7 w-7"} />
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
        d="M17 15.5C17 13.57 18.57 12 20.5 12H27C28.93 12 30.5 13.57 30.5 15.5V24.5C30.5 26.01 29.92 27.46 28.88 28.56L25.62 32L28.88 35.44C29.92 36.54 30.5 37.99 30.5 39.5V48.5C30.5 50.43 28.93 52 27 52H20.5C18.57 52 17 50.43 17 48.5V15.5Z"
        fill="currentColor"
      />
      <path
        d="M47 15.5C47 13.57 45.43 12 43.5 12H37C35.07 12 33.5 13.57 33.5 15.5V24.5C33.5 26.01 34.08 27.46 35.12 28.56L38.38 32L35.12 35.44C34.08 36.54 33.5 37.99 33.5 39.5V48.5C33.5 50.43 35.07 52 37 52H43.5C45.43 52 47 50.43 47 48.5V15.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
