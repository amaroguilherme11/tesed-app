# Versão Web — Tesed (mesma app, alvo web)

A app é **Expo (React Native)**, por isso a versão web sai do **mesmo código** via
`react-native-web` — não há reescrita. Alojamento escolhido: **EAS Hosting**, num
subdomínio **`app.tesed.pt`** (continua a ser "a Tesed" para o utilizador, mas é
independente do WordPress do site principal).

> ✅ Verificado localmente: o export web compila e a app **renderiza** (ecrã de login
> com a marca Tesed, numa coluna central tipo telemóvel no desktop).

---

## O que foi adaptado para web (já feito)

| Ficheiro | Mudança |
|---|---|
| `app/src/lib/supabase.ts` | `detectSessionInUrl: Platform.OS === 'web'` — em web, o supabase-js processa os tokens que vêm no URL (confirmação de email / reset de password abrem no browser). Em mobile continua `false` (deep link `tesed://` tratado à mão). |
| `app/src/contexts/AuthContext.tsx` | O tratamento manual de deep link (`Linking`) passa a ser **só mobile**; em web o `PASSWORD_RECOVERY` chega via `onAuthStateChange`. |
| `app/src/lib/notifications.ts` | `setNotificationHandler` **não** corre em web (push desligado na web). `registerForPush` já tinha guard de web. |
| `app/App.tsx` | `AppFrame`: em web, centra a app numa **coluna de largura máx. 480px** sobre fundo neutro (não estica feio no desktop). Em iOS/Android é passthrough. |
| `app/app.json` | `web.output: "single"` (SPA) + `bundler: "metro"` — certo para React Navigation e para o EAS Hosting servir o routing. |

**Mantido na web:** envio de ficheiros/fotos (input do browser), Realtime, auth, chat.
**Desligado na web:** notificações push (o browser não as suporta como o nativo).

> Aviso benigno conhecido em web: `[expo-notifications] Listening to push token
> changes is not yet fully supported on web` — vem de dentro do módulo, "não tem
> efeito". Confirma só que o push está inerte. Não é erro.

---

## Build + pré-visualização local

```powershell
cd app
npm run web                       # abre em http://localhost:8081 (dev)
# ou gerar o build estático:
npx expo export --platform web    # gera a pasta app/dist (SPA)
```
> O `expo export` lê o `app/.env` e embebe `EXPO_PUBLIC_SUPABASE_URL` /
> `EXPO_PUBLIC_SUPABASE_ANON_KEY` (a anon é **pública**, pode ir no bundle web).

(Há também `.claude/launch.json` com o servidor "tesed-web" para o preview do Claude.)

---

## Deploy no EAS Hosting

```powershell
cd app
npx expo export --platform web    # 1) gera app/dist
eas deploy                        # 2) publica (dá um URL *.expo.app de pré-visualização)
eas deploy --prod                 # 3) promove para o alias de produção
```
- Login Apple/Expo é teu (já estás autenticado como `maromaro11`).
- O EAS Hosting trata de HTTPS e do fallback SPA (qualquer rota → index.html).

### Domínio próprio `app.tesed.pt`
1. Painel Expo → **Hosting** → projeto `tesed` → **Custom domain** → adicionar `app.tesed.pt`.
2. No DNS de `tesed.pt`, criar o **CNAME** que o Expo indicar.
3. Aguardar propagação + emissão do certificado.

---

## Configuração no Supabase (necessária para auth em web)

Painel Supabase → **Authentication → URL Configuration → Redirect URLs**, acrescentar
o URL web (além dos `tesed://` já existentes):
```
https://app.tesed.pt
https://app.tesed.pt/**
```
> (Para testar no URL de pré-visualização, juntar também `https://*.expo.app/**`.)

Sem isto, o Supabase recusa o `redirectTo` da web e os links de confirmação/reset
não estabelecem sessão no browser.

---

## Ligar a partir do site principal
No `tesed.pt` (WordPress), adicionar um botão **"Aceder à app"** → `https://app.tesed.pt`.
Assim o utilizador chega à app web a partir do site, sem fricção.

---

## Pendente / a polir (não bloqueia)
- Testar em web os fluxos completos: registo (confirmação de email no browser),
  reset de password, envio de ficheiros/fotos, chat em tempo real.
- Responsivo: a coluna 480px funciona; afinar se quiserem um layout "largo" dedicado
  a desktop (opcional).
- Quando `app.tesed.pt` estiver ativo, **a página web de reset de password autónoma
  deixa de ser necessária** — os ecrãs de reset da própria app web tratam disso.
