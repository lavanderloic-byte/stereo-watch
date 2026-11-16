create table public.stereo_booking_jobs (
 id uuid primary key default gen_random_uuid(), request_id uuid not null unique,
 plan_hash text not null unique, plan jsonb not null,
 status text not null default 'queued' check(status in ('queued','preparing','awaiting_confirmation','authorized','submitting','completed','blocked','partial','uncertain')),
 worker_id text, prepared jsonb, results jsonb, error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.stereo_booking_jobs enable row level security;
revoke all on public.stereo_booking_jobs from anon, authenticated;
grant all on public.stereo_booking_jobs to service_role;
create table public.stereo_booking_workers (id text primary key, seen_at timestamptz not null default now());
alter table public.stereo_booking_workers enable row level security;
revoke all on public.stereo_booking_workers from anon, authenticated;
grant all on public.stereo_booking_workers to service_role;
create function public.stereo_booking_claim(worker text) returns setof public.stereo_booking_jobs
language sql security invoker set search_path='' as $$
 update public.stereo_booking_jobs set status=case when status='queued' then 'preparing' else 'submitting' end,
 worker_id=worker, updated_at=now()
 where id=(select id from public.stereo_booking_jobs where status='queued' or (status='authorized' and worker_id=worker)
 order by created_at for update skip locked limit 1) returning *;
$$;
revoke all on function public.stereo_booking_claim(text) from public,anon,authenticated;
grant execute on function public.stereo_booking_claim(text) to service_role;
