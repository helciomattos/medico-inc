export type CheckoutGateway = "mercadopago" | "stripe";

export async function createCheckout(payload: unknown, gateway: CheckoutGateway) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "";
  const endpoint = gateway === "stripe" ? "/api/checkout/stripe" : "/api/checkout/enterprise";
  const url = `${apiBase}${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Falha ao criar checkout");
  }

  return response.json();
}
