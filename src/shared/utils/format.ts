export function formatMessageTime(createdAt: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

export function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) {
    return "Р¤Р°Р№Р»";
  }

  const units = ["Р‘", "РљР‘", "РњР‘", "Р“Р‘"];
  let fileSize = size;
  let unitIndex = 0;

  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex += 1;
  }

  return `${fileSize >= 10 || unitIndex === 0 ? Math.round(fileSize) : fileSize.toFixed(1)} ${units[unitIndex]}`;
}

export function formatAudioTime(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

export function formatCallDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}
