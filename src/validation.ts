/**
 * Validação local (estática) de Flow JSON do WhatsApp, antes de enviar para a Blip/Meta.
 * Não substitui a validação oficial da Meta (retornada em validation_errors no upload),
 * mas captura os erros mais comuns rapidamente e sem custo de chamadas à API.
 */

export interface ValidationIssue {
  level: "error" | "warning";
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: {
    version?: string;
    screens: string[];
    terminalScreens: string[];
    usesDataExchange: boolean;
    sizeBytes: number;
  };
}

export const KNOWN_COMPONENTS = new Set([
  "Form",
  "TextHeading",
  "TextSubheading",
  "TextBody",
  "TextCaption",
  "RichText",
  "TextInput",
  "TextArea",
  "CheckboxGroup",
  "RadioButtonsGroup",
  "Dropdown",
  "ChipsSelector",
  "DatePicker",
  "CalendarPicker",
  "OptIn",
  "EmbeddedLink",
  "Footer",
  "Image",
  "ImageCarousel",
  "PhotoPicker",
  "DocumentPicker",
  "NavigationList",
  "If",
  "Switch",
]);

const ACTIONS = new Set(["navigate", "complete", "data_exchange", "update_data", "open_url"]);
const SCREEN_ID_RE = /^[A-Za-z_]+$/;
const MAX_IMAGE_BYTES = 300 * 1024;
const MAX_FLOW_JSON_BYTES = 10 * 1024 * 1024;

type Json = Record<string, unknown>;

function isObj(v: unknown): v is Json {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Aceita objeto ou string JSON. */
export function parseFlowJson(input: unknown): Json {
  if (typeof input === "string") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      throw new Error(`Flow JSON inválido (erro de sintaxe): ${(e as Error).message}`);
    }
    if (!isObj(parsed)) throw new Error("Flow JSON deve ser um objeto.");
    return parsed;
  }
  if (!isObj(input)) throw new Error("Flow JSON deve ser um objeto.");
  return input;
}

interface ScreenCtx {
  id: string;
  path: string;
  footers: number;
  hasComplete: boolean;
  fieldNames: Map<string, string>;
  formRefs: Array<{ name: string; path: string }>;
  dataRefs: Array<{ name: string; path: string }>;
  navigateTargets: Array<{ name: string; path: string }>;
}

