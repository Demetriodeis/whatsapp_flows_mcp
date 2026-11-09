/** Componentes conhecidos do Flow JSON (até a versão 7.x). Desconhecidos geram aviso, não erro. */
export const KNOWN_COMPONENTS: ReadonlySet<string> = new Set([
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

/** Componentes cujas opções vêm de `data-source: [{ id, title }]`. */
export const CHOICE_COMPONENTS: ReadonlySet<string> = new Set([
  "RadioButtonsGroup",
  "CheckboxGroup",
  "Dropdown",
]);

export const FLOW_ACTIONS: ReadonlySet<string> = new Set([
  "navigate",
  "complete",
  "data_exchange",
  "update_data",
  "open_url",
]);

export const ACTION_PROPERTIES = [
  "on-click-action",
  "on-select-action",
  "on-unselect-action",
  "on-change-action",
] as const;

export const SCREEN_ID_PATTERN = /^[A-Za-z_]+$/;
export const RESERVED_SCREEN_IDS: ReadonlySet<string> = new Set(["SUCCESS"]);
export const VERSION_PATTERN = /^\d+\.\d+$/;
export const REQUIRED_LAYOUT_TYPE = "SingleColumnLayout";
export const MAX_FOOTERS_PER_SCREEN = 1;

export const MAX_IMAGE_BYTES = 300 * 1024;
export const MAX_FLOW_JSON_BYTES = 10 * 1024 * 1024;
