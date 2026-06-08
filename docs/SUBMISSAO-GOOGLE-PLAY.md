# Submissão ao Google Play — Tesed (Android)

Guia para publicar a app, começando por **teste interno** (testadores convidados),
e depois promover a produção. Inclui checklist e textos prontos.

---

## Visão geral do percurso

```
1. Build .aab (EAS)  →  já feito/em curso
2. Criar a app na Play Console  →  ficha + dados obrigatórios
3. Carregar o .aab numa faixa de "Teste interno"
4. Convidar testadores (emails) → instalam pela Play Store
5. Validar (incl. notificações) → promover para Produção quando pronto
```

> Conta: **Google Play Console da Tesed** (já existe e autorizada).

---

## Parte A — Dados da app (ficha principal)

### Identificação
- **Nome da app (título na Play Store):** `Tesed Chat`
  > Define-se na Play Console (**Loja → Ficha principal → Nome da app**, máx. 30 car.)
  > — **não precisa de build novo**. O nome por baixo do ícone no telemóvel continua
  > "Tesed" (vem do build); só muda com um build novo, se quiserem alinhar.
- **Nome do pacote (package):** `pt.tesed.app` (já definido; **imutável** depois de publicado)
- **Categoria:** Medicina (ou Saúde e fitness)
- **Email de contacto:** [email de suporte da Tesed]
- **Website:** [URL do site Tesed]
- **Política de Privacidade (URL):** [obrigatório — publicar a política num URL público]

### Descrição curta (máx. 80 caracteres)
```
Fale com o seu terapeuta de forma simples e segura, sem nada se perder.
```

