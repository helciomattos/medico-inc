import { NextRequest, NextResponse } from "next/server";
import { DRAFTS_TABLE, corsHeaders, genPaymentId, supabaseInsert } from "../_lib";

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

  // Validação básica — rejeita payloads malformados ou muito grandes
  const raw = JSON.stringify(body);
  if (raw.length > 8_000) {
    return NextResponse.json({ error: "Payload muito grande" }, { status: 413, headers });
  }

  const draftId = genPaymentId("draft");

  try {
    await supabaseInsert(DRAFTS_TABLE, {
      draft_id: draftId,
      payload: body.payload ?? body,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Draft é best-effort: não retorna erro ao usuário, apenas loga
    console.warn("[checkout/save-draft] Supabase insert failed, continuing silently");
  }

  return NextResponse.json({ ok: true, draft_id: draftId }, { headers });
}
