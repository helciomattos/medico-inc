import { NextRequest, NextResponse } from "next/server";
import {
  ORDERS_TABLE,
  BRIEFINGS_TABLE,
  DELIVERIES_TABLE,
  supabaseSelectOne,
  supabaseUpdate,
  corsHeaders,
} from "../../checkout/_lib";

/**
 * POST /api/webhooks/internal
 *
 * Webhook interno para transições de status no fluxo pós-venda.
 * Usado para notificar a equipe e atualizar status automaticamente.
 *
 * Eventos suportados:
 * - payment_confirmed: pagamento aprovado → cria link de briefing
 * - briefing_submitted: médico preencheu briefing → notifica produção
 * - preview_ready: preview do site pronto → envia para aprovação
 * - site_approved: cliente aprovou → marca delivery como publicada
 *
 * Em produção, cada evento deve disparar notificação via:
 * - WhatsApp Business API (para o time)
 * - Email transacional (para o cliente)
 */
export async function POST(req: NextRequest) {
  const headers = corsHeaders();

  // Validar token interno
  const authHeader = req.headers.get("authorization");
  const internalToken = process.env.INTERNAL_WEBHOOK_TOKEN;
  if (internalToken && authHeader !== `Bearer ${internalToken}`) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401, headers }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400, headers }
    );
  }

  const event = body.event as string;
  const orderId = body.order_id as string;

  if (!event || !orderId) {
    return NextResponse.json(
      { error: "Campos obrigatórios: event, order_id" },
      { status: 400, headers }
    );
  }

  const encodedId = encodeURIComponent(orderId);

  switch (event) {
    case "payment_confirmed": {
      // Atualizar status do pedido
      await supabaseUpdate(ORDERS_TABLE, `order_id=eq.${encodedId}`, {
        status: "approved",
      });

      // TODO (produção): enviar WhatsApp para o médico com link do briefing
      // await sendWhatsApp(order.customer.phone, `Seu pagamento foi confirmado! Preencha o briefing: https://medicoinc.com.br/briefing/${orderId}`);

      console.log(`[webhook/internal] payment_confirmed: ${orderId}`);
      break;
    }

    case "briefing_submitted": {
      // Atualizar delivery para in_progress
      await supabaseUpdate(DELIVERIES_TABLE, `order_id=eq.${encodedId}`, {
        status: "in_progress",
        started_at: new Date().toISOString(),
      });

      // TODO (produção): notificar time de produção no Slack/WhatsApp
      // await notifyTeam(`Novo briefing recebido: ${orderId}. Iniciar produção.`);

      console.log(`[webhook/internal] briefing_submitted: ${orderId}`);
      break;
    }

    case "preview_ready": {
      const previewUrl = body.preview_url as string;
      if (!previewUrl) {
        return NextResponse.json(
          { error: "preview_url obrigatório para preview_ready" },
          { status: 400, headers }
        );
      }

      await supabaseUpdate(DELIVERIES_TABLE, `order_id=eq.${encodedId}`, {
        status: "preview_sent",
        preview_url: previewUrl,
        preview_sent_at: new Date().toISOString(),
      });

      // TODO (produção): enviar email/WhatsApp para o cliente com link de preview
      // await sendWhatsApp(customer.phone, `Seu site está pronto para revisão: ${previewUrl}`);

      console.log(`[webhook/internal] preview_ready: ${orderId} → ${previewUrl}`);
      break;
    }

    case "site_approved": {
      const finalUrl = body.final_url as string;

      await supabaseUpdate(DELIVERIES_TABLE, `order_id=eq.${encodedId}`, {
        status: "published",
        final_url: finalUrl || null,
        approved_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
      });

      await supabaseUpdate(BRIEFINGS_TABLE, `order_id=eq.${encodedId}`, {
        status: "approved",
        approved_at: new Date().toISOString(),
      });

      // TODO (produção): enviar email de parabéns com URL final
      console.log(`[webhook/internal] site_approved: ${orderId} → ${finalUrl}`);
      break;
    }

    default:
      return NextResponse.json(
        { error: `Evento desconhecido: ${event}` },
        { status: 400, headers }
      );
  }

  return NextResponse.json({ received: true, event, order_id: orderId }, { headers });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
