# Integração de Pagamentos (Fase 5) — Tesed

> Documento para **a empresa que gere o website + Ifthenpay** e para os diretores.
> Explica como, após um pagamento confirmado pelo Ifthenpay, é gerado o
> **código de subscrição** que o cliente resgata na app Tesed.

> **Contexto:** o website é **WordPress + WooCommerce** e **já** tem o fluxo de
> pagamento WooCommerce ↔ Ifthenpay a funcionar. **NÃO mexemos nesse fluxo.**
> A integração com a app faz-se através de um **plugin WordPress** que fornecemos
> (`website/wordpress-plugin/`), que apenas reage *depois* do pagamento concluído.
> Para a via genérica (sem WooCommerce), ver o Anexo A.

---

## 1. Visão geral do fluxo (WooCommerce)

```
[JÁ EXISTE] Cliente compra no WooCommerce e paga via Ifthenpay (MB WAY/Multibanco).
[JÁ EXISTE] Ifthenpay confirma → WooCommerce marca a encomenda como PAGA.
[NOVO]      O plugin Tesed reage ao gancho "pagamento concluído":
            - lê o SKU de cada produto comprado → deduz (plano, meses);
            - chama o endpoint da Tesed (HTTPS + segredo);
            - recebe o código e mostra-o na página de obrigado + email.
[APP]       O cliente abre a app Tesed → Subscrição → insere o código → ativa.
```

O **plugin não altera** o checkout nem o callback Ifthenpay já existentes —
encaixa-se apenas no momento em que a encomenda fica paga (ganchos padrão do
WooCommerce: `woocommerce_payment_complete` / `order_status_completed`).

A Tesed **nunca** processa pagamentos nem recebe dados de cartão — só a
confirmação de que um pagamento aconteceu, e devolve um código.

---

## 2. O endpoint da Tesed

```
POST https://<PROJETO>.supabase.co/functions/v1/ifthenpay-callback
```
(URL exato fornecido pela equipa Tesed após o deploy.)

### Autenticação — segredo partilhado
Em cada chamada, enviar no cabeçalho:
```
Authorization: Bearer <SEGREDO_PARTILHADO>
```
Sem o segredo correto → `401`. O segredo é combinado entre Tesed e empresa e
entregue de forma segura (não em email aberto).

### Corpo do pedido (JSON)
| Campo         | Obrigatório | Valores                   | Descrição |
|---------------|-------------|---------------------------|-----------|
| `payment_ref` | sim         | texto único               | Referência única do pagamento (ver §4). Garante que o mesmo pagamento nunca gera 2 códigos. |
| `plan`        | sim         | `individual` \| `family`  | Tipo de plano comprado. |
| `months`      | sim         | `3` \| `6` \| `12`        | Duração da subscrição. |

Exemplo:
```json
{ "payment_ref": "ITP-REQ-998877", "plan": "family", "months": 12 }
```

### Resposta
Sucesso (`200`):
```json
{ "ok": true, "code": "TESED-AB12-CD34", "plan": "family", "months": 12, "status": "active" }
```
Erros: `401` (segredo inválido), `400` (parâmetros em falta/ inválidos).

### Idempotência
Se a mesma `payment_ref` chegar mais do que uma vez (o Ifthenpay **repete**
callbacks até receber confirmação), a Tesed devolve **sempre o mesmo código**,
sem criar outro. A empresa pode repetir a chamada com segurança.

---

## 3. Instalar e configurar o plugin (lado do website)

O fluxo Ifthenpay↔WooCommerce **já existe e não se altera**. Só é preciso
instalar o plugin que faz a ponte para a app.

1. **Instalar o plugin** `website/wordpress-plugin/` (ver o README dessa pasta):
   copiar para `wp-content/plugins/` ou instalar via ZIP, e **ativar**.
2. **Configurar** em **Definições → Tesed Subscrições**:
   - **URL do endpoint Tesed** (fornecido pela equipa Tesed após o deploy).
   - **Segredo partilhado** (fornecido pela equipa Tesed, em canal seguro).
3. **Definir os SKU** dos produtos de subscrição (ver §5).

O plugin trata de tudo o resto: reage ao pagamento concluído, gera o código,
mostra-o na página de obrigado e inclui-o no email do WooCommerce ao cliente.

---

