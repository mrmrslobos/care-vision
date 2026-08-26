/**
 * Resize/compress images before API upload (Vercel ~4.5MB body limit) and localStorage.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1280,
  quality = 0.82
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Not an image file");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not process image");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const mimeType =
    file.type === "image/png" || file.type === "image/webp"
      ? file.type
      : "image/jpeg";

  return canvas.toDataURL(mimeType, quality);
}
