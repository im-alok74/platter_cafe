-- Makes the 10 "live" demo orders look fresh again (2 to 41 minutes old, as in the seed).
-- Run it right before showing the kitchen screen, because their ages keep growing in real time and after a few hours the
-- kitchen board would show them as hours overdue. Only touches demo orders #779 to #788; history is not changed.

begin;
set local session_replication_role = replica;

create temp table _live (k text, age int) on commit drop;
insert into _live values ('demo-788', 2), ('demo-787', 5), ('demo-786', 7), ('demo-785', 11), ('demo-784', 14),
                         ('demo-783', 19), ('demo-782', 23), ('demo-781', 27), ('demo-780', 33), ('demo-779', 41);

update orders o set placed_at = now() - make_interval(mins => l.age),
  updated_at = now() - make_interval(mins => l.age) + make_interval(secs => l.age * 60 * case o.status when 'received' then 0 when 'preparing' then 0.25 when 'ready' then 0.6 else 0.85 end)
from _live l where o.idempotency_key = l.k;

delete from order_events where order_id in (select o.id from orders o join _live l on l.k = o.idempotency_key);
insert into order_events (order_id, status, created_at)
select o.id, s.st, o.placed_at + make_interval(secs => l.age * 60 * s.f)
from orders o join _live l on l.k = o.idempotency_key
join (values ('received', 0.0, 1), ('preparing', 0.25, 2), ('ready', 0.6, 3), ('served', 0.85, 4)) s(st, f, rank)
  on s.rank <= case o.status when 'received' then 1 when 'preparing' then 2 when 'ready' then 3 else 4 end;

-- Table requests: open again, waiting 3 and 6 minutes (also re-opens them if someone pressed Done).
update service_requests set status = 'open', created_at = now() - interval '3 minutes' where id = '57e13e69-e3de-4129-bca9-b05778938df0';
update service_requests set status = 'open', created_at = now() - interval '6 minutes' where id = '629ca2db-ca3e-40ed-ae74-b274e2bce68d';

commit;
