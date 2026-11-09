# WhatsApp Flows MCP (Blip)

Servidor **MCP (Model Context Protocol)** para construir e gerenciar **WhatsApp Flows** usando a
**API de Commands da Blip**. Com ele, o Claude (ou qualquer cliente MCP) consegue projetar o
Flow JSON, validar, criar o flow na WABA do bot, enviar o JSON, conferir o preview, publicar,
depreciar/excluir e gerar o JSON de envio para o Builder.

Baseado na collection Postman _"WA Flows no Blip"_ e no artigo do Blip Help
[O que é o WhatsApp Flows](https://help.blip.ai/hc/pt-br/articles/19143153044375-O-que-%C3%A9-o-WhatsApp-Flows).

## Tools

| Tool                    | Command Blip                            | Descrição                                                         |
| ----------------------- | --------------------------------------- | ----------------------------------------------------------------- |
| `create_flow`           | `set /whatsapp-flows`                   | Cria um flow (DRAFT) e retorna o `flow_id`                        |
| `list_flows`            | `get /whatsapp-flows/`                  | Lista flows, status e `validation_errors`                         |
| `get_flow`              | `get /whatsapp-flows/{id}`              | Detalhes + link de preview (~30 dias)                             |
| `update_flow_metadata`  | `set /whatsapp-flows/{id}`              | Altera nome/categorias                                            |
| `upload_flow_json`      | `set /whatsapp-flows/flow-json/{id}`    | Envia o Flow JSON (valida antes)                                  |
| `get_flow_assets`       | `get /whatsapp-flows/assets/{id}`       | Assets (link do JSON atual)                                       |
| `download_flow_json`    | assets + download                       | Baixa o Flow JSON atual                                           |
| `publish_flow`          | `get /whatsapp-flows/publish/{id}`      | Publica (**irreversível**, exige `confirm: true`)                 |
| `deprecate_flow`        | `get /whatsapp-flows/deprecate/{id}`    | Deprecia flow publicado (`confirm: true`)                         |
| `delete_flow`           | `delete /whatsapp-flows/{id}`           | Exclui flow nunca publicado (`confirm: true`)                     |
| `upload_public_key`     | `set /whatsapp-flows/public-key/upload` | Chave pública (flows com endpoint)                                |
| `create_flow_with_json` | create + upload + details               | Atalho: cria o flow completo em DRAFT                             |
| `validate_flow_json`    | — (local)                               | Valida estrutura, navegação, telas terminais, Footer, referências |
| `build_flow_message`    | — (local)                               | Gera o JSON de Conteúdo Dinâmico do Builder para enviar o flow    |
| `get_flow_json_example` | — (local)                               | Exemplos prontos (`examples/`)                                    |

**Resources:** `blip://docs/commands`, `blip://docs/flow-json`, `blip://examples/*.json`
**Prompt:** `design_whatsapp_flow` — guia o modelo do objetivo até o flow criado.

## Configuração

Pegue as credenciais no portal da Blip: bot > **Configurações > Informações de conexão**
(_Authorization_ e _URL para enviar comandos_).

| Variável            | Obrigatória | Descrição                                                      |
| ------------------- | ----------- | -------------------------------------------------------------- |
| `BLIP_API_KEY`      | sim         | Header Authorization (`Key xxxx`; o prefixo `Key ` é opcional) |
| `BLIP_CONTRACT_ID`  | *           | Contrato → `https://{id}.http.msging.net/commands`             |
| `BLIP_COMMANDS_URL` | *           | URL completa de commands (sobrepõe `BLIP_CONTRACT_ID`)         |
| `BLIP_FLOWS_TO`     | não         | Padrão `postmaster@wa.gw.msging.net`                           |
| `BLIP_TIMEOUT_MS`   | não         | Padrão `60000`                                                 |
| `MCP_AUTH_TOKEN`    | modo HTTP   | Exige `Authorization: Bearer <token>` no endpoint remoto       |

\* Informe um dos dois.

## Uso local (stdio)

```bash
npm install
npm run build
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "whatsapp-flows-blip": {
      "command": "node",
      "args": ["/caminho/para/whatsapp_flows_mcp/dist/transports/stdio.js"],
      "env": {
        "BLIP_API_KEY": "Key SUA_CHAVE",
        "BLIP_CONTRACT_ID": "seu-contrato"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add whatsapp-flows-blip -e BLIP_API_KEY="Key SUA_CHAVE" -e BLIP_CONTRACT_ID=seu-contrato -- node /caminho/para/whatsapp_flows_mcp/dist/transports/stdio.js
```

### Testar com o MCP Inspector

```bash
BLIP_API_KEY="Key SUA_CHAVE" BLIP_CONTRACT_ID=seu-contrato npm run inspector
```

## Uso remoto (HTTP) — Azure Functions

O mesmo servidor é exposto via **Streamable HTTP** (sem estado) em uma Azure Function.
Escolhemos **Azure Functions** em vez de Static Web Apps porque um servidor MCP precisa
executar código a cada requisição; Static Web Apps serve apenas conteúdo estático.

```
POST https://<app>.azurewebsites.net/api/mcp      (MCP)
GET  https://<app>.azurewebsites.net/api/health   (health check)
```

Segurança (camadas combináveis):

- **Chave da função** (`authLevel: function`): `?code=<chave>` na URL ou header `x-functions-key`.
- **`MCP_AUTH_TOKEN`**: exige `Authorization: Bearer <token>`.
- Credenciais da Blip ficam nas **App Settings** da Function, nunca no repositório.
- **Multi-bot (opcional):** os headers `X-Blip-Api-Key`, `X-Blip-Contract-Id` e
  `X-Blip-Commands-Url` sobrepõem as App Settings por requisição.

### Rodar localmente

Sem Azure Functions Core Tools:

```bash
npm run build
BLIP_API_KEY="Key SUA_CHAVE" BLIP_CONTRACT_ID=seu-contrato PORT=3000 npm run start:http
```

Com Core Tools (`func`): copie `local.settings.example.json` para `local.settings.json`, preencha e:

```bash
npm run start:func
```

### Publicar no Azure

Opção A — script (Azure CLI):

```bash
export RG=rg-whatsapp-flows-mcp LOCATION=brazilsouth APP=wa-flows-mcp-123 STORAGE=waflowsmcp123
export BLIP_API_KEY="Key SUA_CHAVE" BLIP_CONTRACT_ID=seu-contrato MCP_AUTH_TOKEN="$(openssl rand -hex 32)"
./infra/deploy-azure.sh
```

Opção B — GitHub Actions: workflow manual `.github/workflows/deploy-azure-functions.yml`
(configure o secret `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` e a variável `AZURE_FUNCTIONAPP_NAME`).

Opção C — VS Code (extensão Azure Functions): abra a pasta do projeto, clique com o botão direito no
Function App na aba Azure e escolha **Deploy to Function App**. As tasks em `.vscode/` fazem
`npm install` → `clean` → `build` → `npm prune --omit=dev` antes do envio e `npm install` depois
(para restaurar as dependências de desenvolvimento). Cadastre `BLIP_API_KEY`, `BLIP_CONTRACT_ID` e
`MCP_AUTH_TOKEN` em **Application Settings** do Function App.

### Conectar clientes ao endpoint remoto

Claude Code:

```bash
claude mcp add --transport http whatsapp-flows-blip "https://<app>.azurewebsites.net/api/mcp?code=<CHAVE_FUNCAO>" --header "Authorization: Bearer <MCP_AUTH_TOKEN>"
```

Claude (web/desktop) > **Configurações > Conectores > Adicionar conector personalizado**: use a URL
com `?code=<CHAVE_FUNCAO>`. Como conectores personalizados não enviam headers fixos, nesse caso deixe
`MCP_AUTH_TOKEN` vazio e proteja com a chave da função.

## Fluxo de trabalho recomendado

1. Descreva o flow ao Claude (ou use o prompt `design_whatsapp_flow`).
2. O modelo escreve o Flow JSON e roda `validate_flow_json` até zerar erros.
3. `create_flow_with_json` → flow em **DRAFT** com `flow_id`, `validation_errors` e link de preview.
4. Teste: `build_flow_message` com `draft_mode: true` e cole no Builder (bloco > **Conteúdo Dinâmico**).
5. `publish_flow` (com sua confirmação). Depois de publicado não há edição: para mudar, crie outro flow.
6. Para flows com endpoint (_data channel_): `upload_public_key` — a chave vale **por número**.

A resposta do usuário ao concluir o flow chega ao bot como mensagem interativa (`nfm_reply`) com o
`payload` da ação `complete`.

## Desenvolvimento

```bash
npm run check   # lint + formatação + testes (o mesmo que a CI roda)
```

- Arquitetura e responsabilidades de cada pasta: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Como adicionar commands, tools, regras de validação e exemplos: [CONTRIBUTING.md](CONTRIBUTING.md)

```
src/
  config/        configuração (env + overrides por requisição)
  blip/          cliente da API de Commands (LIME/HTTP) e erros
  flows/         domínio WhatsApp Flows: commands, categorias, mensagem de envio
  validation/    validador do Flow JSON (orquestrador + rules/)
  mcp/           servidor MCP: tools/, resources, prompts, resultados
  transports/    stdio, http/ (Node e handler Web) e azure/ (Azure Functions)
  shared/        utilitários puros
docs/reference/  documentação servida ao modelo como resources
examples/        Flow JSONs de exemplo (validados pelos testes)
tests/           testes (node:test)
infra/           script de deploy no Azure
```
