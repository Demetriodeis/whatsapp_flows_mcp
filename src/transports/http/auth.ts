import { timingSafeEqual } from "node:crypto";

export interface AuthOptions {
  /** Aceita o token também em `?token=` (para clientes que não enviam headers). */
  allowQueryToken?: boolean;
}

/**
 * Autenticação opcional por token: se `expectedToken` estiver definido,
 * a requisição precisa de `Authorization: Bearer <token>` (ou `?token=`, se permitido).
 */
export function isAuthorized(
  request: Request,
  expectedToken: string | undefined,
  options: AuthOptions = {}
): boolean {
  if (!expectedToken) return true;
  const header = request.headers.get("authorization") ?? "";
  const headerToken = header.replace(/^Bearer\s+/i, "");
  if (constantTimeEquals(headerToken, expectedToken)) return true;
  if (!options.allowQueryToken) return false;
  const queryToken = new URL(request.url).searchParams.get("token") ?? "";
  return constantTimeEquals(queryToken, expectedToken);
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}