export function validateFlowJson(input: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const err = (path: string, message: string) => errors.push({ level: "error", path, message });
  const warn = (path: string, message: string) => warnings.push({ level: "warning", path, message });

  let flow: Json;
  try {
    flow = parseFlowJson(input);
  } catch (e) {
    err("$", (e as Error).message);
    return {
      valid: false,
      errors,
      warnings,
      summary: { screens: [], terminalScreens: [], usesDataExchange: false, sizeBytes: 0 },
    };
  }

  const sizeBytes = Buffer.byteLength(JSON.stringify(flow), "utf8");
  if (sizeBytes > MAX_FLOW_JSON_BYTES) {
    err("$", `Flow JSON com ${sizeBytes} bytes excede o limite de 10 MB.`);
  }

  const version = flow.version;
  if (typeof version !== "string" || !/^\d+\.\d+$/.test(version)) {
    err("$.version", "Campo 'version' obrigatório, string no formato 'X.Y' (ex.: \"6.3\").");
  }

  const dataApiVersion = flow.data_api_version;
  const routingModel = flow.routing_model;
  if (dataApiVersion !== undefined && typeof dataApiVersion !== "string") {
    err("$.data_api_version", "'data_api_version' deve ser string (ex.: \"3.0\").");
  }

  const screensRaw = flow.screens;
  if (!Array.isArray(screensRaw) || screensRaw.length === 0) {
    err("$.screens", "Campo 'screens' obrigatório e deve conter ao menos uma tela.");
    return {
      valid: false,
      errors,
      warnings,
      summary: {
        version: typeof version === "string" ? version : undefined,
        screens: [],
        terminalScreens: [],
        usesDataExchange: false,
        sizeBytes,
      },
    };
  }

  const screenIds = new Set<string>();
  const terminalScreens: string[] = [];
  const ctxs: ScreenCtx[] = [];
  let usesDataExchange = false;

  screensRaw.forEach((s, i) => {
    const sp = `$.screens[${i}]`;
    if (!isObj(s)) {
      err(sp, "Tela deve ser um objeto.");
      return;
    }
    const id = typeof s.id === "string" ? s.id : "";
    if (!id) err(`${sp}.id`, "Tela sem 'id'.");
    else {
      if (!SCREEN_ID_RE.test(id)) err(`${sp}.id`, `Id de tela '${id}' inválido: use apenas letras e '_'.`);
      if (id === "SUCCESS") err(`${sp}.id`, "'SUCCESS' é um id reservado e não pode ser usado.");
      if (screenIds.has(id)) err(`${sp}.id`, `Id de tela duplicado: '${id}'.`);
      screenIds.add(id);
    }
    if (s.title !== undefined && typeof s.title !== "string") err(`${sp}.title`, "'title' deve ser string.");
    if (s.terminal === true) terminalScreens.push(id);
    if (s.data !== undefined && !isObj(s.data)) err(`${sp}.data`, "'data' deve ser um objeto.");

    const layout = s.layout;
    if (!isObj(layout)) {
      err(`${sp}.layout`, "Tela sem 'layout'.");
      return;
    }
    if (layout.type !== "SingleColumnLayout") {
      err(`${sp}.layout.type`, "layout.type deve ser 'SingleColumnLayout'.");
    }
    if (!Array.isArray(layout.children)) {
      err(`${sp}.layout.children`, "layout.children deve ser um array.");
      return;
    }

    const ctx: ScreenCtx = {
      id,
      path: sp,
      footers: 0,
      hasComplete: false,
      fieldNames: new Map(),
      formRefs: [],
      dataRefs: [],
      navigateTargets: [],
    };
    walkComponents(layout.children, `${sp}.layout.children`, ctx, { err, warn }, () => {
      usesDataExchange = true;
    });
    collectRefs(s.layout, `${sp}.layout`, ctx);
    ctxs.push(ctx);

    if (ctx.footers > 1) err(sp, `Tela '${id}' tem ${ctx.footers} Footers; o máximo é 1 por tela.`);
    if (s.terminal === true && ctx.footers === 0) {
      err(sp, `Tela terminal '${id}' precisa de um Footer.`);
    }
    if (ctx.hasComplete && s.terminal !== true) {
      err(sp, `A ação 'complete' só pode ser usada em telas terminais ('terminal': true). Tela: '${id}'.`);
    }

    // referências ${data.x} devem estar declaradas em screen.data
    const declared = isObj(s.data) ? new Set(Object.keys(s.data)) : new Set<string>();
    for (const ref of ctx.dataRefs) {
      if (!declared.has(ref.name)) {
        warn(ref.path, `Referência '\${data.${ref.name}}' não declarada em '${id}.data'.`);
      }
    }
    if (isObj(s.data)) {
      for (const [k, v] of Object.entries(s.data)) {
        if (!isObj(v) || typeof v.type !== "string") {
          warn(`${sp}.data.${k}`, "Cada entrada de 'data' deve ter 'type' e '__example__'.");
        } else if (!("__example__" in v)) {
          warn(`${sp}.data.${k}`, "Entrada de 'data' sem '__example__' (exigido pela Meta para preview).");
        }
      }
    }
    // referências ${form.x} devem existir na tela
    for (const ref of ctx.formRefs) {
      if (!ctx.fieldNames.has(ref.name)) {
        warn(ref.path, `Referência '\${form.${ref.name}}' não corresponde a nenhum campo da tela '${id}'.`);
      }
    }
  });

  // navegação
  for (const ctx of ctxs) {
    for (const t of ctx.navigateTargets) {
      if (!screenIds.has(t.name)) err(t.path, `navigate aponta para tela inexistente '${t.name}'.`);
    }
  }

  if (terminalScreens.length === 0) {
    err("$.screens", "O flow precisa de ao menos uma tela com \"terminal\": true.");
  }

  if (usesDataExchange && dataApiVersion === undefined) {
    err("$.data_api_version", "Flows com ação 'data_exchange' exigem 'data_api_version' (ex.: \"3.0\") e endpoint configurado.");
  }
  if (dataApiVersion !== undefined && routingModel === undefined) {
    err("$.routing_model", "Flows com 'data_api_version' exigem 'routing_model'.");
  }
  if (routingModel !== undefined) {
    if (!isObj(routingModel)) err("$.routing_model", "'routing_model' deve ser um objeto.");
    else {
      for (const [from, tos] of Object.entries(routingModel)) {
        if (!screenIds.has(from)) err(`$.routing_model.${from}`, `Tela '${from}' não existe.`);
        if (!Array.isArray(tos)) err(`$.routing_model.${from}`, "Valor deve ser array de ids de tela.");
        else for (const to of tos) {
          if (typeof to !== "string" || !screenIds.has(to)) {
            err(`$.routing_model.${from}`, `Destino '${String(to)}' não existe.`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      version: typeof version === "string" ? version : undefined,
      screens: [...screenIds],
      terminalScreens,
      usesDataExchange,
      sizeBytes,
    },
  };
}

function walkComponents(
  children: unknown,
  path: string,
  ctx: ScreenCtx,
  log: { err: (p: string, m: string) => void; warn: (p: string, m: string) => void },
  onDataExchange: () => void
): void {
  if (!Array.isArray(children)) return;
  children.forEach((c, i) => {
    const p = `${path}[${i}]`;
    if (!isObj(c)) {
      log.err(p, "Componente deve ser um objeto.");
      return;
    }
    const type = c.type;
    if (typeof type !== "string") {
      log.err(p, "Componente sem 'type'.");
      return;
    }
    if (!KNOWN_COMPONENTS.has(type)) {
      log.warn(p, `Componente desconhecido '${type}' (verifique a versão do Flow JSON).`);
    }
    if (type === "Footer") ctx.footers++;

    if (typeof c.name === "string" && type !== "Form") {
      if (ctx.fieldNames.has(c.name)) {
        // nomes repetidos em ramos de If/Switch são permitidos pela Meta; apenas avisa
        log.warn(p, `Nome de campo '${c.name}' repetido na tela '${ctx.id}' (permitido apenas em ramos distintos de If/Switch).`);
      } else ctx.fieldNames.set(c.name, p);
    }

    if (type === "Image" && typeof c.src === "string") {
      const approxBytes = Math.floor((c.src.length * 3) / 4);
      if (approxBytes > MAX_IMAGE_BYTES) {
        log.warn(p, `Imagem com ~${Math.round(approxBytes / 1024)} KB; recomendado até 300 KB.`);
      }
    }
    if ((type === "RadioButtonsGroup" || type === "CheckboxGroup" || type === "Dropdown") &&
        Array.isArray(c["data-source"])) {
      const ids = new Set<string>();
      (c["data-source"] as unknown[]).forEach((o, j) => {
        if (!isObj(o) || typeof o.id !== "string" || typeof o.title !== "string") {
          log.err(`${p}.data-source[${j}]`, "Opção precisa de 'id' e 'title' (strings).");
        } else if (ids.has(o.id)) {
          log.err(`${p}.data-source[${j}]`, `Id de opção duplicado '${o.id}'.`);
        } else ids.add(o.id);
      });
    }

    // ações
    for (const key of ["on-click-action", "on-select-action", "on-unselect-action", "on-change-action"]) {
      const action = c[key];
      if (!isObj(action)) continue;
      const ap = `${p}.${key}`;
      const name = action.name;
      if (typeof name !== "string" || !ACTIONS.has(name)) {
        log.err(ap, `Ação inválida '${String(name)}'. Use: ${[...ACTIONS].join(", ")}.`);
        continue;
      }
      if (name === "complete") ctx.hasComplete = true;
      if (name === "data_exchange") onDataExchange();
      if (name === "navigate") {
        const next = action.next;
        if (!isObj(next) || typeof next.name !== "string") {
          log.err(ap, "Ação 'navigate' exige next: { type: 'screen', name: '<ID_DA_TELA>' }.");
        } else ctx.navigateTargets.push({ name: next.name, path: `${ap}.next.name` });
      }
    }
    if (type === "Footer" && !isObj(c["on-click-action"])) {
      log.err(p, "Footer exige 'on-click-action'.");
    }

    // recursão
    walkComponents(c.children, `${p}.children`, ctx, log, onDataExchange);
    walkComponents(c.then, `${p}.then`, ctx, log, onDataExchange);
    walkComponents(c.else, `${p}.else`, ctx, log, onDataExchange);
    if (type === "Switch" && isObj(c.cases)) {
      for (const [k, v] of Object.entries(c.cases)) {
        walkComponents(v, `${p}.cases.${k}`, ctx, log, onDataExchange);
      }
    }
  });
}

const REF_RE = /\$\{(form|data)\.([A-Za-z0-9_]+)/g;

function collectRefs(node: unknown, path: string, ctx: ScreenCtx): void {
  if (typeof node === "string") {
    for (const m of node.matchAll(REF_RE)) {
      (m[1] === "form" ? ctx.formRefs : ctx.dataRefs).push({ name: m[2], path });
    }
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => collectRefs(v, `${path}[${i}]`, ctx));
  } else if (isObj(node)) {
    for (const [k, v] of Object.entries(node)) {
      if (k === "src") continue; // ignora base64 de imagens
      collectRefs(v, `${path}.${k}`, ctx);
    }
  }
}
