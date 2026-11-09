# Guia rápido do Flow JSON (WhatsApp Flows)

## Estrutura raiz

```json
{
  "version": "7.3",
  "data_api_version": "3.0",        // apenas para flows com endpoint
  "routing_model": { "A": ["B"] },  // obrigatório se data_api_version existir
  "screens": [ ... ]
}
```

## Tela (screen)

- `id`: apenas letras e "_" (convenção: MAIÚSCULAS). "SUCCESS" é reservado.
- `title`: título exibido no topo.
- `terminal`: true na(s) tela(s) final(is). Ao menos uma tela terminal é obrigatória e
  ela precisa de um Footer. A ação `complete` só pode ser usada em telas terminais.
- `data`: declara os dados recebidos pela tela (via payload do navigate ou endpoint).
  Cada chave: `{ "type": "string" | "number" | "boolean" | "array" | "object", "__example__": ... }`.
- `layout`: `{ "type": "SingleColumnLayout", "children": [ ... ] }`.
- Máximo de 1 Footer por tela.

## Componentes

| Tipo                         | Propriedades principais                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| TextHeading / TextSubheading | text                                                                                                                  |
| TextBody / TextCaption       | text, font-weight (bold, italic, bold_italic, normal), strikethrough                                                  |
| RichText                     | text (markdown; v5.1+)                                                                                                |
| TextInput                    | name, label, input-type (text, number, email, password, passcode, phone), required, min-chars, max-chars, helper-text |
| TextArea                     | name, label, required, max-length, helper-text                                                                        |
| Dropdown                     | name, label, data-source[{id,title}], required                                                                        |
| RadioButtonsGroup            | name, label, data-source[{id,title,description?}], required                                                           |
| CheckboxGroup                | name, label, data-source, min-selected-items, max-selected-items, required                                            |
| ChipsSelector                | name, label, data-source, max-selected-items (v6.3+)                                                                  |
| DatePicker                   | name, label, min-date, max-date, unavailable-dates, required                                                          |
| CalendarPicker               | name, title, label, mode (single/range) (v6.1+)                                                                       |
| OptIn                        | name, label, required, on-click-action (open_url/navigate)                                                            |
| EmbeddedLink                 | text, on-click-action                                                                                                 |
| Image                        | src (base64, recomendado ≤ 300 KB), width, height, scale-type (cover/contain), alt-text                               |
| ImageCarousel                | images[{src, alt-text}] (v7.1+)                                                                                       |
| PhotoPicker / DocumentPicker | name, label, min/max-uploaded-photos/documents (exigem endpoint)                                                      |
| NavigationList               | name, list-items, on-click-action (v6.2+)                                                                             |
| If                           | condition, then[], else[]                                                                                             |
| Switch                       | value, cases{ valor: [componentes] }                                                                                  |
| Form                         | name, children[], init-values, error-messages (opcional nas versões recentes)                                         |
| Footer                       | label, on-click-action, left-caption/right-caption/center-caption                                                     |

## Ações (on-click-action / on-select-action)

- `navigate`: `{ "name": "navigate", "next": { "type": "screen", "name": "TELA" }, "payload": { ... } }`
- `complete`: `{ "name": "complete", "payload": { ... } }` — encerra o flow e envia o payload
  de volta para o bot (mensagem de resposta `nfm_reply`).
- `data_exchange`: `{ "name": "data_exchange", "payload": { ... } }` — chama o endpoint.
- `update_data` (v6.0+) e `open_url` (v6.0+, em EmbeddedLink/OptIn).

## Referências dinâmicas

- `${form.campo}` — valor de um campo da tela atual.
- `${data.campo}` — valor declarado em `screen.data`.
- Expressões e concatenação (v6.0+): `"`'Olá ' ${data.nome}`"`.

## Boas práticas

- Use nomes de campo em snake_case e ids de tela em MAIÚSCULAS.
- Passe adiante, no payload do navigate, todos os dados que telas seguintes precisam.
- Mantenha cada tela curta (poucos campos) e títulos objetivos.
- Valide localmente (tool `validate_flow_json`) antes do upload; depois do upload, confira
  `validation_errors` na resposta da Blip/Meta.
- Publicar é irreversível: teste no preview (asset/preview) antes.
