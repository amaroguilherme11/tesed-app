/** Tipos do domínio Tesed (espelham o modelo de dados — secção 4). */

export type Role = 'patient' | 'doctor';

export type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
  date_of_birth: string | null;
  phone: string | null;
  specialty: string | null;
  photo_url: string | null;
  bio: string | null;
  consent_accepted_at: string | null;
  created_at: string;
};

export type ConversationStatus = 'answered' | 'unanswered';

export type Conversation = {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: ConversationStatus;
  last_message_at: string | null;
  created_at: string;
};

/** Anexo de uma mensagem (Fase 3). Bidirecional: paciente e médico podem enviar. */
export type Attachment = {
  id: string;
  message_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

// ---- Fase 4: subscrições ----

export type PlanType = 'individual' | 'family';
export type CodeOrigin = 'free_consultation' | 'paid_website';
export type CodeStatus = 'active' | 'used' | 'revoked';

/** Código de subscrição (grátis ou pago). */
export type SubscriptionCode = {
  id: string;
  code: string;
  origin: CodeOrigin;
  plan_type: PlanType;
  duration_months: number;
  status: CodeStatus;
  created_by: string | null;
  redeemed_by: string | null;
  redeemed_at: string | null;
  stripe_session_id: string | null;
  created_at: string;
};

/** Resultado de my_subscription(): subscrição efetiva + campos calculados. */
export type MySubscription = {
  subscription_id: string;
  owner_id: string;
  plan_type: PlanType;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  days_left: number;
  my_role: 'owner' | 'member';
};

/** Perfil de dependente de família (sem login; gerido pelo titular). */
export type MemberProfile = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  conversation_id: string | null;
};

// ---- Fase 6: métricas do painel do médico/admin ----

export type AdminMetrics = {
  conversations_total: number;
  /** Por responder: abertas, por responder e SEM standby. */
  conversations_unanswered: number;
  /** Em standby: abertas, por responder e COM standby (só terapeuta). */
  conversations_standby: number;
  conversations_answered: number;
  patients_total: number;
  subscriptions_active: number;
  subscriptions_expired: number;
  subscriptions_individual: number;
  subscriptions_family: number;
  codes_active: number;
  codes_used: number;
  codes_revoked: number;
  messages_total: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  /** Anexos da mensagem (0 ou mais). Carregados em conjunto com a mensagem. */
  attachments?: Attachment[];
};

/**
 * Linha da caixa de entrada do médico (de doctor_inbox()): uma por conversa.
 * Inclui info do titular e, se a conversa for de um dependente, do membro.
 */
export type InboxRow = {
  id: string;
  patient_id: string;
  member_id: string | null;
  status: ConversationStatus;
  last_message_at: string | null;
  created_at: string;
  owner_name: string | null;
  owner_dob: string | null;
  owner_phone: string | null;
  member_name: string | null;
  member_dob: string | null;
  is_family: boolean;
  has_unread: boolean;
};

/** Um chat dentro de um grupo (titular ou dependente). */
export type InboxChat = {
  conversationId: string;
  label: string;        // nome a mostrar (titular ou membro)
  dob: string | null;
  isPersonal: boolean;  // true = conversa do próprio titular
  status: ConversationStatus;
  last_message_at: string | null;
  hasUnread: boolean;
};

/** Grupo da caixa de entrada: um titular e os seus chats. */
export type InboxGroup = {
  ownerId: string;
  ownerName: string;
  ownerDob: string | null;
  ownerPhone: string | null;
  isFamily: boolean;
  chats: InboxChat[];
  unansweredCount: number;
  unreadCount: number;
  lastMessageAt: string | null;
};

/** Linha do dashboard de pacientes (de patients_overview()). */
export type PatientOverview = {
  patient_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  created_at: string;
  plan_type: PlanType | null;
  sub_starts_at: string | null;
  sub_expires_at: string | null;
  sub_active: boolean;
};
