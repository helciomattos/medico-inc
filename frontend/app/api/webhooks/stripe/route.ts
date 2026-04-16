import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook Stripe — recebe eventos de pagamento.
 *
 * Para ativar em produção:
 * 1. Instale o Stripe SDK: npm install stripe
 * 2. Configure o endpoint no painel Stripe:
 *    https://dashboard.stripe.com/webhooks
 * 3. Adicione STRIPE_WEBHOOK_SECRET ao Vercel
 * 4. Descomente a validação abaixo
 *
 * Documentação: https://stripe.com/docs/webhooks
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // TODO (produção): validar assinatura Stripe
  // const sig = req.headers.get("stripe-signature");
  // const secret = process.env.STRIPE_WEBHOOK_SECRET;
  // let event;
  // try {
  //   event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  // } catch (err) {
  //   return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  // }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const eventType = event.type as string;

  if (eventType === "payment_intent.succeeded") {
    const paymentIntent = event.data as Record<string, unknown> | null;
    console.log(`[webhook/stripe] payment succeeded:`, paymentIntent?.id);
    // TODO (produção): atualizar status no Supabase e disparar onboarding
    // await supabaseUpdate(ORDERS_TABLE, `payment_id=eq.${paymentIntent?.id}`, { status: "approved" });
    // await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/internal`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.INTERNAL_WEBHOOK_TOKEN}` },
    //   body: JSON.stringify({ event: "payment_confirmed", order_id: "..." }),
    // });
  }

  if (eventType === "payment_intent.payment_failed") {
    const paymentIntent = event.data as Record<string, unknown> | null;
    console.log(`[webhook/stripe] payment failed:`, paymentIntent?.id);
    // TODO (produção): notificar time, atualizar status
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, webhook: "stripe" });
}
