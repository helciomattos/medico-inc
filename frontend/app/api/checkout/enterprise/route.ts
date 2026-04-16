import { NextRequest, NextResponse } from "next/server";
import {
  MOCK_MODE,
  ORDERS_TABLE,
  corsHeaders,
  genOrderId,
  genPaymentId,
  supabaseInsert,
  validateCheckoutPayload,
} from "../_lib";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400, headers });
  }

  const validationError = validateCheckoutPayload(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 422, headers });
  }

  const orderId = genOrderId();
  const paymentId = genPaymentId("mp_mock");
  const status = MOCK_MODE ? "approved_mock" : "pending";

  try {
    await supabaseInsert(ORDERS_TABLE, {
      order_id: orderId,
      gateway: "mercadopago",
      status,
      amount: body.amount,
      created_at: new Date().toISOString(),
      payment_id: paymentId,
      customer: body.customer ?? {},
      utm_params: body.utm_params ?? {},
    });
  } catch (err) {
    console.error("[checkout/enterprise] supabase insert failed:", err);
    return NextResponse.json(
      { error: "Falha ao registrar pedido. Tente novamente." },
      { status: 502, headers }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      order_id: orderId,
      payment_id: paymentId,
      payment_status: status,
      gateway: "mercadopago",
      amount: body.amount,
      redirect_url: null,
    },
    { headers }
  );
}
