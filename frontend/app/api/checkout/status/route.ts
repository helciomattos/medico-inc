import { NextRequest, NextResponse } from "next/server";
import { ORDERS_TABLE, supabaseSelectOne } from "../_lib";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("order_id");
  if (!orderId) {
    return NextResponse.json({ error: "order_id required" }, { status: 400 });
  }

  const row = await supabaseSelectOne(
    ORDERS_TABLE,
    `select=order_id,gateway,status,amount,created_at&order_id=eq.${encodeURIComponent(orderId)}`
  );

  if (!row) {
    return NextResponse.json({ order_id: orderId, status: "not_found" }, { status: 404 });
  }

  return NextResponse.json(row);
}
