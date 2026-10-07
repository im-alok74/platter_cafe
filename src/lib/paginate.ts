/** `?page=` from the address bar to a safe page number and the inclusive row range for Supabase's `.range()`. */
export function pageOf(raw: string | undefined, size: number) {
  const page = Math.min(10_000, Math.max(1, Math.floor(Number(raw)) || 1));
  return { page, from: (page - 1) * size, to: page * size - 1 };
}

export const pageCount = (total: number, size: number) => Math.max(1, Math.ceil(total / size));
