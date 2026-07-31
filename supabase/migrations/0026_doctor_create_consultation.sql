-- =====================================================================
-- Tesed — Migração 0026: o TERAPEUTA pode abrir consultas
--
-- Até agora só o paciente abria consultas (create_consultation, com subscrição
-- ativa). Esta RPC deixa o terapeuta abrir uma consulta com um paciente (ou um
-- dependente), SEM exigir subscrição ativa (decisão do cliente) — mas mantendo a
-- regra estrutural de UMA consulta ABERTA por (paciente, membro).
--
-- Nota: se o paciente não tiver subscrição ativa, ele continua sem poder ENVIAR
-- (RLS 0009); só o terapeuta envia. O status por defeito de uma conversa nova é
-- 'answered', por isso uma consulta acabada de abrir NÃO aparece como "por
-- responder" — só o ficará quando o paciente enviar.
--
-- Depende da 0020 (consultas) e do trigger que preenche doctor_id no insert.
-- =====================================================================

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

  -- O paciente tem de existir e ser mesmo um paciente.
  if not exists (
    select 1 from public.profiles where id = p_patient_id and role = 'patient'
  ) then
    raise exception 'Paciente inválido.';
  end if;

  -- Se for para um dependente, tem de pertencer a ESTE paciente.
  if p_member_id is not null and not exists (
    select 1 from public.member_profiles mp
    where mp.id = p_member_id and mp.owner_id = p_patient_id
  ) then
    raise exception 'Membro inválido.';
  end if;

  -- Uma consulta ABERTA de cada vez por (paciente, membro).
  if exists (
    select 1 from public.conversations c
    where c.patient_id = p_patient_id
      and coalesce(c.member_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = coalesce(p_member_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and c.closed_at is null
  ) then
    raise exception 'Já existe uma consulta aberta para este paciente/membro.';
  end if;

  -- doctor_id é preenchido pelo trigger existente; status fica 'answered' (default).
  insert into public.conversations (patient_id, member_id)
  values (p_patient_id, p_member_id)
  returning * into v_new;

  return v_new;
end;
$$;

grant execute on function public.doctor_create_consultation(uuid, uuid) to authenticated;
