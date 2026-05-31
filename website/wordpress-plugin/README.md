# Plugin WordPress — Tesed Ponte de Subscrições

Liga o **WooCommerce** (que já processa os pagamentos via Ifthenpay) à **app
Tesed**: quando uma encomenda é paga, gera o código de subscrição e entrega-o ao
cliente (página de obrigado + email).

> **Não altera o pagamento nem o callback do Ifthenpay.** Encaixa *depois* do
> pagamento confirmado, nos ganchos que o WooCommerce já dispara.

## O que faz

1. Engata em `woocommerce_payment_complete` (e `completed`/`processing` como rede
   de segurança).
2. Para cada item da encomenda, lê o **SKU** do produto e deduz `plan` + `months`.
3. Chama o endpoint da Tesed (Edge Function) com um **segredo partilhado**.
4. Guarda o(s) código(s) na encomenda, mostra-os na página de obrigado e inclui-os
   no email ao cliente.

Idempotência dupla: localmente (marca `_tesed_codes_generated`) e no servidor
(cada `payment_ref` gera no máximo um código) — encomendas reprocessadas não
geram códigos a mais.

## Instalação

1. Copiar a pasta `tesed-ifthenpay-bridge` (com o `.php`) para
   `wp-content/plugins/` do WordPress — ou criar um ZIP do ficheiro e instalar em
   **Plugins → Adicionar novo → Enviar plugin**.
2. Ativar o plugin **"Tesed — Ponte de Subscrições"**.
3. Ir a **Definições → Tesed Subscrições** e preencher:
   - **URL do endpoint Tesed** (fornecido pela equipa Tesed após o deploy).
   - **Segredo partilhado** (fornecido pela equipa Tesed, em canal seguro).

## Configurar os produtos (SKU)

Definir o **SKU** de cada produto de subscrição no WooCommerce
(**Produto → Inventário → SKU**):

| Produto                | SKU             | plan / months |
|------------------------|-----------------|---------------|
| Individual — 3 meses   | `TESED-IND-03`  | individual / 3  |
| Individual — 6 meses   | `TESED-IND-06`  | individual / 6  |
| Individual — 12 meses  | `TESED-IND-12`  | individual / 12 |
| Família — 3 meses      | `TESED-FAM-03`  | family / 3      |
| Família — 6 meses      | `TESED-FAM-06`  | family / 6      |
| Família — 12 meses     | `TESED-FAM-12`  | family / 12     |

Produtos sem um destes SKU são ignorados (não geram código).
(O plugin aceita também os SKU sem zero à frente, ex.: `TESED-IND-3`.)

## Teste (ambiente de testes)

1. Garantir que o endpoint Tesed está em funcionamento e o segredo está definido
   dos dois lados.
2. Fazer uma **compra de teste** com o Ifthenpay em modo de testes.
3. Após o pagamento, confirmar:
   - A página de "Obrigado" mostra o código `TESED-XXXX-XXXX`.
   - O email de encomenda concluída inclui o código.
   - Em **WooCommerce → Encomendas**, a nota da encomenda regista o código.
4. Resgatar o código na app (Subscrição → Inserir código) → subscrição ativa.
5. Reprocessar a encomenda (ex.: mudar estado e voltar) → **não** gera código novo.

## Notas

- O envio de email usa o sistema de emails do próprio WooCommerce (já configurado
  no site). Os códigos vão no email de "encomenda concluída" ao cliente.
- A correspondência produto→plano vive nos SKU; gerir é tão simples como editar o
  SKU do produto.
- Toda a comunicação com a Tesed é HTTPS e autenticada por segredo.
