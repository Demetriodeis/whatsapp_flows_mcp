/** Referência encontrada em uma string, ex.: `${form.nome}` ou `${data.email}`. */
export interface Reference {
  name: string;
  path: string;
}

/** Informações coletadas ao percorrer os componentes de uma tela. */
export interface ScreenContext {
  id: string;
  path: string;
  footerCount: number;
  usesCompleteAction: boolean;
  usesDataExchange: boolean;
  /** Nome do campo -> caminho do componente que o declara. */
  fieldNames: Map<string, string>;
  formReferences: Reference[];
  dataReferences: Reference[];
  navigateTargets: Reference[];
}

export function createScreenContext(id: string, path: string): ScreenContext {
  return {
    id,
    path,
    footerCount: 0,
    usesCompleteAction: false,
    usesDataExchange: false,
    fieldNames: new Map(),
    formReferences: [],
    dataReferences: [],
    navigateTargets: [],
  };
}
