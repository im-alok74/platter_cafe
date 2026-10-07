"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState, type ComponentType } from "react";
import type { Area, CropperProps } from "react-easy-crop";
import { btn } from "./ui";

// next/dynamic drops the library's default props from the types, so every prop is made optional here.
const Cropper = dynamic(() => import("react-easy-crop"), { ssr: false }) as unknown as ComponentType<Partial<CropperProps>>;

/** Phone photos are big; they are shrunk in the browser before upload, so the limit here is generous. */
const MAX_BYTES = 25 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];
/** Longest side of the saved photo. Cloudinary then serves smaller copies to each phone (f_auto, q_auto). */
const MAX_SIDE = 2000;
const JPEG_QUALITY = 0.92;

export type Uploaded = { public_id: string; version: number; width: number; height: number };
type Tone = { brightness: number; contrast: number; saturation: number };
const NEUTRAL: Tone = { brightness: 100, contrast: 100, saturation: 100 };
const cssFilter = (t: Tone) => `brightness(${t.brightness}%) contrast(${t.contrast}%) saturate(${t.saturation}%)`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    // Photos already on Cloudinary are re-edited from the original; Cloudinary allows this cross-origin read.
    if (!src.startsWith("blob:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that photo."));
    img.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process the photo."))), "image/jpeg", JPEG_QUALITY));
}

/** Cuts out the chosen area, applies the colour adjustments, and exports a high-quality JPEG (never enlarged). */
async function cropToBlob(src: string, area: Area, tone: Tone): Promise<Blob> {
  const img = await loadImage(src);
  const scale = Math.min(1, MAX_SIDE / Math.max(area.width, area.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width * scale);
  canvas.height = Math.round(area.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.filter = cssFilter(tone);
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return toBlob(canvas);
}

/** Turns the photo a quarter turn, as a new picture, so cropping and zoom keep working on the rotated one. */
async function rotated(src: string, dir: 1 | -1): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalHeight;
  canvas.height = img.naturalWidth;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((dir * Math.PI) / 2);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return URL.createObjectURL(await toBlob(canvas));
}

const ASPECTS: [string, number][] = [["Square", 1], ["4:3", 4 / 3], ["3:4", 3 / 4]];

/** Pick or take a photo (or re-edit the current one), crop, rotate and adjust it, then save it straight to Cloudinary with a server-signed request. */
export function ImageUploader({ kind, aspect, current, onUploaded, onRemove }: {
  kind: "menu" | "banner" | "category" | "popup" | "gallery" | "blog";
  aspect: number;
  current: { url: string; blur: string | null } | null;
  onUploaded: (u: Uploaded) => Promise<{ error?: string }>;
  onRemove?: () => Promise<void>;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [shape, setShape] = useState(aspect);
  const [tone, setTone] = useState<Tone>(NEUTRAL);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);

  function open(url: string) {
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setTone(NEUTRAL);
    setShape(aspect);
    setArea(null);
    setSrc(url);
  }

  function close() {
    if (src?.startsWith("blob:")) URL.revokeObjectURL(src);
    setSrc(null);
  }

  function choose(file?: File) {
    setError("");
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError("Use a JPG, PNG or WebP photo.");
    if (file.size > MAX_BYTES) return setError("That photo is over 25 MB. Choose a smaller one.");
    open(URL.createObjectURL(file));
  }

  async function turn(dir: 1 | -1) {
    if (!src) return;
    setError("");
    try {
      const next = await rotated(src, dir);
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
      setSrc(next);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not rotate the photo.");
    }
  }

  async function upload() {
    if (!src || !area) return;
    setBusy(true);
    setError("");
    try {
      const blob = await cropToBlob(src, area, tone);
      const signRes = await fetch("/api/uploads/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) });
      const sig = await signRes.json();
      if (!signRes.ok) throw new Error(sig.error ?? "Uploads are not available.");
      const body = new FormData();
      body.set("file", blob);
      for (const k of ["api_key", "timestamp", "signature", "folder", "allowed_formats"]) body.set(k, String(sig[k]));
      const up = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`, { method: "POST", body });
      const out = await up.json();
      if (!up.ok) throw new Error(out.error?.message ?? "Upload failed.");
      const res = await onUploaded({ public_id: out.public_id, version: out.version, width: out.width, height: out.height });
      if (res.error) throw new Error(res.error);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const slider = (label: string, key: keyof Tone) => (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0">{label}</span>
      <input type="range" min={50} max={150} step={1} value={tone[key]} onChange={(e) => setTone((t) => ({ ...t, [key]: Number(e.target.value) }))} className="flex-1" />
      <span className="w-10 text-right tabular-nums text-muted">{tone[key] - 100 > 0 ? "+" : ""}{tone[key] - 100}</span>
    </label>
  );

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-border">
          {current ? <Image src={current.url} alt="Current photo" fill sizes="96px" placeholder={current.blur ? "blur" : "empty"} blurDataURL={current.blur ?? undefined} className="object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-muted">No photo</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn.ghost} onClick={() => pick.current?.click()}>{current ? "Replace photo" : "Choose photo"}</button>
          <button type="button" className={btn.ghost} onClick={() => camera.current?.click()}>Take photo</button>
          {current && <button type="button" className={btn.ghost} onClick={() => open(current.url)}>Edit this photo</button>}
          {current && onRemove && <button type="button" className={btn.danger} onClick={() => onRemove()}>Remove</button>}
        </div>
      </div>
      <input ref={pick} type="file" accept={TYPES.join(",")} hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
      {error && !src && <p role="alert" className="mt-2 text-sm text-nonveg">{error}</p>}

      {src && (
        <div role="dialog" aria-modal="true" aria-label="Edit photo" className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="relative min-h-0 flex-1">
            <Cropper image={src} crop={crop} zoom={zoom} aspect={shape} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} style={{ mediaStyle: { filter: cssFilter(tone) } }} />
          </div>
          <div className="max-h-[52vh] space-y-3 overflow-y-auto bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-medium">Shape</span>
              {ASPECTS.map(([label, v]) => (
                <button key={label} type="button" aria-pressed={shape === v} onClick={() => setShape(v)} className={`min-h-11 rounded-full border px-4 text-sm font-medium ${shape === v ? "border-espresso bg-espresso text-[#fbf6ef]" : "border-border bg-surface"}`}>{label}</button>
              ))}
              <span className="ml-auto flex gap-2">
                <button type="button" aria-label="Rotate left" onClick={() => turn(-1)} className={`${btn.ghost} !px-4`}>⟲</button>
                <button type="button" aria-label="Rotate right" onClick={() => turn(1)} className={`${btn.ghost} !px-4`}>⟳</button>
              </span>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0">Zoom</span>
              <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
            </label>
            {slider("Brightness", "brightness")}
            {slider("Contrast", "contrast")}
            {slider("Colour", "saturation")}
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Saved sharp, up to {MAX_SIDE} px. Phones get a smaller copy automatically.</span>
              <button type="button" className="min-h-11 px-2 font-medium text-brand" onClick={() => setTone(NEUTRAL)}>Reset colours</button>
            </div>
            {error && <p role="alert" className="text-sm text-nonveg">{error}</p>}
            <div className="flex gap-3">
              <button type="button" className={`${btn.ghost} flex-1`} onClick={close} disabled={busy}>Cancel</button>
              <button type="button" className={`${btn.primary} flex-1`} onClick={upload} disabled={busy || !area}>{busy ? "Saving…" : "Save photo"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
