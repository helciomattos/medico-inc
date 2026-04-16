import { randomBytes } from "crypto";

export const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const ORDERS_TABLE = process.env.SUPABASE_ORDERS_TABLE ?? "checkout_orders";
export const DRAFTS_TABLE = process.env.SUPABASE_DRAFTS_TABLE ?? "checkout_drafts";
export const MOCK_MODE = process.env.CHECKOUT_MOCK_MODE !== "false";

export function genOrderId() {
  return `MI-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function genPaymentId(prefix: string) {
  return `${prefix}_${randomBytes(5).toString("hex")}`;
}

export async function supabaseInsert(table: string, row: Record<string, unknown>) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
}

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
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) return data[0];
  return null;
}
