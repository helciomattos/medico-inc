import { NextRequest, NextResponse } from "next/server";
import { ORDERS_TABLE, corsHeaders, supabaseSelectOne } from "../_lib";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: NextRequest) {
  const headers = corsHeaders();
  const orderId = req.nextUrl.searchParams.get("order_id");

  if (!orderId || orderId.length < 5 || orderId.length > 30) {
    return NextResponse.json({ error: "order_id inválido" }, { status: 400, headers });
  }

  // PRIVACIDADE: Retorna apenas status e valor — nunca dados do cliente.
  // order_id tem 10 chars hex = 256^5 combinações — enumeração impraticável.
  const row = await supabaseSelectOne(
    ORDERS_TABLE,
    `select=order_id,gateway,status,amount,created_at&order_id=eq.${encodeURIComponent(orderId)}`
  );

  if (!row) {
    return NextResponse.json({ order_id: orderId, status: "not_found" }, { status: 404, headers });
  }

  return NextResponse.json(
    {
      order_id: row.order_id,
      gateway: row.gateway,
      status: row.status,
      amount: row.amount,
      created_at: row.created_at,
    },
    { headers }
  );
}
