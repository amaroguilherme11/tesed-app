-- =====================================================================
-- Tesed — Migração 0022: nº de consultas POR RESPONDER por paciente
--
-- Acrescenta 'unanswered_count' ao doctor_patients_overview, para a lista de
-- pacientes mostrar quantas consultas abertas estão por responder (útil nas
-- famílias: ex.: "2 por responder" de 4 abertas).
--
-- Retrocompatível: a app 1.1.0 no TestFlight ignora o campo novo; a app antiga
-- (1.0.x) nem chama esta RPC.
-- =====================================================================

drop function if exists public.doctor_patients_overview();
create function public.doctor_patients_overview()
returns table (
  patient_id      uuid,
  full_name       text,
  email           text,
  phone           text,
  date_of_birth   date,
  created_at      timestamptz,
  plan_type       text,
  sub_active      boolean,
  open_count      int,
  unanswered_count int,
  needs_response  boolean,
  has_unread      boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    u.email,
    p.phone,
    p.date_of_birth,
    p.created_at,
    s.plan_type,
    (s.expires_at is not null and s.expires_at > now()) as sub_active,
    (select count(*)::int from public.conversations c
       where c.patient_id = p.id and c.closed_at is null) as open_count,
    (select count(*)::int from public.conversations c
       where c.patient_id = p.id and c.closed_at is null and c.status = 'unanswered') as unanswered_count,
    exists (
      select 1 from public.conversations c
      where c.patient_id = p.id and c.closed_at is null and c.status = 'unanswered'
    ) as needs_response,
    exists (
      select 1 from public.conversations c
      where c.patient_id = p.id and c.closed_at is null and c.status = 'unanswered'
        and c.last_message_at is not null
        and (c.doctor_last_read_at is null or c.last_message_at > c.doctor_last_read_at)
    ) as has_unread
  from public.profiles p
  join auth.users u on u.id = p.id
  left join lateral (
    select s1.plan_type, s1.expires_at
    from public.subscriptions s1
    where s1.owner_id = p.id
    order by s1.expires_at desc
    limit 1
  ) s on true
  where p.role = 'patient'
    and public.is_doctor()
    and exists (select 1 from public.subscriptions s2 where s2.owner_id = p.id)
  order by needs_response desc, p.full_name;
$$;
