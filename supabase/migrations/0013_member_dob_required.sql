-- =====================================================================
-- Tesed — Migração 0013: data de nascimento OBRIGATÓRIA nos dependentes
-- O nome já era obrigatório; agora a data de nascimento também (imposta no
-- servidor, não só na app). Membros já existentes sem data não são afetados,
-- mas novos exigem-na.
-- =====================================================================

create or replace function public.add_member_profile(p_full_name text, p_dob date default null)
returns public.member_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_sub   public.subscriptions;
  v_count int;
  v_new   public.member_profiles;
begin
  if v_uid is null then
    raise exception 'É necessário ter sessão iniciada.';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Indica o nome completo do membro.';
  end if;
  if p_dob is null then
    raise exception 'Indica a data de nascimento do membro.';
  end if;
  if p_dob > current_date then
    raise exception 'A data de nascimento não pode ser no futuro.';
  end if;

  -- Tem de ter um plano FAMÍLIA ativo de que seja titular.
  select * into v_sub
    from public.subscriptions
   where owner_id = v_uid and plan_type = 'family' and expires_at > now()
   order by expires_at desc
   limit 1;
  if v_sub.id is null then
    raise exception 'Precisas de um plano família ativo para adicionar membros.';
  end if;

  -- Limite: titular + 5 dependentes = 6.
  select count(*) into v_count from public.member_profiles where owner_id = v_uid;
  if v_count >= 5 then
    raise exception 'Limite atingido: uma família tem no máximo 6 pessoas.';
  end if;

  insert into public.member_profiles (owner_id, full_name, date_of_birth)
  values (v_uid, trim(p_full_name), p_dob)
  returning * into v_new;

  -- Cria a conversa do dependente (doctor_id preenchido pelo trigger).
  insert into public.conversations (patient_id, member_id)
  values (v_uid, v_new.id);

  return v_new;
end;
$$;
