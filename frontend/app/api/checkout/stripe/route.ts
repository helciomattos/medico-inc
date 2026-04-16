import { NextRequest, NextResponse } from "next/server";
import {
  MOCK_MODE,
  ORDERS_TABLE,
  genOrderId,
  genPaymentId,
  supabaseInsert,
} from "../_lib";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const orderId = genOrderId();
  const paymentId = genPaymentId("st_mock");

  await supabaseInsert(ORDERS_TABLE, {
    order_id: orderId,
    gateway: "stripe",
    status: MOCK_MODE ? "approved_mock" : "pending",
    amount: body.amount,
    created_at: new Date().toISOString(),
    payment_id: paymentId,
    customer: body.customer ?? {},
    utm_params: body.utm_params ?? {},
  });

  return NextResponse.json({
    ok: true,
    order_id: orderId,
    payment_id: paymentId,
    payment_status: MOCK_MODE ? "approved_mock" : "pending",
    gateway: "stripe",
    amount: body.amount,
    redirect_url: null,
  });
}
