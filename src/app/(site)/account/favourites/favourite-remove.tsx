"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function FavouriteRemove({ itemId, userId, name }: { itemId: string; userId: string; name: string }) {
  const router = useRouter();
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <button
      aria-label={`Remove ${name} from favourites`}
      className="min-h-11 min-w-11 rounded-full border border-border text-brand transition active:scale-90"
      onClick={async () => {
        setGone(true);
        const { error } = await createClient().from("favourites").delete().eq("user_id", userId).eq("item_id", itemId);
        if (error) setGone(false);
        else router.refresh();
      }}
    >
      ♥
    </button>
  );
}
