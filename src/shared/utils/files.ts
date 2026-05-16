export function getSafeFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");

  return extension || "bin";
}

export function getAttachmentFolder(file: File) {
  if (file.type.startsWith("image/")) {
    return "images";
  }

  if (file.type.startsWith("video/")) {
    return "videos";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  return "files";
}
