-- Supabase grants execute to anon by default; staff-only functions must not be callable without signing in.
revoke execute on function public.set_order_status(uuid, text), public.mark_counter_paid(uuid) from anon;
