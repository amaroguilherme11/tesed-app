# Capturas do guia de utilização (paciente)

Guarda aqui as 8 capturas, com **estes nomes exatos** (a ordem segue os passos
do guia em `app/src/i18n/strings.ts` → `guide.steps`):

| Ficheiro | Passo | Captura a usar |
|---|---|---|
| `guia-1.png` | 1. Criar conta | ecrã "Criar conta de paciente" (formulário) |
| `guia-2.png` | 2. Ativar a subscrição | ecrã "Subscrição" com "Inserir código" |
| `guia-3.png` | 3. Abrir uma consulta | lista de consultas com o botão "Nova consulta" |
| `guia-4.png` | 4. Escrever e enviar | o chat aberto (caixa de mensagem + Enviar + ＋) |
| `guia-5.png` | 5. Consulta fechada | consulta "Fechada · só leitura" |
| `guia-6.png` | 6. Plano família | lista de membros da família (Eu + dependentes) |
| `guia-7.png` | 7. Adicionar um membro | ecrã "Adicionar membro da família" |
| `guia-8.png` | 8. Trocar de idioma | ecrã com o botão 🌐 no topo (ex.: app em EN) |

Depois de as guardares aqui, em `app/src/screens/patient/GuideScreen.tsx`,
no array `GUIDE_IMAGES`, tira o `null, //` de cada linha para ficar só o
`require('../../../assets/guide/guia-N.png'),` correspondente.

> Um só conjunto (em PT) serve para as duas línguas — só as legendas mudam.
> São capturas verticais (telemóvel).
