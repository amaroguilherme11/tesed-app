# Submissão à App Store — Tesed (iOS)

Guia para publicar a app na App Store, espelhando o que foi feito para a Google Play
(`docs/SUBMISSAO-GOOGLE-PLAY.md`). Inclui textos prontos e respostas aos questionários.

> App: **Tesed Chat** · Bundle: `pt.tesed.app` · Conta Apple Developer da Tesed.
> Build na nuvem via **EAS** (não é preciso Mac). Conta Expo `maromaro11`.

---

## Estado do build — build 5 já está no TestFlight (com câmara)

O build iOS **nº 5** está no **TestFlight** e **inclui a câmara/envio de fotos**
(foi compilado a partir da working tree com esse código, antes do commit `079866e`;
por isso o EAS etiquetou-o com o commit anterior `5bc81d3`, mas o binário tem a função).
O código da câmara está commitado no repositório (commit `079866e`).

➡️ **Não é preciso build novo.** Como a build 5 já está no TestFlight, já está na
App Store Connect — basta selecioná-la na versão da App Store e submeter para revisão.

> Build de referência (EAS): nº 5 · `.ipa` `bde002f8-b517-4d41-b63c-d19c901d14ce`.
> (Só fazer build novo se, no futuro, quisermos subir alterações posteriores ao `079866e`.)

---

## Parte A — Build no TestFlight (já feito)

A build 5 já foi enviada para a App Store Connect e está no TestFlight. Confirmar que
está **"processada"** (não "a processar") e testá-la em iPhone real antes da revisão.

> Para uma submissão futura (build novo), o fluxo seria, a partir de `app/`:
> `eas build --platform ios --profile production` → `eas submit --platform ios --latest`.
> O login Apple é **sempre** feito pelo utilizador — nunca partilhado.

---

## Parte B — Ficha da App Store Connect (metadados)

### Identificação
- **Nome (máx. 30):** `Tesed Chat`
- **Subtítulo (máx. 30):** `Fale com o seu terapeuta`
- **Categoria principal:** Medicina · **Secundária (opcional):** Saúde e fitness
- **URL de privacidade (obrigatório):**
  `https://www.tesed.pt/tesed-chat-politica-de-privacidade/`
- **URL de suporte (obrigatório):** `https://www.tesed.pt` (ou página de contacto)
- **URL de marketing (opcional):** `https://www.tesed.pt`

### Texto promocional (máx. 170 — pode mudar a qualquer momento)
```
Comunique com o seu terapeuta de forma simples, organizada e segura. Cada conversa
tem um estado claro, para que nenhuma questão fique sem resposta.
```

### Descrição (máx. 4000) — reaproveitada da Google Play
```
A Tesed liga-o ao seu terapeuta através de uma comunicação simples, organizada e
segura. Em vez de mensagens dispersas por vários canais, tem um único espaço onde
cada conversa tem um estado claro — para que nenhuma questão fique sem resposta.

PRINCIPAIS FUNCIONALIDADES
• Conversa direta com o seu terapeuta, a qualquer hora, de forma assíncrona.
• Estado claro de cada conversa: o terapeuta vê facilmente o que está por responder.
• Envio de ficheiros e fotos nos dois sentidos — partilhe exames e receba resultados
  e relatórios em segurança.
• Plano família: faça a gestão de perfis dos seus dependentes (ex.: filhos), cada
  um com o seu próprio histórico de conversa.
• Notificações de novas mensagens, para não perder nenhuma resposta.

SEGURANÇA E PRIVACIDADE
• Dados alojados na União Europeia, em conformidade com o RGPD.
• Comunicações encriptadas e acesso restrito aos seus dados.
• Consentimento explícito no registo; os seus dados de saúde são tratados como
  categoria especial.

COMO FUNCIONA A SUBSCRIÇÃO
A subscrição é adquirida no website da Tesed. Depois da compra, recebe um código
que ativa o serviço na app — basta inseri-lo no ecrã de Gestão.

A Tesed não substitui o atendimento de urgência. Em caso de emergência, contacte
os serviços de emergência (112).
```

### Palavras-chave (máx. 100 caracteres, separadas por vírgula)
```
terapeuta,saude,mensagens,consulta,terapia,paciente,clinica,bem-estar,psicologo,exames
```

### Novidades desta versão (release notes)
```
Primeira versão da Tesed: conversa com o seu terapeuta, envio de ficheiros e fotos,
gestão de família e notificações.
```

---

## Parte C — Recursos gráficos (App Store)

| Recurso | Requisito | Estado |
|---|---|---|
| Ícone | 1024×1024 PNG (sem alfa/transparência) | ⬜ exportar de `app/assets/store/icon-512.png` para 1024, **sem canal alfa** |
| Screenshots iPhone 6.7" | obrigatório, 2–10 (ex.: 1290×2796) | ⬜ tirar de um iPhone (TestFlight) |
| Screenshots iPhone 6.5" | recomendado | ⬜ |
| Screenshots iPad | só se `supportsTablet` (está `true`) | ⬜ (ou desligar suporte iPad) |

> Nota: o ícone da App Store **não pode ter transparência**. Os screenshots têm
> tamanhos fixos por dispositivo — tirar a partir do iPhone com a app do TestFlight.
> Como `supportsTablet: true`, a Apple pode exigir screenshots de iPad — alternativa:
> mudar para `supportsTablet: false` num build futuro se não quisermos suportar iPad.

