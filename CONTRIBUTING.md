# Guia de manutenção

## Comandos

```bash
npm install
npm run build        # compila para dist/
npm test             # build + testes
npm run lint         # ESLint
npm run format       # Prettier (corrige)
npm run check        # lint + formatação + testes (o mesmo que a CI roda)
```

## Convenções

- **Uma responsabilidade por arquivo**; arquivos com até ~250 linhas e funções com até ~60
  (o ESLint avisa quando passar).
- **Nomes descritivos** em inglês no código; mensagens ao usuário em português.
- **Sem números mágicos:** limites e listas ficam em constantes (`validation/constants.ts`,
  `flows/flowMessage.ts`, `flows/categories.ts`).
- **Erros:** lance `Error` com mensagem clara; nas tools, `withErrorHandling` converte em resultado
  de erro do MCP. Erros da Blip usam `BlipCommandError`.
- Respeite a direção das dependências descrita em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Receitas

### Adicionar um novo command da Blip

1. Adicione a URI em `flowUris` e um método em `src/flows/flowsApi.ts`.
2. Inclua o caso no teste `tests/flowsApi.test.mjs` (method + uri esperados).
3. Exponha como tool (próxima receita) e documente em `docs/reference/blip-commands.md`.

### Adicionar uma nova tool

1. Escolha o grupo em `src/mcp/tools/` (ou crie `<grupo>Tools.ts` e registre em `tools/index.ts`).
2. Registre com `server.registerTool(nome, { title, description, inputSchema, annotations }, withErrorHandling(handler))`.
3. Reutilize schemas de `src/mcp/schemas.ts`; ações irreversíveis usam `confirmationSchema`.
4. Retorne `success(dados, nota?)`; para erro, apenas lance uma exceção.
5. Adicione o nome em `EXPECTED_TOOLS` de `tests/mcpHttp.test.mjs`.

### Adicionar uma regra de validação do Flow JSON

1. Encontre o arquivo certo em `src/validation/rules/` (veja a tabela em ARCHITECTURE.md).
2. Use `issues.error(path, msg)` para o que a Meta rejeitaria e `issues.warning(path, msg)` para
   boas práticas.
3. Novos componentes/ações conhecidos: atualize `validation/constants.ts`.
4. Crie um caso em `tests/validation.test.mjs`.

### Adicionar um exemplo de Flow JSON

Coloque o arquivo em `examples/<nome>.json`. Ele vira automaticamente resource
(`blip://examples/<nome>.json`) e opção da tool `get_flow_json_example`. O teste garante que todo
exemplo é válido e sem avisos.

### Atualizar a documentação servida ao modelo

Edite `docs/reference/blip-commands.md` ou `docs/reference/flow-json.md`. Não precisa recompilar.
