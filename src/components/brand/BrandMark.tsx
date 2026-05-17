import Image from "next/image";

export function BrandMark({
  compact = false,
  iconOnly = false,
}: {
  compact?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <div className={`flex min-w-0 items-center ${iconOnly ? "justify-center" : "gap-3"}`}>
      <div className={`grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-[0_8px_24px_rgba(244,244,245,0.16)] ${
        compact ? "h-9 w-9 sm:h-10 sm:w-10" : "h-10 w-10"
      }`}>
        <Image
          alt="Hush"
          className="h-full w-full object-cover"
          height={40}
          src="/hush-logo.png"
          width={40}
        />
      </div>
      {iconOnly ? null : (
        <h1 className={`${compact ? "text-base sm:text-base" : "text-base"} min-w-0 font-medium tracking-normal`}>
          Hush
        </h1>
      )}
    </div>
  );
}
