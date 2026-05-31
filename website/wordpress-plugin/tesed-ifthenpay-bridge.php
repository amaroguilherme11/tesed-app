<?php
/**
 * Plugin Name: Tesed — Ponte de Subscrições (WooCommerce → App)
 * Description: Após um pagamento WooCommerce concluído (Ifthenpay), gera o código
 *              de subscrição na app Tesed e entrega-o ao cliente (página + email).
 * Version: 1.0.0
 * Author: Tesed
 *
 * COMO FUNCIONA
 *  - NÃO toca no pagamento nem no callback Ifthenpay (já existentes).
 *  - Engata no gancho do WooCommerce quando a encomenda fica PAGA.
 *  - Para cada item, lê o SKU do produto e deduz (plano, meses).
 *  - Chama o endpoint da app Tesed (Edge Function) com um segredo partilhado.
 *  - Guarda o(s) código(s) na encomenda e mostra-os ao cliente; envia por email.
 *
 * CONVENÇÃO DE SKU (definir nos produtos WooCommerce):
 *    TESED-IND-03 | TESED-IND-06 | TESED-IND-12
 *    TESED-FAM-03 | TESED-FAM-06 | TESED-FAM-12
 *  (IND = individual, FAM = família; o número são os meses.)
 *  Aceita também sem zero à frente (TESED-IND-3) por compatibilidade.
 *
 * CONFIGURAÇÃO (em Definições → Tesed Subscrições):
 *    - URL do endpoint Tesed
 *    - Segredo partilhado
 */

if (!defined('ABSPATH')) {
    exit; // sem acesso direto
}

// ---------------------------------------------------------------------------
// Definições (menu simples no backoffice WordPress)
// ---------------------------------------------------------------------------
add_action('admin_menu', function () {
    add_options_page(
        'Tesed Subscrições',
        'Tesed Subscrições',
        'manage_options',
        'tesed-subscricoes',
        'tesed_bridge_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('tesed_bridge', 'tesed_endpoint_url');
    register_setting('tesed_bridge', 'tesed_shared_secret');
});

function tesed_bridge_settings_page() {
    ?>
    <div class="wrap">
        <h1>Tesed — Ponte de Subscrições</h1>
        <form method="post" action="options.php">
            <?php settings_fields('tesed_bridge'); ?>
            <table class="form-table">
                <tr>
                    <th><label for="tesed_endpoint_url">URL do endpoint Tesed</label></th>
                    <td>
                        <input name="tesed_endpoint_url" id="tesed_endpoint_url" type="url"
                               class="regular-text"
                               value="<?php echo esc_attr(get_option('tesed_endpoint_url')); ?>"
                               placeholder="https://SEU-PROJETO.supabase.co/functions/v1/ifthenpay-callback" />
                    </td>
                </tr>
                <tr>
                    <th><label for="tesed_shared_secret">Segredo partilhado</label></th>
                    <td>
                        <input name="tesed_shared_secret" id="tesed_shared_secret" type="password"
                               class="regular-text"
                               value="<?php echo esc_attr(get_option('tesed_shared_secret')); ?>" />
                        <p class="description">Fornecido pela equipa Tesed. Tratar como password.</p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
        <h2>Convenção de SKU dos produtos</h2>
        <p>Definir o SKU de cada produto de subscrição como:</p>
        <code>TESED-IND-03, TESED-IND-06, TESED-IND-12, TESED-FAM-03, TESED-FAM-06, TESED-FAM-12</code>
    </div>
    <?php
}

// ---------------------------------------------------------------------------
// SKU -> (plano, meses)
// ---------------------------------------------------------------------------
function tesed_parse_sku($sku) {
    // Aceita TESED-IND-03 / TESED-FAM-12 (com ou sem zero à frente: 03 = 3).
    if (!preg_match('/^TESED-(IND|FAM)-0?(3|6|12)$/i', trim((string)$sku), $m)) {
        return null;
    }
    return [
        'plan'   => strtoupper($m[1]) === 'FAM' ? 'family' : 'individual',
        'months' => (int)$m[2],
    ];
}

// ---------------------------------------------------------------------------
// Gancho principal: encomenda paga -> gerar código(s) na Tesed
// Usamos 'woocommerce_payment_complete' (dispara quando o pagamento é confirmado).
// ---------------------------------------------------------------------------
add_action('woocommerce_payment_complete', 'tesed_on_payment_complete', 10, 1);
// Rede de segurança: alguns fluxos só marcam "completed"/"processing".
add_action('woocommerce_order_status_completed', 'tesed_on_payment_complete', 10, 1);
add_action('woocommerce_order_status_processing', 'tesed_on_payment_complete', 10, 1);

function tesed_on_payment_complete($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) {
        return;
    }

    // Idempotência local: se já gerámos os códigos para esta encomenda, sair.
    if ($order->get_meta('_tesed_codes_generated') === 'yes') {
        return;
    }

    $endpoint = get_option('tesed_endpoint_url');
    $secret   = get_option('tesed_shared_secret');
    if (!$endpoint || !$secret) {
        $order->add_order_note('Tesed: integração não configurada (URL/segredo em falta).');
        return;
    }

    $generated = [];

    foreach ($order->get_items() as $item_id => $item) {
        $product = $item->get_product();
        if (!$product) {
            continue;
        }
        $parsed = tesed_parse_sku($product->get_sku());
        if (!$parsed) {
            continue; // produto que não é de subscrição Tesed
        }

        // Uma subscrição por unidade comprada.
        $qty = max(1, (int)$item->get_quantity());
        for ($i = 0; $i < $qty; $i++) {
            // payment_ref único e estável por linha/unidade (idempotência no servidor).
            $payment_ref = 'wc_' . $order_id . '_' . $item_id . '_' . $i;

            $code = tesed_request_code($endpoint, $secret, $payment_ref, $parsed['plan'], $parsed['months']);
            if ($code) {
                $generated[] = [
                    'code'   => $code,
                    'plan'   => $parsed['plan'],
                    'months' => $parsed['months'],
                ];
            } else {
                $order->add_order_note("Tesed: falha ao gerar código para {$product->get_sku()} (ref {$payment_ref}).");
            }
        }
    }

    if (!empty($generated)) {
        // Guardar na encomenda (para a página de obrigado, emails e suporte).
        $order->update_meta_data('_tesed_codes', $generated);
        $order->update_meta_data('_tesed_codes_generated', 'yes');
        $order->save();

        $lines = array_map(function ($g) {
            $plano = $g['plan'] === 'family' ? 'Família' : 'Individual';
            return "{$g['code']} — {$plano}, {$g['months']} meses";
        }, $generated);
        $order->add_order_note("Tesed: código(s) gerado(s):\n" . implode("\n", $lines));
    }
}

