import { z } from "zod";
import { FLOW_CATEGORIES } from "../flows/categories.js";

/** Schemas de entrada reutilizados por várias tools. */

export const flowIdSchema = z.string().min(1).describe("ID do flow (retornado na criação ou na listagem).");

export const flowNameSchema = z.string().min(1).max(200).describe("Nome do flow.");

export const categoriesSchema = z
  .array(z.enum(FLOW_CATEGORIES))
  .min(1)
  .describe(`Ao menos uma categoria: ${FLOW_CATEGORIES.join(", ")}.`);

export const flowJsonSchema = z
  .union([z.string(), z.record(z.any())])
  .describe("Flow JSON (objeto ou string JSON) com 'version' e 'screens'.");

/** Exige que o modelo confirme ações irreversíveis autorizadas pelo usuário. */
export const confirmationSchema = z
  .literal(true)
  .describe("Deve ser true, confirmando que o usuário autorizou explicitamente esta ação.");
