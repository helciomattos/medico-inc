import { NextRequest, NextResponse } from "next/server";
import { ORDERS_TABLE, SUPABASE_KEY, SUPABASE_URL } from "../../checkout/_lib";

/**
 * Webhook MercadoPago — recebe notificações de pagamento.
 *
 * Para ativar em produção:
 * 1. Configure o endpoint no painel MercadoPago:
 *    https://www.mercadopago.com.br/developers/pt/docs/notifications/webhooks
 * 2. Adicione a variável MERCADOPAGO_WEBHOOK_SECRET ao Vercel
 * 3. Descomente a validação de assinatura abaixo
 *
 * Documentação: https://www.mercadopago.com.br/developers/pt/reference/notifications
 */
export async function POST(req: NextRequest) {
  // TODO (produção): validar assinatura HMAC do header x-signature
  // const signature = req.headers.get("x-signature");
  // const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  // if (!validateMPSignature(signature, secret, await req.text())) {
  //   return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  // }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const type = body.type as string;
  const action = body.action as string;

  // MercadoPago envia type=payment quando um pagamento muda de status
  if (type === "payment" && action === "payment.updated") {
    const data = body.data as Record<string, unknown> | null;
    const paymentId = data?.id as string | null;

    if (paymentId && SUPABASE_URL && SUPABASE_KEY) {
      // TODO (produção): buscar status real da API MercadoPago e atualizar Supabase
      // const mpStatus = await fetchMPPaymentStatus(paymentId);
      // await supabaseUpdate(ORDERS_TABLE, `payment_id=eq.${paymentId}`, { status: mpStatus });
      //
      // Se aprovado, disparar webhook interno para iniciar onboarding:
      // if (mpStatus === "approved") {
      //   await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/internal`, {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //       "Authorization": `Bearer ${process.env.INTERNAL_WEBHOOK_TOKEN}`,
      //     },
      //     body: JSON.stringify({ event: "payment_confirmed", order_id: orderId }),
      //   });
      // }
      console.log(`[webhook/mp] payment updated: ${paymentId}`);
    }
  }

  // Retorna 200 imediatamente para evitar reenvios
  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, webhook: "mercadopago" });
}
