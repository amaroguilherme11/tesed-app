# Próximos Passos — Tesed (ponto de situação)

> **Para retomar:** numa conversa nova do Claude Code, abrir o projeto em
> `C:\Users\Amaro\Desktop\tesed` e dizer algo como *"continua o projeto Tesed,
> lê o docs/PROXIMOS-PASSOS.md"*. Tudo está commitado no Git (backup privado em
> github.com/amaroguilherme11/tesed-app) e documentado.

Última atualização: **2026-06-09** — app **submetida para revisão nas duas lojas**.

> 🚀 **MARCO (2026-06-09):** Tesed Chat submetida para revisão em **Google Play**
> (Produção, build vc10, rollout 100%) e **App Store** (versão 1.0, build iOS nº 5).
> A aguardar aprovação das duas plataformas (a 1.ª revisão pode demorar dias; apps de
> saúde podem ter escrutínio extra). Guias usados: `docs/SUBMISSAO-GOOGLE-PLAY.md` e
> `docs/SUBMISSAO-APP-STORE.md`. Quando aprovarem, ficam públicas (Google em
> publicação automática; App Store em "lançar automaticamente após aprovação").
>
> **Depois da aprovação:** confirmar instalação pública, limpar dados de teste se
> ainda não feito, e planear a 1.ª atualização (ver recomendações Google Play em
> `docs/PENDENTES-PRODUCAO.md` + subir Expo SDK).

---

## ✅ ESTADO ATUAL — Android funcional

A app Android está **completa e validada em teste interno** (Play Console):
- Fases 1–8 todas implementadas e testadas em dispositivo real.
- Identidade visual Tesed (cores #009EAB/#383837, fonte Quicksand, logótipo, ícone).
- Notificações push a funcionar (FCM configurado).
- Reset de password in-app + confirmação de email (deep links).
- Dashboard de pacientes, indicador de não-lidas (médico e paciente), multi-ficheiro.
- "Terapeuta" em vez de "médico" em todos os textos visíveis.
- SMTP da empresa (@tesed.pt) configurado no Supabase.
- Último build: **vc7** (versionCode 7).

**Infra ativa:**
- Supabase projeto `grahfijlwtdzildrpvgs` (Frankfurt/UE), migrações 0001–0018 aplicadas.
- Edge Functions deployed: `ifthenpay-callback`, `send-notification`.
- Plugin WordPress instalado; pagamentos Ifthenpay testados end-to-end.
- EAS (conta Expo `maromaro11`), projectId `8c51abfc-...`.

---

## 🟢 PUBLICAR ANDROID "A SÉRIO" (passar de teste interno → produção)

O que falta para a app sair do teste interno e ir para produção pública:

### Na Play Console
- [ ] Preencher a **ficha da loja** completa (textos prontos em
      `docs/SUBMISSAO-GOOGLE-PLAY.md`): descrição curta/completa, screenshots
      (tirar 2–8 do telemóvel), feature graphic (já temos em
      `app/assets/store/feature-graphic.png`), ícone 512 (temos).
- [ ] **Política de Privacidade** publicada num URL público (rascunho em
      `docs/POLITICA-PRIVACIDADE-RASCUNHO.md` — precisa de revisão jurídica).
- [ ] Questionários: **classificação de conteúdo**, **público-alvo**,
      **Data safety**, declaração de **app de saúde**.
- [ ] Promover a versão de **Teste interno → Produção** (ou abrir Teste fechado/aberto
      primeiro, se quiserem uma fase intermédia).

### Pendentes de produção (ver docs/PENDENTES-PRODUCAO.md)
- [ ] Confirmar que a **confirmação de email** está ON (já ativada).
- [ ] Limpar **dados/contas de teste** antes de abrir ao público.
- [ ] **Página web de reset de password** (funciona em PC; hoje é só in-app/telemóvel).
- [ ] Rever limites de email/SMTP para volume real.

---

## 🍎 PREPARAR O iOS (para amanhã)

Boa notícia: **o código é o mesmo** (React Native/Expo). Não há reescrita — a app
já corre em iOS. O trabalho é sobretudo de **contas, credenciais e build**.

### Pré-requisitos (decisões/contas)
- [ ] **Conta Apple Developer** da Tesed (99 USD/ano) — confirmar acesso (o
      utilizador disse que a empresa já tem contas autorizadas).
- [ ] Um **Mac**? — NÃO é obrigatório: o EAS compila iOS na nuvem. Mas para testar
      em iPhone via **TestFlight** é o caminho (não há "Expo Go iOS" para push real).

### O que vamos fazer (passos técnicos, com o Claude a guiar)
1. [ ] Confirmar `app.json` iOS: `bundleIdentifier: pt.tesed.app` (já está),
       `buildNumber`, permissões (notificações, etc.).
2. [ ] **Notificações iOS (APNs):** equivalente ao FCM do Android. O EAS gera a
       chave de push APNs com a conta Apple Developer (durante `eas credentials`
       ou o primeiro build iOS). Precisa de login Apple — feito SEMPRE pelo
       utilizador no terminal/browser, nunca partilhado.
3. [ ] `eas build --platform ios --profile production` → gera um `.ipa`.
       (Primeiro build pede/gera certificados e perfis de provisionamento via a
       conta Apple Developer — o EAS trata, com o login do utilizador.)
4. [ ] **App Store Connect:** criar a app (bundle `pt.tesed.app`), preencher ficha,
       carregar o `.ipa`, e distribuir via **TestFlight** (teste) → revisão Apple
       → produção.
5. [ ] Testar em iPhone via TestFlight: reset/confirmação de email (deep links
       `tesed://`), notificações push (APNs), teclado, UI.

### Pontos de atenção iOS
- **Deep links:** confirmar que o scheme `tesed://` funciona no iOS (associated
  domains podem ser precisos para Universal Links, mas o scheme custom deve bastar
  para o reset/confirmação como no Android).
- **Privacidade Apple:** a App Store exige o "App Privacy" (nutrition label) e é
  rigorosa com apps de saúde — declarar dados recolhidos (alinhar com a política).
- **Revisão Apple:** ~1–3 dias, mais exigente que a Google. Pode pedir conta de
  teste (demo) — preparar credenciais de um terapeuta + paciente de teste.
- **Teclado/safe-area:** já tratámos com KeyboardAvoidingView no iOS; validar em
  iPhone real (notch/Dynamic Island).

---

## 📌 Como retomar amanhã (resumo)
1. Conversa nova → "continua o Tesed em C:\Users\Amaro\Desktop\tesed, vamos ao iOS".
2. O Claude lê `CLAUDE.md` + este ficheiro.
3. Decidir: começar pelo **iOS** (precisa conta Apple) ou fechar a **publicação
   Android** primeiro.
4. Ferramentas já instaladas: Node, Git, Supabase CLI, EAS CLI, gh — tudo via
   `C:\Users\Amaro\AppData\Roaming\npm` e `C:\Users\Amaro\scoop\shims` no PATH.
