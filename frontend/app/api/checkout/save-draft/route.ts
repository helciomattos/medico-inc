import { NextRequest, NextResponse } from "next/server";
import { DRAFTS_TABLE, genPaymentId, supabaseInsert } from "../_lib";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const draftId = genPaymentId("draft");

  await supabaseInsert(DRAFTS_TABLE, {
    draft_id: draftId,
    payload: body.payload ?? body,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, draft_id: draftId });
}
