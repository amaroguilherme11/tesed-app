# Política de Privacidade — Tesed (RASCUNHO)

> ⚠️ **RASCUNHO — requer revisão jurídica antes de publicar.** Este texto é um
> ponto de partida técnico, alinhado com o funcionamento real da app, mas deve
> ser validado por um(a) advogado(a)/DPO, sobretudo por tratar **dados de saúde**
> (categoria especial — RGPD art.º 9). Substituir os campos `[...]`.

**Última atualização:** [DATA]
**Responsável pelo tratamento:** [NOME LEGAL DA EMPRESA TESED], [MORADA], NIF [...].
**Contacto de privacidade / DPO:** [email] · [telefone].

## 1. Quem somos e âmbito
A Tesed ("nós") disponibiliza uma aplicação móvel de **comunicação assíncrona
entre paciente e médico**. Esta política explica que dados pessoais recolhemos,
porquê, como os protegemos e que direitos tem.

## 2. Que dados recolhemos
- **Dados de conta:** nome, email, data de nascimento, número de telemóvel.
- **Perfis de dependentes (plano família):** nome e data de nascimento de
  familiares que o titular adicione (sem conta própria).
- **Conteúdo das conversas:** mensagens e **ficheiros/anexos** que troca com o
  médico (que podem conter **dados de saúde** — exames, relatórios, etc.).
- **Dados técnicos:** identificador de dispositivo para notificações (token
  push), registos técnicos mínimos de funcionamento.
- **Não recolhemos** dados de pagamento na app: a compra de subscrições é feita
  no website e a app apenas recebe um código de ativação.

## 3. Para que usamos os dados (finalidades e fundamento)
- **Prestar o serviço de comunicação médico-paciente** — execução do contrato.
- **Tratamento de dados de saúde** — com base no seu **consentimento explícito**
  (recolhido no registo) e para finalidades de prestação de cuidados.
- **Notificações** de novas mensagens — execução do serviço.
- **Gestão de subscrições** (ativação por código) — execução do contrato.
- **Segurança e prevenção de abuso** — interesse legítimo.

## 4. Consentimento
No registo, é pedido **consentimento explícito** para o tratamento dos dados,
incluindo dados de saúde. Pode retirar o consentimento a qualquer momento
(ver Direitos), o que implicará a cessação do serviço.

## 5. Onde e como guardamos (segurança)
- Os dados são alojados em infraestrutura na **União Europeia** (Supabase,
  região UE), em conformidade com o RGPD.
- Comunicações **encriptadas em trânsito** (HTTPS/TLS).
- **Controlo de acesso** rigoroso: cada paciente só acede aos seus dados; o
  acesso clínico é limitado ao médico responsável (regras de segurança ao nível
  da base de dados).
- As passwords são guardadas apenas como **hash irreversível** — ninguém,
  incluindo a Tesed, consegue vê-las.

## 6. Com quem partilhamos
- **Médico** destinatário da comunicação (é a finalidade do serviço).
- **Subcontratantes** estritamente necessários ao funcionamento:
  - **Supabase** (alojamento de base de dados/ficheiros, UE);
  - serviço de **notificações push** (Expo/Apple/Google) — recebe apenas o
    necessário para entregar a notificação;
  - **[gateway de pagamento / website]** — apenas no contexto da compra (fora da app).
- **Não vendemos** dados pessoais. Não há publicidade.

## 7. Prazo de conservação
Conservamos os dados enquanto a conta estiver ativa e pelo período legalmente
exigível para dados clínicos [definir prazo conforme legislação aplicável].
Após esse período, os dados são eliminados ou anonimizados.

## 8. Os seus direitos (RGPD)
Tem direito a: **acesso, retificação, apagamento ("direito a ser esquecido"),
limitação, oposição e portabilidade**. Para exercer, contacte [email de privacidade].
Tem ainda o direito de reclamar junto da **CNPD** (autoridade portuguesa de
proteção de dados).

## 9. Menores
A app permite que um titular adulto crie **perfis de dependentes** (ex.: filhos).
O titular declara ter autoridade parental/legal para fornecer esses dados e
consente o respetivo tratamento.

## 10. Notificações
Pode desativar as notificações nas definições do dispositivo a qualquer momento.

## 11. Alterações a esta política
Podemos atualizar esta política; alterações materiais serão comunicadas na app
ou por email.

## 12. Contacto
[NOME DA EMPRESA] · [morada] · [email de privacidade] · [telefone].

---
### Checklist antes de publicar
- [ ] Preencher todos os campos `[...]`.
- [ ] Revisão jurídica (dados de saúde = categoria especial).
- [ ] Definir prazos de conservação conforme a lei aplicável a registos clínicos.
- [ ] Publicar num **URL público** (ex.: no website Tesed) — necessário para as lojas.
- [ ] Indicar esse URL na App Store Connect e na Google Play Console.
