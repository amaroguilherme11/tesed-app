-- =====================================================================
-- Tesed — Migração 0028: o TERAPEUTA edita/apaga perfis (soft-delete)
--
-- Pedido do cliente:
--   - Editar dados de um paciente (titular) ou de um dependente (ex.: registo
--     incorreto, ou mudança de detalhe). SÓ na vista do terapeuta.
--   - Apagar uma conta/dependente, COM recuperação pelo terapeuta durante 1 mês.
--
-- Modelo: SOFT-DELETE. Marca-se `deleted_at`; a conta/dependente desaparece das
-- listas do terapeuta e (no caso do titular) o login é bloqueado. O terapeuta tem
-- uma secção "Contas apagadas" para RESTAURAR dentro de 30 dias. Ao fim de 30 dias,
-- `purge_deleted_accounts()` apaga em definitivo (agendável por pg_cron).
--
-- Regras respeitadas: tudo por RPC SECURITY DEFINER com is_doctor(); o cliente
-- nunca escreve diretamente. Nunca se apaga a conta do médico.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Colunas de soft-delete (NULL = ativo).
-- ---------------------------------------------------------------------
alter table public.profiles        add column if not exists deleted_at timestamptz;
alter table public.member_profiles add column if not exists deleted_at timestamptz;

create index if not exists profiles_deleted_idx        on public.profiles (deleted_at)        where deleted_at is not null;
create index if not exists member_profiles_deleted_idx on public.member_profiles (deleted_at) where deleted_at is not null;

-- ---------------------------------------------------------------------
-- 2) FKs de subscription_codes -> profiles passam a ON DELETE SET NULL.
--    Sem isto, a purga (apagar o profile) seria bloqueada por um código que o
--    paciente tenha criado/resgatado. O histórico do código mantém-se (sem dono).
-- ---------------------------------------------------------------------
alter table public.subscription_codes drop constraint if exists subscription_codes_redeemed_by_fkey;
alter table public.subscription_codes
  add constraint subscription_codes_redeemed_by_fkey
  foreign key (redeemed_by) references public.profiles(id) on delete set null;

alter table public.subscription_codes drop constraint if exists subscription_codes_created_by_fkey;
alter table public.subscription_codes
  add constraint subscription_codes_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- ---------------------------------------------------------------------
-- 3) Editar: titular (nome, data nascimento, telemóvel) e dependente (nome, dob).
-- ---------------------------------------------------------------------
create or replace function public.doctor_update_patient(
  p_id uuid,
  p_full_name text,
  p_dob date default null,
  p_phone text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.profiles;
begin
  if not public.is_doctor() then
    raise exception 'Apenas o terapeuta pode editar perfis.';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Indica o nome completo.';
  end if;

  update public.profiles
     set full_name     = trim(p_full_name),
         date_of_birth = p_dob,
         phone         = nullif(trim(coalesce(p_phone, '')), '')
   where id = p_id and role = 'patient' and deleted_at is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Paciente não encontrado.';
  end if;
  return v_row;
end;
$$;

create or replace function public.doctor_update_member(
  p_id uuid,
  p_full_name text,
  p_dob date default null
)
returns public.member_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.member_profiles;
begin
  if not public.is_doctor() then
    raise exception 'Apenas o terapeuta pode editar perfis.';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Indica o nome completo.';
  end if;

  update public.member_profiles
     set full_name     = trim(p_full_name),
         date_of_birth = p_dob
   where id = p_id and deleted_at is null
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Membro não encontrado.';
  end if;
  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- 4) Apagar (soft) + bloquear login do titular; e restaurar.
