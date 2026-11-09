export const BLIP_COMMANDS_REFERENCE = `# WhatsApp Flows na Blip — API de Commands

Todos os commands são enviados via **POST** para \`https://{contrato}.http.msging.net/commands\`
com os headers \`Authorization: Key {chave_do_bot}\` e \`Content-Type: application/json\`.
O destinatário (\`to\`) é sempre \`postmaster@wa.gw.msging.net\`.

| # | Operação | method | uri | resource |
|---|----------|--------|-----|----------|
| 1 | Criar flow | set | /whatsapp-flows | { name, categories[] } |
| 2 | Listar flows | get | /whatsapp-flows/ | — |
| 3 | Detalhes | get | /whatsapp-flows/{flowId} | — |
| 4 | Atualizar metadados | set | /whatsapp-flows/{flowId} | { name?, categories? } |
| 5 | Upload do Flow JSON | set | /whatsapp-flows/flow-json/{flowId} | Flow JSON (version, screens...) |
| 6 | Upload da chave pública | set | /whatsapp-flows/public-key/upload | { business_public_key } |
| 7 | Publicar | get | /whatsapp-flows/publish/{flowId} | — |
| 8 | Assets | get | /whatsapp-flows/assets/{flowId} | — |
| 9 | Depreciar | get | /whatsapp-flows/deprecate/{flowId} | — |
| 10 | Excluir | delete | /whatsapp-flows/{flowId} | — |

Exemplo (criar):
\`\`\`json
{
  "id": "<guid>",
  "to": "postmaster@wa.gw.msging.net",
  "method": "set",
  "type": "application/json",
  "uri": "/whatsapp-flows",
  "resource": { "name": "Meu flow", "categories": ["OTHER"] }
}
\`\`\`

## Ciclo de vida
1. **DRAFT** — criado; pode receber upload de JSON, ser editado e excluído.
2. **PUBLISHED** — após publicar; não pode mais ser editado nem excluído (apenas depreciado).
   Para alterar um flow publicado, crie um novo flow (ou clone o JSON) e publique-o.
3. **DEPRECATED** — não pode mais ser enviado aos usuários.

Categorias válidas: SIGN_UP, SIGN_IN, APPOINTMENT_BOOKING, LEAD_GENERATION, CONTACT_US,
CUSTOMER_SUPPORT, SURVEY, OTHER.

Observações (Blip Help):
- O flow é criado na WABA vinculada ao bot. Guarde o **ID** retornado na criação.
- A listagem/detalhes trazem \`status\` e \`validation_errors\` (que aparecem após o upload do Flow JSON).
- Os detalhes (\`get /whatsapp-flows/{id}\`) trazem o **link de preview** (expira em ~30 dias).
- Os assets (\`get /whatsapp-flows/assets/{id}\`) trazem o link para baixar o Flow JSON atual.
- Publicar passa por aprovação automática da Meta; depois disso o flow **não pode ser editado**.
- Flow nunca publicado pode ser **excluído**; flow publicado só pode ser **depreciado**.

## Flows com endpoint (data channel)
A chave pública (RSA 2048, formato PEM) só é necessária para flows com endpoint
(\`data_exchange\` / \`data_api_version\`). Flows estáticos (navigate + complete) não precisam dela.
**A chave pública vale para um único número** e precisa ser reenviada ao usar o flow com
endpoint em outro número/roteador.

## Enviando o flow ao usuário (Builder > Conteúdo Dinâmico)
Em um bloco do Builder, adicione um **Conteúdo Dinâmico** com o JSON abaixo
(troque \`flow_id\` e \`flow_action_payload.screen\`, que deve ser a primeira tela do Flow JSON):
\`\`\`json
{
  "recipient_type": "individual",
  "messaging_product": "whatsapp",
  "type": "interactive",
  "interactive": {
    "type": "flow",
    "header": { "type": "text", "text": "Título" },
    "body": { "text": "Texto do corpo" },
    "footer": { "text": "Rodapé" },
    "action": {
      "name": "flow",
      "parameters": {
        "flow_message_version": "3",
        "flow_token": "qualquer_string",
        "flow_id": "10323711744212514",
        "flow_cta": "Abrir",
        "flow_action": "navigate",
        "flow_action_payload": { "screen": "WELCOME_SCREEN", "data": { "type": "dynamic_object" } }
      }
    }
  }
}
\`\`\`
Use a tool \`build_flow_message\` para gerar esse JSON automaticamente. Para flows **em DRAFT**,
adicione \`"mode": "draft"\` em \`parameters\` para testar antes de publicar.
`;

