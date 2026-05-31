# Integração de Pagamentos (Fase 5) — Tesed

> Documento para **a empresa que gere o website + Ifthenpay** e para os diretores.
> Explica como, após um pagamento confirmado pelo Ifthenpay, é gerado o
> **código de subscrição** que o cliente resgata na app Tesed.

---

## 1. Visão geral do fluxo

```
1. Cliente escolhe um plano no WEBSITE e paga via Ifthenpay (MB WAY / Multibanco).
2. Ifthenpay confirma o pagamento ao SERVIDOR do website (callback Ifthenpay).
3. O servidor do website traduz a encomenda em (plano, meses) e chama
   o endpoint da Tesed (HTTPS + segredo).
4. A Tesed gera um código único (ex.: TESED-AB12-CD34) e devolve-o em JSON.
5. O website entrega o código ao cliente: página de sucesso + email.
6. O cliente abre a app Tesed → Subscrição → insere o código → subscrição ativa.
```

**Porque é que o servidor do website está no meio (passo 3)?**
O callback do Ifthenpay diz *"o pedido Nº 1234 de 49,90€ foi pago"* — **não diz**
"Plano Família 12 meses". Só o website sabe a que produto corresponde o pedido
1234. Por isso é o servidor do website que traduz e nos diz `plan` e `months`.

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

## 3. Configurar o Ifthenpay (lado da empresa)

A empresa precisa de uma conta Ifthenpay com os métodos pretendidos ativos
(**MB WAY** e/ou **Multibanco**), e respetivas chaves (MB WAY key, Entidade +
Subentidade para Multibanco). Estas chaves ficam **no servidor do website**, não
são partilhadas com a Tesed.

### 3.1 Callback de confirmação (anti-phishing)
No **backoffice do Ifthenpay**, em cada método de pagamento, configura-se:
- **URL de callback**: o endereço do **servidor do website** que recebe a
  confirmação (ex.: `https://www.<empresa>.pt/api/ifthenpay/callback`).
- **Chave anti-phishing**: um segredo que o Ifthenpay inclui no callback para o
  website confirmar que o pedido é legítimo.

O Ifthenpay chama esse URL (tipicamente **GET**) com parâmetros como:
```
?key=[CHAVE_ANTI_PHISHING]
&orderId=[REFERENCIA_DA_ENCOMENDA_DO_WEBSITE]
&amount=[VALOR]
&requestId=[ID_DO_PAGAMENTO_IFTHENPAY]
&payment_datetime=[DATA_HORA]
... (campos variam por método: entity, reference para Multibanco, etc.)
```

> ⚠️ Os nomes/conjunto exatos de parâmetros dependem do método e da versão da
> API Ifthenpay. A empresa deve confirmar no painel/documentação Ifthenpay
> deles. O essencial: o callback traz a **referência da encomenda** (`orderId`)
> e o **id do pagamento** (`requestId`), e a **chave anti-phishing** (`key`).

### 3.2 O que o servidor do website faz ao receber o callback
1. **Validar a chave anti-phishing** (`key`) — recusar se não bater.
2. Procurar a encomenda pelo `orderId` na base de dados do website.
3. Confirmar que o `amount` corresponde ao preço esperado desse produto
   (boa prática anti-fraude).
4. Traduzir o produto em `plan` e `months` (ver §5).
5. Chamar o endpoint da Tesed (§2) com:
   - `payment_ref` = o `requestId` do Ifthenpay (ou o `orderId`, desde que único).
   - `plan` e `months` do produto.
6. Receber o `code` e **entregá-lo ao cliente** (página de sucesso + email).
7. (Opcional) Guardar o `code` na encomenda, para reenvio/suporte.

---

## 4. `payment_ref` — qual usar?
Deve ser um identificador **único e estável** do pagamento, para a idempotência
funcionar. Recomendação, por ordem de preferência:
1. `requestId` do Ifthenpay (id único do pagamento).
2. Se não houver, o `orderId` da encomenda do website (desde que cada encomenda
   pague uma só vez).

Usar sempre o **mesmo** valor caso o callback se repita para o mesmo pagamento.

---

## 5. Mapeamento de produtos → (plan, months)
A empresa mantém esta correspondência (no website). Exemplo para os 6 produtos:

| Produto no website            | `plan`       | `months` |
|-------------------------------|--------------|----------|
| Individual — 3 meses          | `individual` | `3`      |
| Individual — 6 meses          | `individual` | `6`      |
| Individual — 12 meses         | `individual` | `12`     |
| Família — 3 meses             | `family`     | `3`      |
| Família — 6 meses             | `family`     | `6`      |
| Família — 12 meses            | `family`     | `12`     |

> Os **preços** de cada produto são definidos pela empresa (questão em aberto no
> projeto). A Tesed não precisa do preço — só de `plan` e `months`.

---

## 6. Exemplo de chamada (do servidor do website para a Tesed)

```bash
curl -X POST "https://<PROJETO>.supabase.co/functions/v1/ifthenpay-callback" \
  -H "Authorization: Bearer <SEGREDO_PARTILHADO>" \
  -H "content-type: application/json" \
  -d '{"payment_ref":"ITP-REQ-998877","plan":"family","months":12}'
```
Resposta:
```json
{ "ok": true, "code": "TESED-AB12-CD34", "plan": "family", "months": 12, "status": "active" }
```

Pseudocódigo (servidor do website, Node.js):
```js
// Dentro do handler do callback do Ifthenpay, JÁ depois de validar a key
// anti-phishing e de mapear o produto:
const r = await fetch(`${TESED_URL}/functions/v1/ifthenpay-callback`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${TESED_SHARED_SECRET}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ payment_ref: requestId, plan, months }),
});
const { code } = await r.json();
// mostrar `code` na página de sucesso + enviar por email ao cliente
```

---

## 7. Email ao cliente (sugestão de conteúdo)
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

**Empresa (website + Ifthenpay):**
- [ ] Conta Ifthenpay com MB WAY/Multibanco ativos.
- [ ] Configurar URL de callback + chave anti-phishing no backoffice Ifthenpay.
- [ ] No callback: validar `key`, confirmar `amount`, mapear produto → (plan, months).
- [ ] Chamar o endpoint Tesed com `payment_ref`, `plan`, `months`.
- [ ] Mostrar o código na página de sucesso + enviar por email.

**Teste conjunto:**
- [ ] Pagamento de teste (ambiente de testes Ifthenpay) → callback → código gerado.
- [ ] Resgatar o código na app → subscrição ativa.
- [ ] Repetir o callback (mesma `payment_ref`) → mesmo código (idempotência).

---

## 9. Segurança e RGPD
- Endpoint alojado na **UE** (Supabase).
- A Tesed **não** recebe dados de pagamento/cartão — só a confirmação.
- Comunicação sempre **HTTPS**.
- Segredo partilhado tratado como password (rotação possível a pedido).
- Só uma chamada **autenticada** (segredo) pode gerar um código pago — o código
  nunca é gerado no browser/cliente (regra de segurança central do projeto).