## 4. `payment_ref` (idempotência) — tratado pelo plugin
O plugin usa uma referência única e estável por linha de encomenda
(`wc_<encomenda>_<item>_<n>`). Se o WooCommerce reprocessar a encomenda, a Tesed
devolve o **mesmo** código (não duplica). Não é preciso configurar nada.

---

## 5. Mapeamento de produtos → (plan, months) por SKU
Definir o **SKU** de cada produto de subscrição no WooCommerce
(**Produto → Inventário → SKU**):

| Produto no website     | SKU             | `plan`       | `months` |
|------------------------|-----------------|--------------|----------|
| Individual — 3 meses   | `TESED-IND-03`  | `individual` | `3`      |
| Individual — 6 meses   | `TESED-IND-06`  | `individual` | `6`      |
| Individual — 12 meses  | `TESED-IND-12`  | `individual` | `12`     |
| Família — 3 meses      | `TESED-FAM-03`  | `family`     | `3`      |
| Família — 6 meses      | `TESED-FAM-06`  | `family`     | `6`      |
| Família — 12 meses     | `TESED-FAM-12`  | `family`     | `12`     |

Produtos sem um destes SKU são ignorados (não geram código). Os **preços** são
definidos pela empresa; a Tesed não precisa do preço — só de `plan` e `months`.

---

## 6. Endpoint da Tesed (referência técnica)

O plugin chama, por baixo, este endpoint (não é preciso fazê-lo à mão):

```bash
curl -X POST "https://<PROJETO>.supabase.co/functions/v1/ifthenpay-callback" \
  -H "Authorization: Bearer <SEGREDO_PARTILHADO>" \
  -H "content-type: application/json" \
  -d '{"payment_ref":"wc_1234_56_0","plan":"family","months":12}'
```
Resposta:
```json
{ "ok": true, "code": "TESED-AB12-CD34", "plan": "family", "months": 12, "status": "active" }
```

---

## 7. Email ao cliente
O plugin inclui automaticamente o código no **email de encomenda concluída** do
WooCommerce (e na página de "Obrigado"). Não é preciso configurar emails à parte
— usa o sistema de emails que o site já tem. Conteúdo (sugestão):
> Assunto: O seu código de subscrição Tesed
>
> Olá! O seu pagamento foi confirmado. O seu código de subscrição é:
>
> **TESED-AB12-CD34**
>
> Para ativar: abra a app Tesed → **Subscrição** → **Inserir código** → escreva
> o código acima. Em caso de dúvida, responda a este email.

(O envio do email é da responsabilidade do website. Pode usar o serviço de email
que a empresa já utiliza.)

---

## 8. Checklist de integração (resumo)

**Tesed (nós):**
- [ ] Aplicar migração `0014_paid_codes.sql`.
- [ ] Definir o segredo: `supabase secrets set TESED_PAYMENT_SECRET=...`.
- [ ] `supabase functions deploy ifthenpay-callback`.
- [ ] Entregar à empresa: URL do endpoint + segredo partilhado (em canal seguro).

**Empresa (WordPress/WooCommerce):**
- [ ] Confirmar que o fluxo Ifthenpay↔WooCommerce já funciona (já existe).
- [ ] Instalar e ativar o plugin `website/wordpress-plugin/`.
- [ ] Preencher URL do endpoint + segredo em **Definições → Tesed Subscrições**.
- [ ] Definir os SKU dos 6 produtos (§5).

**Teste conjunto (ambiente de testes Ifthenpay):**
- [ ] Compra de teste → encomenda paga → código aparece na página de obrigado.
- [ ] Email de encomenda concluída inclui o código.
- [ ] Resgatar o código na app → subscrição ativa.
- [ ] Reprocessar a encomenda → mesmo código (idempotência).

---

## 9. Segurança e RGPD
- Endpoint alojado na **UE** (Supabase).
- A Tesed **não** recebe dados de pagamento/cartão — só a confirmação.
- Comunicação sempre **HTTPS**.
- Segredo partilhado tratado como password (rotação possível a pedido).
- Só uma chamada **autenticada** (segredo) pode gerar um código pago — o código
  nunca é gerado no browser/cliente (regra de segurança central do projeto).

---

## Anexo A — Integração genérica (sem WooCommerce)
Se algum fluxo não passar pelo WooCommerce, o endpoint pode ser chamado
diretamente a partir de qualquer servidor (ver §6), desde que se envie
`payment_ref` (único), `plan` e `months`, com o segredo no cabeçalho
`Authorization: Bearer`. O servidor que chama é responsável por validar o
pagamento antes de chamar.
