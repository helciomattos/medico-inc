import { NextRequest, NextResponse } from "next/server";
import {
  ORDERS_TABLE,
  BRIEFINGS_TABLE,
  DELIVERIES_TABLE,
  corsHeaders,
  supabaseSelectOne,
} from "../../../checkout/_lib";

/**
 * GET /api/onboarding/status/:orderId
 *
 * Retorna o status do pedido, briefing e delivery para o cliente acompanhar.
 * Não expõe dados sensíveis (PII) — apenas status e timestamps.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const headers = corsHeaders();
  const { orderId } = await params;

  if (!orderId) {
    return NextResponse.json(
      { error: "orderId obrigatório" },
      { status: 400, headers }
    );
  }

  const encodedId = encodeURIComponent(orderId);

  // Buscar dados em paralelo
  const [order, briefing, delivery] = await Promise.all([
    supabaseSelectOne(ORDERS_TABLE, `order_id=eq.${encodedId}`),
    supabaseSelectOne(BRIEFINGS_TABLE, `order_id=eq.${encodedId}`),
    supabaseSelectOne(DELIVERIES_TABLE, `order_id=eq.${encodedId}`),
  ]);

  if (!order) {
    return NextResponse.json(
      { error: "Pedido não encontrado" },
      { status: 404, headers }
    );
  }

  return NextResponse.json(
    {
      order_id: orderId,
      payment: {
        status: order.status,
        amount: order.amount,
        gateway: order.gateway,
        created_at: order.created_at,
      },
      briefing: briefing
        ? {
            status: briefing.status,
            submitted_at: briefing.submitted_at,
            approved_at: briefing.approved_at,
          }
        : null,
      delivery: delivery
        ? {
            status: delivery.status,
            preview_url: delivery.preview_url,
            final_url: delivery.final_url,
            started_at: delivery.started_at,
            preview_sent_at: delivery.preview_sent_at,
            published_at: delivery.published_at,
          }
        : null,
    },
    { headers }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