export const FLOW_JSON_REFERENCE = `# Guia rápido do Flow JSON (WhatsApp Flows)

## Estrutura raiz
\`\`\`json
{
  "version": "6.3",
  "data_api_version": "3.0",        // apenas para flows com endpoint
  "routing_model": { "A": ["B"] },  // obrigatório se data_api_version existir
  "screens": [ ... ]
}
\`\`\`

## Tela (screen)
- \`id\`: apenas letras e "_" (convenção: MAIÚSCULAS). "SUCCESS" é reservado.
- \`title\`: título exibido no topo.
- \`terminal\`: true na(s) tela(s) final(is). Ao menos uma tela terminal é obrigatória e
  ela precisa de um Footer. A ação \`complete\` só pode ser usada em telas terminais.
- \`data\`: declara os dados recebidos pela tela (via payload do navigate ou endpoint).
  Cada chave: \`{ "type": "string" | "number" | "boolean" | "array" | "object", "__example__": ... }\`.
- \`layout\`: \`{ "type": "SingleColumnLayout", "children": [ ... ] }\`.
- Máximo de 1 Footer por tela.

## Componentes
| Tipo | Propriedades principais |
|------|-------------------------|
| TextHeading / TextSubheading | text |
| TextBody / TextCaption | text, font-weight (bold, italic, bold_italic, normal), strikethrough |
| RichText | text (markdown; v5.1+) |
| TextInput | name, label, input-type (text, number, email, password, passcode, phone), required, min-chars, max-chars, helper-text |
| TextArea | name, label, required, max-length, helper-text |
| Dropdown | name, label, data-source[{id,title}], required |
| RadioButtonsGroup | name, label, data-source[{id,title,description?}], required |
| CheckboxGroup | name, label, data-source, min-selected-items, max-selected-items, required |
| ChipsSelector | name, label, data-source, max-selected-items (v6.3+) |
| DatePicker | name, label, min-date, max-date, unavailable-dates, required |
| CalendarPicker | name, title, label, mode (single/range) (v6.1+) |
| OptIn | name, label, required, on-click-action (open_url/navigate) |
| EmbeddedLink | text, on-click-action |
| Image | src (base64, recomendado ≤ 300 KB), width, height, scale-type (cover/contain), alt-text |
| ImageCarousel | images[{src, alt-text}] (v7.1+) |
| PhotoPicker / DocumentPicker | name, label, min/max-uploaded-photos/documents (exigem endpoint) |
| NavigationList | name, list-items, on-click-action (v6.2+) |
| If | condition, then[], else[] |
| Switch | value, cases{ valor: [componentes] } |
| Form | name, children[], init-values, error-messages (opcional nas versões recentes) |
| Footer | label, on-click-action, left-caption/right-caption/center-caption |

## Ações (on-click-action / on-select-action)
- \`navigate\`: \`{ "name": "navigate", "next": { "type": "screen", "name": "TELA" }, "payload": { ... } }\`
- \`complete\`: \`{ "name": "complete", "payload": { ... } }\` — encerra o flow e envia o payload
  de volta para o bot (mensagem de resposta \`nfm_reply\`).
- \`data_exchange\`: \`{ "name": "data_exchange", "payload": { ... } }\` — chama o endpoint.
- \`update_data\` (v6.0+) e \`open_url\` (v6.0+, em EmbeddedLink/OptIn).

## Referências dinâmicas
- \`\${form.campo}\` — valor de um campo da tela atual.
- \`\${data.campo}\` — valor declarado em \`screen.data\`.
- Expressões e concatenação (v6.0+): \`"\`'Olá ' \${data.nome}\`"\`.

## Boas práticas
- Use nomes de campo em snake_case e ids de tela em MAIÚSCULAS.
- Passe adiante, no payload do navigate, todos os dados que telas seguintes precisam.
- Mantenha cada tela curta (poucos campos) e títulos objetivos.
- Valide localmente (tool \`validate_flow_json\`) antes do upload; depois do upload, confira
  \`validation_errors\` na resposta da Blip/Meta.
- Publicar é irreversível: teste no preview (asset/preview) antes.
`;
