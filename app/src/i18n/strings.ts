/**
 * Dicionários de tradução (PT / EN) — visão do PACIENTE.
 *
 * `pt` é a fonte de verdade da forma; `en` é tipado como `typeof pt`, por isso o
 * TypeScript obriga a que tenha exatamente as mesmas chaves (chave em falta = erro
 * de compilação). Termos técnicos decididos com o cliente:
 *   consulta -> consultation | titular -> primary member | membro -> family member
 *   terapeuta -> therapist
 * Os ecrãs do TERAPEUTA não são traduzidos (conta única da clínica, PT).
 *
 * Nota: os parâmetros das funções são anotados em `pt`; em `en` o tipo vem por
 * contexto (`typeof pt`), por isso podem ser omitidos.
 */

export const pt = {
  common: {
    back: 'Voltar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    remove: 'Remover',
    unknownError: 'Erro desconhecido.',
    show: 'Mostrar',
    hide: 'Ocultar',
  },
  signOut: {
    button: 'Sair',
    confirmTitle: 'Terminar sessão',
    confirmMsg: 'Tens a certeza de que queres sair?',
  },
  nav: {
    login: 'Entrar',
    register: 'Criar conta',
    forgotPassword: 'Recuperar password',
    resetPassword: 'Nova password',
    consultations: 'Consultas',
    consultation: 'Consulta',
    addMember: 'Adicionar membro',
    files: 'Ficheiros',
    subscription: 'Subscrição',
    guide: 'Como usar a app',
  },
  auth: {
    tagline: 'Comunicação com o seu terapeuta, sem se perder nada.',
    email: 'Email',
    password: 'Password',
    login: 'Entrar',
    forgotPassword: 'Esqueci-me da password',
    noAccount: 'Ainda não tem conta?',
    createPatientAccount: 'Criar conta de paciente',
    loginErrorTitle: 'Não foi possível entrar',
    unknownError: 'Erro desconhecido.',

    registerTitle: 'Criar conta de paciente',
    fullName: 'Nome completo',
    dateOfBirth: 'Data de nascimento',
    phone: 'Telemóvel',
    passwordMin: 'Password (mín. 8 caracteres)',
    consent:
      'Li e aceito a Política de Privacidade e o tratamento dos meus dados de saúde para efeitos de comunicação com o terapeuta.',
    createAccount: 'Criar conta',
    missingNameTitle: 'Falta o nome',
    missingNameMsg: 'Indica o teu nome completo.',
    invalidDateTitle: 'Data inválida',
    invalidDateMsg: 'Indica a data de nascimento no formato DD/MM/AAAA.',
    invalidPhoneTitle: 'Telemóvel inválido',
    invalidPhoneMsg: 'Indica um número de telemóvel válido.',
    weakPasswordTitle: 'Password fraca',
    weakPasswordMsg: 'A password deve ter pelo menos 8 caracteres.',
    accountCreatedTitle: 'Conta criada',
    accountCreatedMsg: 'Confirma o teu email para ativar a conta e depois inicia sessão.',
    createErrorTitle: 'Não foi possível criar a conta',

    forgotTitle: 'Recuperar password',
    forgotSubtitle: 'Indica o teu email e enviamos um link para definires uma nova password.',
    sendLink: 'Enviar link',
    emailSentTitle: 'Email enviado',
    emailSentMsg: 'Se a conta existir, vais receber instruções por email.',
    errorTitle: 'Erro',
    forgotErrorMsg: 'Não foi possível enviar o email.',

    resetTitle: 'Definir nova password',
    resetSubtitle: 'Escolhe uma nova password para a tua conta.',
    newPasswordMin: 'Nova password (mín. 8 caracteres)',
    confirmPassword: 'Confirmar password',
    savePassword: 'Guardar password',
    passwordsDontMatchTitle: 'Não coincidem',
    passwordsDontMatchMsg: 'As duas passwords têm de ser iguais.',
    passwordChangedTitle: 'Password alterada',
    passwordChangedMsg: 'Já podes iniciar sessão com a nova password.',
    resetErrorMsg: 'Não foi possível alterar a password.',
  },
  fields: {
    datePlaceholder: 'DD/MM/AAAA',
    phonePlaceholder: '912 345 678',
    countryDialTitle: 'Indicativo do país',
  },
  countries: {
    PT: 'Portugal',
    BR: 'Brasil',
    ES: 'Espanha',
    FR: 'França',
    GB: 'Reino Unido',
    DE: 'Alemanha',
    CH: 'Suíça',
    LU: 'Luxemburgo',
    AO: 'Angola',
    MZ: 'Moçambique',
    CV: 'Cabo Verde',
    US: 'EUA / Canadá',
  },
  home: {
    manage: 'Gestão',
    myConsultation: 'A minha consulta',
    loadError: 'Erro a carregar as consultas.',
    couldNotOpenTitle: 'Não foi possível abrir',
    familyTitle: (n: number, max: number) => `Família (${n}/${max})`,
    familyPick: 'Escolhe de quem são as consultas.',
    me: 'Eu',
    meTag: '  (eu)',
    meParenthetical: '(eu)',
    newReplyFromTherapist: 'Nova resposta do terapeuta',
    addMember: '＋ Adicionar membro',
    familyLimit: (max: number) => `Limite de ${max} pessoas atingido.`,
    removeMemberTitle: 'Remover membro',
    removeMemberMsg: (name: string) =>
      `Remover ${name} e as suas consultas? Esta ação não pode ser anulada.`,
    removeError: 'Não foi possível remover.',
  },
  consultations: {
    hasOpenHint: 'Tens uma consulta aberta — toca nela para continuar.',
    newConsultation: 'Nova consulta',
    needSubscriptionHint:
      'Precisas de uma subscrição ativa para abrir uma consulta. Toca em "Gestão".',
    consultationOf: (date: string) => `Consulta de ${date}`,
    openNewReply: 'Aberta · nova resposta do terapeuta',
    open: 'Aberta',
    closedReadOnly: 'Fechada · só leitura',
    emptyNone: 'Ainda não tens consultas.',
    emptyStartHint: ' Abre a primeira com "Nova consulta".',
    lockNoSubscription:
      'Precisas de uma subscrição ativa para enviar mensagens. Toca em "Gestão" para inserir um código.',
    closedReadOnlyMessage:
      'Esta consulta está fechada. Podes ler o histórico, mas não podes enviar mensagens.',
  },
  chat: {
    emptyFirst: 'Ainda não há mensagens. Escreve a primeira.',
    inputPlaceholder: 'Escrever mensagem…',
    send: 'Enviar',
    attachLabel: 'Anexar foto ou ficheiro',
    takePhoto: 'Tirar foto',
    choosePhotos: 'Escolher fotos',
    sendFile: 'Enviar ficheiro',
    couldNotSendTitle: 'Não foi possível enviar',
    noAccessTitle: 'Sem acesso',
    couldNotOpen: 'Não foi possível abrir.',
    tapToOpen: 'tocar para abrir',
  },
  chatScreen: {
    conversation: 'Conversa',
    filesPrefix: (title: string) => `Ficheiros — ${title}`,
  },
  files: {
    empty: 'Ainda não foram trocados ficheiros nesta conversa.',
    sentByMe: 'Enviado por mim',
    received: 'Recebido',
  },
  subscription: {
    mySubscription: 'A minha subscrição',
    active: 'ATIVA',
    expired: 'EXPIRADA',
    plan: 'Plano:',
    individual: 'Individual',
    family: 'Família',
    validity: 'Validade:',
    daysLeft: (n: number) => `Faltam ${n} dias.`,
    manageFamilyHint: 'Gere os membros da família no ecrã principal (lista de chats).',
    noSubscription: 'Ainda não tens subscrição ativa. Insere um código para ativar.',
    enterCode: 'Inserir código',
    enterCodeHint: 'Recebeste um código em consulta ou na compra no website? Insere-o aqui.',
    codeLabel: 'Código',
    redeem: 'Resgatar código',
    activatedTitle: 'Subscrição ativada',
    activatedMsg: 'O teu código foi resgatado com sucesso.',
    couldNotRedeemTitle: 'Não foi possível resgatar',
  },
  addMember: {
    title: 'Adicionar membro da família',
    hint:
      'Cria um perfil para um familiar (ex.: um filho). Cada membro tem o seu próprio chat com o terapeuta, para separar os casos.',
    addButton: 'Adicionar membro',
    missingNameTitle: 'Falta o nome',
    missingNameMsg: 'Indica o nome completo do membro.',
    couldNotAddTitle: 'Não foi possível adicionar',
  },
  attachments: {
    noCameraAccess: 'Sem acesso à câmara. Ativa a permissão nas definições do telemóvel.',
    noPhotosAccess: 'Sem acesso às fotos. Ativa a permissão nas definições do telemóvel.',
  },
  age: {
    year: 'ano',
    years: 'anos',
    month: 'mês',
    months: 'meses',
    newborn: 'recém-nascido',
  },
  guide: {
    title: 'Como usar a Tesed',
    subtitle: 'Um guia rápido, passo a passo.',
    steps: [
      {
        title: 'Criar conta',
        caption:
          'Abre a app, toca em «Criar conta de paciente» e preenche os teus dados. Depois confirma o email que recebes para ativar a conta.',
      },
      {
        title: 'Ativar a subscrição',
        caption:
          'Toca em «Gestão» e depois em «Inserir código». Escreve o código que recebeste (na compra ou em consulta) para ativares a subscrição.',
      },
      {
        title: 'Abrir uma consulta',
        caption:
          'No ecrã principal, toca em «Nova consulta» para começares a falar com o teu terapeuta. Só podes ter uma consulta aberta de cada vez.',
      },
      {
        title: 'Escrever e enviar',
        caption:
          'Escreve a mensagem e toca em «Enviar». Para enviares uma foto ou ficheiro, toca no «＋» à esquerda. Recebes uma notificação quando o terapeuta responder.',
      },
      {
        title: 'Consulta fechada',
        caption:
          'Quando o terapeuta fecha a consulta, podes continuar a ler o histórico, mas não enviar. Abre uma nova sempre que precisares.',
      },
      {
        title: 'Plano família',
        caption:
          'No plano família, no ecrã principal escolhes de quem é a consulta (tu ou um dependente). Cada pessoa tem o seu próprio chat.',
      },
      {
        title: 'Adicionar um membro',
        caption:
          'Toca em «＋ Adicionar membro», escreve o nome e a data de nascimento. O novo membro passa a aparecer na lista da família.',
      },
      {
        title: 'Trocar de idioma',
        caption: 'Toca no «🌐» no canto superior para alternar entre português e inglês.',
      },
    ],
  },
  dates: {
    today: 'Hoje',
    yesterday: 'Ontem',
  },
};

