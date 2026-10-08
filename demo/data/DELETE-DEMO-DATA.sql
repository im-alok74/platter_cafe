-- REMOVES ALL DEMO DATA. Do NOT run this until you decide the demo is over.
-- It deletes only rows made by seed-demo-data.sql:
--   * orders whose idempotency_key starts with 'demo-' (with their lines and status history)
--   * the 5 demo table requests (by id)
--   * the 2 demo customer accounts (phones +919000000001 / +919000000002) and their favourites
-- Real orders placed after the demo was made are not touched. Order numbers will then restart from max(order_no)+1.

begin;
set local session_replication_role = replica;

delete from order_events where order_id in (select id from orders where idempotency_key like 'demo-%');
delete from order_items  where order_id in (select id from orders where idempotency_key like 'demo-%');
delete from orders       where idempotency_key like 'demo-%';

delete from service_requests where id in (
  '57e13e69-e3de-4129-bca9-b05778938df0', '629ca2db-ca3e-40ed-ae74-b274e2bce68d', '906bbc36-60d9-467a-9b97-d17c5831d6cf',
  'd5fe7eed-5529-4396-80df-1a776fdd4f0c', 'cc8266ce-6f1e-4e69-9620-c8b13c2bdeec');

delete from favourites where user_id in (select id from profiles where phone in ('+919000000001', '+919000000002'));
delete from auth.sessions       where user_id in (select id from auth.users where email in ('919000000001@phone.platter.invalid', '919000000002@phone.platter.invalid'));
delete from auth.refresh_tokens where user_id::text in (select id::text from auth.users where email in ('919000000001@phone.platter.invalid', '919000000002@phone.platter.invalid'));
delete from auth.identities     where user_id in (select id from auth.users where email in ('919000000001@phone.platter.invalid', '919000000002@phone.platter.invalid'));
delete from profiles            where phone in ('+919000000001', '+919000000002');
delete from auth.users          where email in ('919000000001@phone.platter.invalid', '919000000002@phone.platter.invalid');

commit;

-- Check afterwards (all should be 0):
-- select (select count(*) from orders where idempotency_key like 'demo-%') demo_orders,
--        (select count(*) from profiles where phone like '+919000000%') demo_customers;
