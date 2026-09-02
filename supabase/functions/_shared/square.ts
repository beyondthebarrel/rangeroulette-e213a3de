// Thin wrapper around Square's REST API — no SDK, so the exact request/response
// shapes are easy to see and adjust once we're testing against real responses.

const SQUARE_API_VERSION = "2026-07-15";

function baseUrl(): string {
  const env = Deno.env.get("SQUARE_ENVIRONMENT") ?? "sandbox";
  return env === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

export async function squareFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: T }> {
  const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
  if (!accessToken) throw new Error("SQUARE_ACCESS_TOKEN secret is not set");

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Square-Version": SQUARE_API_VERSION,
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}
