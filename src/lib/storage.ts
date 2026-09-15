import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a public URL for an item media file stored in the specified bucket (default: 'item-media').
 */
export function getMediaUrl(storagePath?: string | null, bucket = "item-media"): string {
  if (!storagePath) return "/placeholder.svg";
  if (
    storagePath.startsWith("http://") ||
    storagePath.startsWith("https://") ||
    storagePath.startsWith("data:") ||
    storagePath.startsWith("blob:")
  ) {
    return storagePath;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Returns a public URL for an avatar image stored in the 'avatars' bucket.
 */
export function getAvatarUrl(storagePath?: string | null): string {
  if (!storagePath) return "";
  if (
    storagePath.startsWith("http://") ||
    storagePath.startsWith("https://") ||
    storagePath.startsWith("data:") ||
    storagePath.startsWith("blob:")
  ) {
    return storagePath;
  }
  const { data } = supabase.storage.from("avatars").getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Compresses an image file or blob client-side using an HTML canvas,
 * targeting under targetSizeKB (default 500KB).
 */
export async function compressImage(file: File | Blob, targetSizeKB = 500): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const maxDim = 1600;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      const attemptCompression = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            if (blob.size <= targetSizeKB * 1024 || quality <= 0.35) {
              resolve(blob);
            } else {
              quality -= 0.15;
              attemptCompression();
            }
          },
          "image/jpeg",
          quality
        );
      };
      attemptCompression();
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fallback to original on error
    };

    img.src = objectUrl;
  });
}