// ---------------------------------------------------------------------------
// Chamada HTTP ao endpoint Tesed. Devolve o código (string) ou null.
// ---------------------------------------------------------------------------
function tesed_request_code($endpoint, $secret, $payment_ref, $plan, $months) {
    $response = wp_remote_post($endpoint, [
        'timeout' => 20,
        'headers' => [
            'Authorization' => 'Bearer ' . $secret,
            'Content-Type'  => 'application/json',
        ],
        'body' => wp_json_encode([
            'payment_ref' => $payment_ref,
            'plan'        => $plan,
            'months'      => $months,
        ]),
    ]);

    if (is_wp_error($response)) {
        return null;
    }
    $code_http = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);
    if ($code_http !== 200 || empty($body['code'])) {
        return null;
    }
    return $body['code'];
}

// ---------------------------------------------------------------------------
// Mostrar os códigos na página de "Obrigado" (order received).
// ---------------------------------------------------------------------------
add_action('woocommerce_thankyou', function ($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) {
        return;
    }
    $codes = $order->get_meta('_tesed_codes');
    if (empty($codes)) {
        return;
    }
    echo '<section class="tesed-codes" style="margin:24px 0;padding:16px;border:1px solid #e2e8e7;border-radius:14px;background:#f7f9f9">';
    echo '<h2 style="color:#0E7C7B;margin-top:0">O seu código de subscrição Tesed</h2>';
    echo '<p>Abra a app Tesed → <strong>Subscrição</strong> → <strong>Inserir código</strong> e introduza:</p>';
    foreach ($codes as $g) {
        $plano = $g['plan'] === 'family' ? 'Família' : 'Individual';
        echo '<p style="font-size:20px;font-weight:700;letter-spacing:1px">'
            . esc_html($g['code'])
            . ' <span style="font-size:14px;font-weight:400;color:#5c6b68">(' . esc_html($plano) . ', ' . (int)$g['months'] . ' meses)</span></p>';
    }
    echo '</section>';
}, 20);

// ---------------------------------------------------------------------------
// Incluir os códigos no email de encomenda concluída ao cliente.
// ---------------------------------------------------------------------------
add_action('woocommerce_email_after_order_table', function ($order, $sent_to_admin, $plain_text) {
    if ($sent_to_admin) {
        return;
    }
    $codes = $order->get_meta('_tesed_codes');
    if (empty($codes)) {
        return;
    }
    if ($plain_text) {
        echo "\n\n== O seu código de subscrição Tesed ==\n";
        echo "Abra a app Tesed -> Subscrição -> Inserir código:\n";
        foreach ($codes as $g) {
            $plano = $g['plan'] === 'family' ? 'Familia' : 'Individual';
            echo "{$g['code']} ({$plano}, {$g['months']} meses)\n";
        }
    } else {
        echo '<h2 style="color:#0E7C7B">O seu código de subscrição Tesed</h2>';
        echo '<p>Abra a app Tesed → <strong>Subscrição</strong> → <strong>Inserir código</strong>:</p>';
        foreach ($codes as $g) {
            $plano = $g['plan'] === 'family' ? 'Família' : 'Individual';
            echo '<p style="font-size:18px;font-weight:700">' . esc_html($g['code'])
                . ' <span style="font-size:13px;font-weight:400;color:#5c6b68">(' . esc_html($plano) . ', ' . (int)$g['months'] . ' meses)</span></p>';
        }
    }
}, 20, 3);
