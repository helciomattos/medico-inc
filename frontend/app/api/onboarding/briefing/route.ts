import { NextRequest, NextResponse } from "next/server";
import {
  BRIEFINGS_TABLE,
  DELIVERIES_TABLE,
  corsHeaders,
  supabaseInsert,
  supabaseSelectOne,
  ORDERS_TABLE,
} from "../../checkout/_lib";

/**
 * POST /api/onboarding/briefing
 *
 * Recebe o briefing preenchido pelo médico após pagamento.
 * Valida que o order_id existe e está pago, depois salva o briefing
 * e cria um registro de delivery na fila.
 */
export async function POST(req: NextRequest) {
  const headers = corsHeaders();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400, headers }
    );
  }

  // Validação dos campos obrigatórios
  const orderId = body.order_id as string;
  const doctorName = body.doctor_name as string;
  const specialty = body.specialty as string;
  const city = body.city as string;

  if (!orderId || !doctorName || !specialty || !city) {
    return NextResponse.json(
      { error: "Campos obrigatórios: order_id, doctor_name, specialty, city" },
      { status: 400, headers }
    );
  }

  // Verificar se o pedido existe
  const order = await supabaseSelectOne(
    ORDERS_TABLE,
    `order_id=eq.${encodeURIComponent(orderId)}`
  );

  if (!order) {
    return NextResponse.json(
      { error: "Pedido não encontrado" },
      { status: 404, headers }
    );
  }

  try {
    // Salvar briefing
    await supabaseInsert(BRIEFINGS_TABLE, {
      order_id: orderId,
      doctor_name: doctorName,
      specialty,
      city,
      clinic_name: body.clinic_name || null,
      differentials: body.differentials || null,
      target_audience: body.target_audience || null,
      services: body.services || null,
      phone_whatsapp: body.phone_whatsapp || null,
      address: body.address || null,
      photo_urls: body.photo_urls || [],
      brand_colors: body.brand_colors || {},
      additional_notes: body.additional_notes || null,
      status: "pending",
    });

    // Criar registro de delivery na fila
    await supabaseInsert(DELIVERIES_TABLE, {
      order_id: orderId,
      status: "queued",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Briefing recebido. Sua equipe foi notificada e o site entra em produção.",
        order_id: orderId,
      },
      { status: 201, headers }
    );
  } catch (err) {
    console.error("[onboarding/briefing] Erro ao salvar:", err);
    return NextResponse.json(
      { error: "Erro ao salvar briefing. Tente novamente." },
      { status: 502, headers }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
