/**
 * Thu nhỏ ảnh chụp điện thoại (thường 3–8 MB) trước khi tải lên: cạnh dài tối đa
 * `maxSide` px, JPEG chất lượng `quality`. Trình duyệt không giải mã được (vd HEIC
 * trên Chrome) hoặc ảnh đã nhỏ → trả nguyên file.
 */
export async function compressImage(
  file: File,
  maxSide = 1600,
  quality = 0.85,
): Promise<Blob> {
  if (typeof createImageBitmap !== 'function') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= 1_500_000 && file.type === 'image/jpeg') {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  return blob && blob.size < file.size ? blob : file;
}
