# Arquitetura

O projeto é dividido em camadas com dependências em **uma única direção**:

```
transports  ──▶  mcp  ──▶  flows  ──▶  blip  ──▶  config
                   │         │
                   └──▶ validation ──▶ shared
```

Uma camada nunca importa uma camada acima dela. Assim, a lógica de negócio (flows, validação)
não sabe nada de MCP ou HTTP, e pode ser testada isoladamente.

## Camadas

| Pasta             | Responsabilidade                                                                              | Não deve conter                   |
| ----------------- | --------------------------------------------------------------------------------------------- | --------------------------------- |
| `src/config/`     | Ler e normalizar configuração (env + overrides por requisição)                                | Chamadas HTTP                     |
| `src/blip/`       | Cliente genérico da API de Commands (envelope LIME, erros, timeout)                           | Nada específico de WhatsApp Flows |
| `src/flows/`      | Domínio WhatsApp Flows: URIs dos commands, categorias, mensagem de envio, parsers de resposta | Código MCP                        |
| `src/validation/` | Validador local do Flow JSON, dividido em regras                                              | Chamadas de rede                  |
| `src/mcp/`        | Adaptação para MCP: tools, resources, prompts, formatação de resultados                       | Regras de negócio                 |
| `src/transports/` | Como o servidor é exposto: stdio, HTTP (Node) e Azure Functions                               | Tools ou regras                   |
| `src/shared/`     | Utilitários puros (JSON, caminhos)                                                            | Dependências de outras camadas    |

## Fluxo de uma chamada de tool

```
Cliente MCP ─▶ transport (stdio/HTTP/Azure)
            ─▶ mcp/createServer ─▶ tools/<grupo>Tools.ts
            ─▶ flows/flowsApi.ts (monta method + uri + resource)
            ─▶ blip/blipClient.ts (envelope LIME, POST /commands, trata erros)
            ◀─ CommandResponse ─▶ mcp/toolResult.ts (success/failure)
```

## Validador de Flow JSON

`validation/validateFlowJson.ts` é apenas o **orquestrador**. Cada grupo de regras fica em
`validation/rules/`:

| Arquivo             | Regras                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `rootRules.ts`      | `version`, tamanho máximo, `screens`                                                                 |
| `screenRules.ts`    | id da tela, `title`, `data`, `layout`, Footer, tela terminal, ação `complete`                        |
| `componentRules.ts` | percorre componentes (incl. `If`/`Switch`), Footer, Image, opções de escolha, nomes de campo         |
| `actionRules.ts`    | `on-click-action` e similares, `navigate.next`                                                       |
| `referenceRules.ts` | `${form.*}` e `${data.*}`                                                                            |
| `flowRules.ts`      | regras que dependem do flow inteiro: destinos de navegação, tela terminal, endpoint, `routing_model` |

Durante a análise de uma tela, os fatos são coletados em um `ScreenContext`
(`validation/screenContext.ts`) e os problemas em um `IssueCollector` (erros bloqueiam; avisos não).

## Decisões

- **Servidor sem estado no HTTP:** cada requisição cria um `McpServer` novo. Simples, escala
  horizontalmente e combina com Azure Functions.
- **API da Blip criada sob demanda:** tools offline (validação, exemplos, mensagem) funcionam sem
  credenciais.
- **Ações irreversíveis exigem `confirm: true`:** publicar, depreciar e excluir.
- **Documentação de referência em Markdown (`docs/reference/`)**: editável sem mexer em código e
  servida como resources MCP.