---

## Parte D — App Privacy ("nutrition label")

Espelha a "Data safety" da Google Play. Em **App Store Connect → Privacidade da app**:

**Recolhe dados?** Sim.

| Tipo de dado (Apple) | Recolhido | Associado ao utilizador | Tracking | Finalidade |
|---|---|---|---|---|
| Nome | ✅ | ✅ | ❌ | Funcionalidade da app |
| Email | ✅ | ✅ | ❌ | Funcionalidade da app |
| Número de telefone | ✅ | ✅ | ❌ | Funcionalidade da app |
| Outros dados do utilizador (data de nascimento) | ✅ | ✅ | ❌ | Funcionalidade da app |
| Conteúdo do utilizador — mensagens, fotos, ficheiros | ✅ | ✅ | ❌ | Funcionalidade da app |
| ID do dispositivo (notificações push) | ✅ | ✅ | ❌ | Funcionalidade da app |

- **Tracking (rastreio entre apps/sites):** ❌ NÃO (não há publicidade nem analytics).
- **Dados de saúde:** as mensagens/fotos podem conter informação de saúde. Declarar
  em "Conteúdo do utilizador" (não usamos HealthKit). Se a Apple oferecer "Dados
  sensíveis", assinalar honestamente que conteúdo trocado pode incluir info de saúde.
- Tudo com finalidade **Funcionalidade da app** (não "Análise", não "Publicidade").

---

## Parte E — Classificação etária (Age Rating)

Responder ao questionário **com honestidade** (a app é comunicação, não fornece
diagnósticos nem conteúdo médico/maduro):
- Violência, conteúdo sexual, linguagem, jogo, etc. → **Nenhum**.
- "Informação médica/tratamento" → a app **não fornece** informação de tratamento
  nem diagnóstico; é um canal de mensagens. Responder em conformidade.
- Resultado provável: classificação baixa. Se a Apple atribuir 17+ por ser app
  médica, é aceitável — não bloqueia.

---

## Parte F — Conformidade de exportação (encriptação)

- No `app/app.json` já está `ITSAppUsesNonExemptEncryption: false`.
- Isto faz a App Store Connect tratar a app como **isenta** (usa só HTTPS padrão) —
  **não** é preciso submeter documentação de encriptação. Confirmar que a pergunta
  de "Export Compliance" fica resolvida automaticamente.

---

## Parte G — Informação para a Revisão da Apple (App Review Information)

A app exige **login** → tens de dar uma **conta de demonstração** (a mesma da Google):
```
Sign-in required: YES

Demo account
  Email:    demo.review@example.com
  Password: TesedReview!2026   (ou a que definiste no script)

Notes:
- App de comunicação assincrona entre pacientes e um terapeuta (telessaude).
- Conta de paciente com subscricao ativa: permite enviar mensagens, fotos
  (camara e galeria) e ficheiros na conversa com o terapeuta.
- O "terapeuta" e uma conta interna unica, nao disponivel no registo publico.
- Nao substitui atendimento de urgencia (a propria app indica o 112).
```
- **Contact info:** nome, email e telefone de quem responde à Apple (a empresa).

> A conta demo é criada/reposta com `supabase/scripts/create-review-account.mjs`
> (já usada na Google Play). Confirmar que continua ativa após a limpeza de dados.

---

## Parte H — Submeter para revisão

1. App Store Connect → a versão **1.0** → selecionar o **build** (nº 5, o do TestFlight).
2. Preencher tudo o acima (ficha, screenshots, privacidade, classificação, revisão).
3. **Preço:** Gratuita (a subscrição é vendida no website, fora da app — sem compras
   in-app, regra nº 3 da arquitetura).
4. **"Add for Review" → "Submit for Review"**.
5. Estado: **Waiting for Review** → **In Review** → (aprovado) **Ready for Sale**.
   Revisão Apple ~1–3 dias; apps de saúde podem ter escrutínio extra.

---

## Checklist rápida (iOS)
- [x] Build iOS no TestFlight (nº 5, **com câmara/fotos**).
- [ ] Confirmar build "processada" no TestFlight e testar em iPhone real.
- [ ] App criada na App Store Connect (`pt.tesed.app`).
- [ ] Ficha: nome, subtítulo, descrição, keywords, URLs (privacidade + suporte).
- [ ] Ícone 1024 (sem alfa) + screenshots iPhone (e iPad se mantiver suporte).
- [ ] App Privacy preenchido (alinhado com a política e com a Data safety).
- [ ] Classificação etária + Export compliance (isento).
- [ ] App Review Information com a conta demo.
- [ ] Preço = Gratuita, sem compras in-app.
- [ ] Submeter para revisão.

---

## Pontos de atenção iOS (do PROXIMOS-PASSOS.md)
- **Deep links** `tesed://` (reset/confirmação de email) — validar em iPhone real.
- **Notificações APNs** — o EAS gera a chave de push com a conta Apple; testar push.
- **Teclado/safe-area** — já tratado com KeyboardAvoidingView; validar em notch/Dynamic Island.
- **Sem compras in-app** — garantir que não há nada que a Apple interprete como tal
  (só resgate de código); caso contrário, a Apple exige In-App Purchase (a evitar).
