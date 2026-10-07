// Global next/image loader: Cloudinary resizes and picks the best format (f_auto, q_auto).
export default function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  return src.replace("/upload/", `/upload/f_auto,q_${quality ?? "auto"},w_${width},c_limit/`);
}