export const en: typeof pt = {
  common: {
    back: 'Back',
    cancel: 'Cancel',
    confirm: 'Confirm',
    remove: 'Remove',
    unknownError: 'Unknown error.',
    show: 'Show',
    hide: 'Hide',
  },
  signOut: {
    button: 'Log out',
    confirmTitle: 'Log out',
    confirmMsg: 'Are you sure you want to log out?',
  },
  nav: {
    login: 'Log in',
    register: 'Create account',
    forgotPassword: 'Reset password',
    resetPassword: 'New password',
    consultations: 'Consultations',
    consultation: 'Consultation',
    addMember: 'Add family member',
    files: 'Files',
    subscription: 'Subscription',
    guide: 'How to use the app',
  },
  auth: {
    tagline: 'Talk to your therapist, without missing a thing.',
    email: 'Email',
    password: 'Password',
    login: 'Log in',
    forgotPassword: 'Forgot your password?',
    noAccount: "Don't have an account yet?",
    createPatientAccount: 'Create patient account',
    loginErrorTitle: 'Could not log in',
    unknownError: 'Unknown error.',

    registerTitle: 'Create patient account',
    fullName: 'Full name',
    dateOfBirth: 'Date of birth',
    phone: 'Mobile number',
    passwordMin: 'Password (min. 8 characters)',
    consent:
      'I have read and accept the Privacy Policy and the processing of my health data for the purpose of communicating with the therapist.',
    createAccount: 'Create account',
    missingNameTitle: 'Name required',
    missingNameMsg: 'Please enter your full name.',
    invalidDateTitle: 'Invalid date',
    invalidDateMsg: 'Enter your date of birth as DD/MM/YYYY.',
    invalidPhoneTitle: 'Invalid mobile number',
    invalidPhoneMsg: 'Please enter a valid mobile number.',
    weakPasswordTitle: 'Weak password',
    weakPasswordMsg: 'The password must be at least 8 characters long.',
    accountCreatedTitle: 'Account created',
    accountCreatedMsg: 'Confirm your email to activate the account, then log in.',
    createErrorTitle: 'Could not create the account',

    forgotTitle: 'Reset password',
    forgotSubtitle: "Enter your email and we'll send you a link to set a new password.",
    sendLink: 'Send link',
    emailSentTitle: 'Email sent',
    emailSentMsg: "If the account exists, you'll receive instructions by email.",
    errorTitle: 'Error',
    forgotErrorMsg: 'Could not send the email.',

    resetTitle: 'Set new password',
    resetSubtitle: 'Choose a new password for your account.',
    newPasswordMin: 'New password (min. 8 characters)',
    confirmPassword: 'Confirm password',
    savePassword: 'Save password',
    passwordsDontMatchTitle: "Passwords don't match",
    passwordsDontMatchMsg: 'The two passwords must be the same.',
    passwordChangedTitle: 'Password changed',
    passwordChangedMsg: 'You can now log in with your new password.',
    resetErrorMsg: 'Could not change the password.',
  },
  fields: {
    datePlaceholder: 'DD/MM/YYYY',
    phonePlaceholder: '912 345 678',
    countryDialTitle: 'Country code',
  },
  countries: {
    PT: 'Portugal',
    BR: 'Brazil',
    ES: 'Spain',
    FR: 'France',
    GB: 'United Kingdom',
    DE: 'Germany',
    CH: 'Switzerland',
    LU: 'Luxembourg',
    AO: 'Angola',
    MZ: 'Mozambique',
    CV: 'Cape Verde',
    US: 'USA / Canada',
  },
  home: {
    manage: 'Account',
    myConsultation: 'My consultation',
    loadError: 'Could not load consultations.',
    couldNotOpenTitle: 'Could not open',
    familyTitle: (n, max) => `Family (${n}/${max})`,
    familyPick: 'Choose whose consultations to view.',
    me: 'Me',
    meTag: '  (me)',
    meParenthetical: '(me)',
    newReplyFromTherapist: 'New reply from the therapist',
    addMember: '＋ Add family member',
    familyLimit: (max) => `Limit of ${max} people reached.`,
    removeMemberTitle: 'Remove family member',
    removeMemberMsg: (name) => `Remove ${name} and their consultations? This can't be undone.`,
    removeError: 'Could not remove.',
  },
  consultations: {
    hasOpenHint: 'You have an open consultation — tap it to continue.',
    newConsultation: 'New consultation',
    needSubscriptionHint:
      'You need an active subscription to open a consultation. Tap "Account".',
    consultationOf: (date) => `Consultation of ${date}`,
    openNewReply: 'Open · new reply from the therapist',
    open: 'Open',
    closedReadOnly: 'Closed · read-only',
    emptyNone: "You don't have any consultations yet.",
    emptyStartHint: ' Start your first one with "New consultation".',
    lockNoSubscription:
      'You need an active subscription to send messages. Tap "Account" to enter a code.',
    closedReadOnlyMessage:
      "This consultation is closed. You can read the history, but you can't send messages.",
  },
  chat: {
    emptyFirst: 'No messages yet. Write the first one.',
    inputPlaceholder: 'Write a message…',
    send: 'Send',
    attachLabel: 'Attach photo or file',
    takePhoto: 'Take photo',
    choosePhotos: 'Choose photos',
    sendFile: 'Send file',
    couldNotSendTitle: 'Could not send',
    noAccessTitle: 'No access',
    couldNotOpen: "Couldn't open.",
    tapToOpen: 'tap to open',
  },
  chatScreen: {
    conversation: 'Conversation',
    filesPrefix: (title) => `Files — ${title}`,
  },
  files: {
    empty: 'No files have been exchanged in this conversation yet.',
    sentByMe: 'Sent by me',
    received: 'Received',
  },
  subscription: {
    mySubscription: 'My subscription',
    active: 'ACTIVE',
    expired: 'EXPIRED',
    plan: 'Plan:',
    individual: 'Individual',
    family: 'Family',
    validity: 'Valid until:',
    daysLeft: (n) => `${n} days left.`,
    manageFamilyHint: 'Manage your family members on the home screen (chat list).',
    noSubscription: "You don't have an active subscription yet. Enter a code to activate one.",
    enterCode: 'Enter code',
    enterCodeHint:
      'Did you receive a code in a consultation or when purchasing on the website? Enter it here.',
    codeLabel: 'Code',
    redeem: 'Redeem code',
    activatedTitle: 'Subscription activated',
    activatedMsg: 'Your code was redeemed successfully.',
    couldNotRedeemTitle: 'Could not redeem',
  },
  addMember: {
    title: 'Add a family member',
    hint:
      'Create a profile for a family member (e.g. a child). Each member has their own chat with the therapist, to keep cases separate.',
    addButton: 'Add family member',
    missingNameTitle: 'Name required',
    missingNameMsg: "Enter the member's full name.",
    couldNotAddTitle: 'Could not add',
  },
  attachments: {
    noCameraAccess: 'No camera access. Enable the permission in your phone settings.',
    noPhotosAccess: 'No photo access. Enable the permission in your phone settings.',
  },
  age: {
    year: 'year',
    years: 'years',
    month: 'month',
    months: 'months',
    newborn: 'newborn',
  },
  guide: {
    title: 'How to use Tesed',
    subtitle: 'A quick, step-by-step guide.',
    steps: [
      {
        title: 'Create account',
        caption:
          'Open the app, tap “Create patient account” and fill in your details. Then confirm the email you receive to activate the account.',
      },
      {
        title: 'Activate your subscription',
        caption:
          'Tap “Account”, then “Enter code”. Type the code you received (with your purchase or in a consultation) to activate your subscription.',
      },
      {
        title: 'Start a consultation',
        caption:
          'On the home screen, tap “New consultation” to start talking to your therapist. You can only have one open consultation at a time.',
      },
      {
        title: 'Write and send',
        caption:
          'Type your message and tap “Send”. To send a photo or file, tap the “＋” on the left. You get a notification when the therapist replies.',
      },
      {
        title: 'Closed consultation',
        caption:
          'When the therapist closes a consultation, you can still read the history but not send messages. Open a new one whenever you need.',
      },
      {
        title: 'Family plan',
        caption:
          'On a family plan, choose whose consultation it is (you or a dependent) on the home screen. Each person has their own chat.',
      },
      {
        title: 'Add a member',
        caption:
          'Tap “＋ Add family member”, enter the name and date of birth. The new member then appears in your family list.',
      },
      {
        title: 'Change language',
        caption: 'Tap the “🌐” in the top corner to switch between Portuguese and English.',
      },
    ],
  },
  dates: {
    today: 'Today',
    yesterday: 'Yesterday',
  },
};
