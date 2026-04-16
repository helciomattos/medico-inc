import { randomBytes } from "crypto";

export const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const ORDERS_TABLE = process.env.SUPABASE_ORDERS_TABLE ?? "checkout_orders";
export const DRAFTS_TABLE = process.env.SUPABASE_DRAFTS_TABLE ?? "checkout_drafts";
export const LEADS_TABLE = "leads";
export const BRIEFINGS_TABLE = "briefings";
export const DELIVERIES_TABLE = "deliveries";
export const MOCK_MODE = process.env.CHECKOUT_MOCK_MODE !== "false";

/** Gera IDs únicos para pedidos e tokens */
export function genOrderId() {
  return `MI-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function genPaymentId(prefix: string) {
  return `${prefix}_${randomBytes(5).toString("hex")}`;
}

/**
 * Insere uma linha no Supabase.
 * Lança erro se o insert falhar — garante que pedidos sem registro nunca
 * sejam confirmados ao usuário.
 */
export async function supabaseInsert(
  table: string,
  row: Record<string, unknown>
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return; // sem Supabase configurado, skip silencioso

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Supabase insert failed on ${table}: HTTP ${res.status} — ${detail}`);
  }
}

/**
 * Busca uma linha no Supabase por filtro.
 * Retorna null se não encontrar ou se Supabase não estiver configurado.
 */
export async function supabaseSelectOne(
  table: string,
  filter: string
): Promise<Record<string, unknown> | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${filter}&limit=1`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  if (Array.isArray(data) && data.length > 0) return data[0];
  return null;
}

/**
 * Atualiza linhas no Supabase por filtro.
 */
export async function supabaseUpdate(
  table: string,
  filter: string,
  data: Record<string, unknown>
): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });

  return res.ok;
}

/**
 * Busca múltiplas linhas no Supabase.
 */
export async function supabaseSelect(
  table: string,
  filter: string,
  select = "*"
): Promise<Record<string, unknown>[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=${select}&${filter}`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return Array.isArray(data) ? data : [];
}

/** Headers CORS explícitos para endpoints de checkout */
export function corsHeaders(): Record<string, string> {
  const origin = process.env.CHECKOUT_ALLOWED_ORIGIN ?? "https://medicoinc.com.br";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

/** Valida campos obrigatórios do payload de checkout */
export function validateCheckoutPayload(
  body: Record<string, unknown>
): string | null {
  if (!body || typeof body !== "object") return "Payload inválido";
  if (typeof body.amount !== "number" || body.amount <= 0) return "amount inválido";
  const customer = body.customer as Record<string, unknown> | null;
  if (!customer) return "customer ausente";
  if (!customer.name || typeof customer.name !== "string") return "customer.name ausente";
  if (!customer.email || typeof customer.email !== "string") return "customer.email ausente";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customer.email as string))
    return "customer.email inválido";
  return null;
}
