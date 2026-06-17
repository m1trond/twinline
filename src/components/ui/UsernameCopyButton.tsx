type UsernameCopyButtonProps = {
  className?: string;
  fallback: string;
  username: string | null | undefined;
};

async function copyText(text: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function UsernameCopyButton({
  className = "",
  fallback,
  username,
}: UsernameCopyButtonProps) {
  if (!username) {
    return <span className={className}>{fallback}</span>;
  }

  const usernameWithAt = `@${username}`;

  return (
    <button
      className={`inline-block max-w-full cursor-pointer truncate text-left underline-offset-4 transition hover:underline ${className}`}
      onClick={() => void copyText(usernameWithAt)}
      title={usernameWithAt}
      type="button"
    >
      {usernameWithAt}
    </button>
  );
}
