export type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toPrettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
