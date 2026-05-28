type AvatarProps = {
  alt: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  name: string;
  onClick?: () => void;
  src?: string | null;
};

export function Avatar({
  alt,
  ariaLabel,
  className = "h-8 w-8 text-xs",
  disabled = false,
  name,
  onClick,
  src,
}: AvatarProps) {
  const content = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} className="h-full w-full object-cover" src={src} />
  ) : (
    name[0]?.toUpperCase()
  );
  const avatarClassName = `hush-avatar grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4f4f5] font-medium text-[#050505] ${className}`;

  if (onClick || ariaLabel) {
    return (
      <button
        aria-label={ariaLabel ?? alt}
        className={`${avatarClassName} transition hover:scale-105 disabled:cursor-default disabled:hover:scale-100`}
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <span className={avatarClassName}>{content}</span>;
}