--    O bloqueio do login usa auth.users.banned_until (GoTrue recusa a sessão).
--    Vai num bloco protegido: se faltar privilégio, o soft-delete fica à mesma.
-- ---------------------------------------------------------------------
create or replace function public.doctor_soft_delete_patient(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_doctor() then
    raise exception 'Apenas o terapeuta pode apagar contas.';
  end if;

  update public.profiles
     set deleted_at = now()
   where id = p_id and role = 'patient' and deleted_at is null;
  if not found then
    raise exception 'Paciente não encontrado ou já apagado.';
  end if;

  -- Bloqueia o login (banir "para sempre" enquanto estiver apagado).
  begin
    update auth.users set banned_until = now() + interval '100 years' where id = p_id;
  exception when others then
    null; -- sem privilégio sobre auth.users: fica ao menos o soft-delete.
  end;
end;
$$;

create or replace function public.doctor_restore_patient(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_doctor() then
    raise exception 'Apenas o terapeuta pode restaurar contas.';
  end if;

  update public.profiles
     set deleted_at = null
   where id = p_id and role = 'patient' and deleted_at is not null;
  if not found then
    raise exception 'Conta não encontrada ou já ativa.';
  end if;

  begin
    update auth.users set banned_until = null where id = p_id;
  exception when others then
    null;
  end;
end;
$$;

create or replace function public.doctor_soft_delete_member(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_doctor() then
    raise exception 'Apenas o terapeuta pode apagar membros.';
  end if;

  update public.member_profiles
     set deleted_at = now()
   where id = p_id and deleted_at is null;
  if not found then
    raise exception 'Membro não encontrado ou já apagado.';
  end if;
end;
$$;

create or replace function public.doctor_restore_member(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_doctor() then
    raise exception 'Apenas o terapeuta pode restaurar membros.';
  end if;

  update public.member_profiles
     set deleted_at = null
   where id = p_id and deleted_at is not null;
  if not found then
    raise exception 'Membro não encontrado ou já ativo.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 5) Lista de apagados (para a secção "Contas apagadas" do terapeuta).
--    days_left = dias até à purga definitiva (30 dias após o apagamento).
-- ---------------------------------------------------------------------
create or replace function public.doctor_deleted_accounts()
returns table (
  kind          text,   -- 'patient' | 'member'
  id            uuid,
  full_name     text,
  owner_name    text,   -- para membros: nome do titular; para titulares: NULL
  deleted_at    timestamptz,
  days_left     int
)
language sql
stable
security definer
set search_path = public
as $$
  select 'patient'::text, p.id, p.full_name, null::text,
         p.deleted_at,
         greatest(0, 30 - floor(extract(epoch from (now() - p.deleted_at)) / 86400)::int)
    from public.profiles p
   where public.is_doctor() and p.role = 'patient' and p.deleted_at is not null
  union all
  select 'member'::text, mp.id, mp.full_name, owner.full_name,
         mp.deleted_at,
         greatest(0, 30 - floor(extract(epoch from (now() - mp.deleted_at)) / 86400)::int)
    from public.member_profiles mp
    join public.profiles owner on owner.id = mp.owner_id
   where public.is_doctor() and mp.deleted_at is not null and owner.deleted_at is null
   order by deleted_at desc;
$$;

-- ---------------------------------------------------------------------
-- 6) Purga definitiva: apaga o que está soft-deleted há mais de 30 dias.
--    Titular: apaga a conta auth (cascata -> profiles, conversas, mensagens,
--    anexos, membros, subscrições). Membro: apaga o perfil (cascata -> conversa).
--    NOTA: ficheiros no Storage não são apagados por cascata da BD (ver docs).
-- ---------------------------------------------------------------------
create or replace function public.purge_deleted_accounts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.member_profiles
   where deleted_at is not null and deleted_at < now() - interval '30 days';

  delete from auth.users
   where id in (
     select id from public.profiles
      where role = 'patient' and deleted_at is not null
        and deleted_at < now() - interval '30 days'
   );
end;
$$;

-- A purga é uma tarefa de sistema: ninguém do cliente a pode chamar.
revoke execute on function public.purge_deleted_accounts() from anon, authenticated;

-- Agendamento diário às 03:00 (só se a extensão pg_cron estiver disponível).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'tesed-purge-deleted') then
      perform cron.unschedule('tesed-purge-deleted');
    end if;
    perform cron.schedule('tesed-purge-deleted', '0 3 * * *', 'select public.purge_deleted_accounts();');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7) Esconder apagados das vistas do terapeuta (recriações com filtro).
-- ---------------------------------------------------------------------

-- 7a) doctor_patients_overview: só titulares ativos.
drop function if exists public.doctor_patients_overview();
create function public.doctor_patients_overview()
returns table (
  patient_id       uuid,
  full_name        text,
  email            text,
  phone            text,
  date_of_birth    date,
  created_at       timestamptz,
  plan_type        text,
  sub_active       boolean,
  open_count       int,
  unanswered_count int,
  standby_count    int,
  needs_response   boolean,
  has_unread       boolean
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
       where c.patient_id = p.id and c.closed_at is null
         and c.status = 'unanswered' and c.standby_at is null) as unanswered_count,
    (select count(*)::int from public.conversations c
       where c.patient_id = p.id and c.closed_at is null
         and c.status = 'unanswered' and c.standby_at is not null) as standby_count,
    exists (
      select 1 from public.conversations c
      where c.patient_id = p.id and c.closed_at is null
        and c.status = 'unanswered' and c.standby_at is null
    ) as needs_response,
    exists (
      select 1 from public.conversations c
      where c.patient_id = p.id and c.closed_at is null
        and c.status = 'unanswered' and c.standby_at is null
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
    and p.deleted_at is null
    and public.is_doctor()
    and exists (select 1 from public.subscriptions s2 where s2.owner_id = p.id)
  order by needs_response desc, standby_count desc, p.full_name;
$$;

-- 7b) doctor_patient_consultations: exclui dependentes apagados e titular apagado.
drop function if exists public.doctor_patient_consultations(uuid);
create function public.doctor_patient_consultations(p_patient_id uuid)
returns table (
  conversation_id uuid,
  member_id       uuid,
  member_name     text,
  member_dob      date,
  is_open         boolean,
  status          text,
  is_standby      boolean,
  last_message_at timestamptz,
  created_at      timestamptz,
  closed_at       timestamptz,
  has_unread      boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.member_id,
    mp.full_name,
    mp.date_of_birth,
    (c.closed_at is null) as is_open,
    c.status,
    (c.standby_at is not null) as is_standby,
    c.last_message_at,
    c.created_at,
    c.closed_at,
    (
      c.closed_at is null
      and c.status = 'unanswered'
      and c.standby_at is null
      and c.last_message_at is not null
      and (c.doctor_last_read_at is null or c.last_message_at > c.doctor_last_read_at)
    ) as has_unread
  from public.conversations c
  left join public.member_profiles mp on mp.id = c.member_id
  join public.profiles pp on pp.id = c.patient_id
  where public.is_doctor()
    and c.patient_id = p_patient_id
    and pp.deleted_at is null
    and (c.member_id is null or mp.deleted_at is null)
  order by (c.closed_at is null) desc, coalesce(c.last_message_at, c.created_at) desc;
$$;

-- 7c) doctor_create_consultation: não abrir para paciente/membro apagado.
create or replace function public.doctor_create_consultation(
  p_patient_id uuid,
  p_member_id  uuid default null
)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new public.conversations;
begin
  if not public.is_doctor() then
    raise exception 'Apenas o terapeuta pode abrir consultas por aqui.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_patient_id and role = 'patient' and deleted_at is null
  ) then
    raise exception 'Paciente inválido.';
  end if;

  if p_member_id is not null and not exists (
    select 1 from public.member_profiles mp
    where mp.id = p_member_id and mp.owner_id = p_patient_id and mp.deleted_at is null
  ) then
    raise exception 'Membro inválido.';
  end if;

  if exists (
    select 1 from public.conversations c
    where c.patient_id = p_patient_id
      and coalesce(c.member_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = coalesce(p_member_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and c.closed_at is null
  ) then
    raise exception 'Já existe uma consulta aberta para este paciente/membro.';
  end if;

  insert into public.conversations (patient_id, member_id)
  values (p_patient_id, p_member_id)
  returning * into v_new;

  return v_new;
end;
$$;

-- 7d) admin_metrics: exclui pacientes/consultas apagados das contagens.
create or replace function public.admin_metrics()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_doctor() then
    raise exception 'Apenas o médico pode ver as métricas.';
  end if;

  select json_build_object(
    'conversations_total',        (select count(*) from public.conversations c
                                     join public.profiles p on p.id = c.patient_id
                                     where p.deleted_at is null
                                       and (c.member_id is null or exists (
                                         select 1 from public.member_profiles mp
                                         where mp.id = c.member_id and mp.deleted_at is null))),
    'conversations_unanswered',   (select count(*) from public.conversations c
                                     join public.profiles p on p.id = c.patient_id
                                     where c.closed_at is null and c.status = 'unanswered'
                                       and c.standby_at is null and p.deleted_at is null
                                       and (c.member_id is null or exists (
                                         select 1 from public.member_profiles mp
                                         where mp.id = c.member_id and mp.deleted_at is null))),
    'conversations_standby',      (select count(*) from public.conversations c
                                     join public.profiles p on p.id = c.patient_id
                                     where c.closed_at is null and c.status = 'unanswered'
                                       and c.standby_at is not null and p.deleted_at is null
                                       and (c.member_id is null or exists (
                                         select 1 from public.member_profiles mp
                                         where mp.id = c.member_id and mp.deleted_at is null))),
    'conversations_answered',     (select count(*) from public.conversations c
                                     join public.profiles p on p.id = c.patient_id
                                     where c.status = 'answered' and p.deleted_at is null
                                       and (c.member_id is null or exists (
                                         select 1 from public.member_profiles mp
                                         where mp.id = c.member_id and mp.deleted_at is null))),
    'patients_total',             (select count(*) from public.profiles where role = 'patient' and deleted_at is null),
    'subscriptions_active',       (select count(*) from public.subscriptions where expires_at > now()),
    'subscriptions_expired',      (select count(*) from public.subscriptions where expires_at <= now()),
    'subscriptions_individual',   (select count(*) from public.subscriptions where plan_type = 'individual' and expires_at > now()),
    'subscriptions_family',       (select count(*) from public.subscriptions where plan_type = 'family' and expires_at > now()),
    'codes_active',               (select count(*) from public.subscription_codes where status = 'active'),
    'codes_used',                 (select count(*) from public.subscription_codes where status = 'used'),
    'codes_revoked',              (select count(*) from public.subscription_codes where status = 'revoked'),
    'messages_total',             (select count(*) from public.messages)
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------
-- 8) Permissões de execução (gate real é is_doctor() dentro de cada função).
-- ---------------------------------------------------------------------
grant execute on function public.doctor_update_patient(uuid, text, date, text) to authenticated;
grant execute on function public.doctor_update_member(uuid, text, date)        to authenticated;
grant execute on function public.doctor_soft_delete_patient(uuid)              to authenticated;
grant execute on function public.doctor_restore_patient(uuid)                  to authenticated;
grant execute on function public.doctor_soft_delete_member(uuid)               to authenticated;
grant execute on function public.doctor_restore_member(uuid)                   to authenticated;
grant execute on function public.doctor_deleted_accounts()                     to authenticated;