### Descrição completa (máx. 4000 caracteres) — rascunho
```
A Tesed liga-o ao seu terapeuta através de uma comunicação simples, organizada e
segura. Em vez de mensagens dispersas por vários canais, tem um único espaço onde
cada conversa tem um estado claro — para que nenhuma questão fique sem resposta.

PRINCIPAIS FUNCIONALIDADES
• Conversa direta com o seu terapeuta, a qualquer hora, de forma assíncrona.
• Estado claro de cada conversa: o terapeuta vê facilmente o que está por responder.
• Envio de ficheiros nos dois sentidos — partilhe exames e receba resultados e
  relatórios em segurança.
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

### Notas / informação de lançamento (release notes) — 1.ª versão
```
Primeira versão da Tesed: conversa com o seu terapeuta, envio de ficheiros, gestão
de família e notificações.
```

---

## Parte B — Recursos gráficos (assets)

| Recurso | Requisito | Estado |
|---|---|---|
| **Ícone da app** | 512×512 PNG | ✅ temos (`app/assets/icon.png` — exportar a 512) |
| **Gráfico de destaque** (feature graphic) | 1024×500 PNG/JPG | ⬜ a criar |
| **Screenshots telefone** | 2 a 8, mín. 320px lado menor | ⬜ a tirar |
| (Opcional) Screenshots tablet | — | ⬜ opcional |

> Screenshots: tirar da app a correr (ecrã de login com logótipo, conversa,
> caixa do médico, gestão de subscrição/família). Podemos gerá-los a partir do
> build instalado ou da versão web redimensionada para tamanho de telemóvel.

---

## Parte C — Questionários obrigatórios (Play Console)

A Play Console exige preencher, antes de publicar:

1. **Classificação de conteúdo** (content rating) — questionário; uma app de
   comunicação médica é tipicamente classificada para todos / 3+.
2. **Público-alvo e conteúdo** — destina-se a adultos (não é dirigida a crianças;
   os perfis de dependentes são geridos por um adulto titular).
3. **Data safety (Segurança dos dados)** — declarar que dados a app recolhe e
   porquê. Para o Tesed, declarar:
   - Recolhe: nome, email, telemóvel, data de nascimento, mensagens, ficheiros e
     **fotos** (tiradas com a câmara ou escolhidas da galeria — podem conter info
     de saúde), identificador para notificações.
   - **Fotos e vídeos / Câmara:** a app acede à câmara e às fotos **só** para o
     utilizador enviar imagens numa conversa (não percorre a galeria). Declarar
     na categoria "Fotos e vídeos".
   - Encriptado em trânsito: **sim**.
   - Partilha com terceiros: apenas subcontratantes necessários (alojamento UE).
   - O utilizador pode pedir eliminação dos dados: **sim** (direito RGPD).
4. **App de saúde** — o Google pode pedir uma declaração extra por ser app de
   saúde. Responder com base no funcionamento real (comunicação, não diagnóstico).
5. **Política de Privacidade (URL)** — colar o link público da política.

---

## Parte D — Teste interno (o nosso primeiro objetivo)

1. Na Play Console → app → **Testes → Teste interno**.
2. **Criar uma nova versão** → carregar o ficheiro **`.aab`** do EAS.
3. Adicionar a **lista de testadores** (emails — ex.: tu, o médico, equipa).
4. Guardar e publicar a faixa de teste.
5. Cada testador recebe um **link de adesão**; aceita e instala pela Play Store
   normalmente (já com push a funcionar — é um build real).

> Assim que isto estiver, testamos as **notificações** ponta a ponta (a parte que
> ficou pendente da Fase 7).

---

## Parte E — Submeter o .aab via EAS (alternativa)

Em vez de carregar o `.aab` à mão, o EAS pode submetê-lo automaticamente:
```powershell
eas submit --platform android --profile production
```
Requer uma **chave de conta de serviço Google** (JSON) com permissão na Play
Console. Configura-se uma vez. Posso guiar-te quando chegarmos a esse ponto — para
o primeiro teste interno, carregar o `.aab` à mão na consola também serve.

---

## Parte F — Promover para Produção (lançamento público)

Estado: o **vc10** (0.1.0, **já com a câmara/fotos**) está **Ativo** no Teste interno
e foi validado em dispositivo real. Não é preciso build novo — promove-se este.

1. Play Console → app → **Produção** → **Criar nova versão**.
2. Em vez de carregar um `.aab` novo, usar **"Adicionar do histórico de versões"**
   (ou *Promote release* a partir do Teste interno) e escolher o **vc10**.
   - Alternativa: carregar à mão o ficheiro `tesed-vc10.aab`.
3. **Notas da versão** (release notes) — ver Parte A (1.ª versão).
4. Antes de a Play Console deixar publicar em Produção, têm de estar **verdes**:
   - ✅ Ficha principal completa (nome **"Tesed Chat"**, descrições, ícone,
     feature graphic, **2–8 screenshots**).
   - ✅ **Política de Privacidade** num URL público (e indicada na consola).
   - ✅ **Classificação de conteúdo** (questionário).
   - ✅ **Público-alvo e conteúdo**.
   - ✅ **Data safety** — incluindo **Fotos e vídeos / Câmara** (ver Parte C).
   - ✅ Declaração de **app de saúde**, se pedida.
5. **Lançamento gradual (recomendado):** começar com *rollout* a 20–50% e subir,
   ou 100% se preferirem ir direto. Depois de submeter, fica **"Em análise"**
   (a 1.ª publicação em produção pode demorar dias na Google).
6. Quando a Google aprovar, a app fica **pública** na Play Store para toda a gente.

> ⚠️ Antes de abrir ao público: **limpar contas/conversas de teste** (ver
> `docs/PENDENTES-PRODUCAO.md`) para não deixar dados de teste à vista.

---

## Checklist rápida
- [ ] Build `.aab` concluído (EAS).
- [ ] App criada na Play Console (package `pt.tesed.app`).
- [ ] Política de Privacidade publicada num URL e indicada na consola.
- [ ] Ficha: nome, descrições, ícone, feature graphic, screenshots.
- [ ] Questionários: classificação, público-alvo, data safety, app de saúde.
- [ ] Faixa de **Teste interno** com o `.aab` + testadores.
- [ ] Testar instalação + notificações.
- [ ] (Depois) Promover para Produção.
