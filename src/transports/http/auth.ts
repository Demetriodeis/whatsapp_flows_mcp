import { timingSafeEqual } from "node:crypto";

/**
 * Autenticação opcional por token: se `expectedToken` estiver definido,
 * a requisição precisa de `Authorization: Bearer <token>`.
 */
export function isAuthorized(request: Request, expectedToken: string | undefined): boolean {
  if (!expectedToken) return true;
  const header = request.headers.get("authorization") ?? "";
  const providedToken = header.replace(/^Bearer\s+/i, "");
  return constantTimeEquals(providedToken, expectedToken);
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}
