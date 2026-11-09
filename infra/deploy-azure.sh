#!/usr/bin/env bash
# Provisiona (se necessário) e publica o MCP em Azure Functions (plano Flex Consumption, Node 22).
# Pré-requisitos: Azure CLI logado (az login), Node 18+, zip.
#
# Uso:
#   export RG=rg-whatsapp-flows-mcp LOCATION=brazilsouth APP=wa-flows-mcp-<sufixo> STORAGE=waflowsmcp<sufixo>
#   export BLIP_API_KEY="Key xxxx" BLIP_CONTRACT_ID="seu-contrato" MCP_AUTH_TOKEN="$(openssl rand -hex 32)"
#   ./infra/deploy-azure.sh
set -euo pipefail

: "${RG:?defina RG}"; : "${LOCATION:?defina LOCATION}"; : "${APP:?defina APP}"; : "${STORAGE:?defina STORAGE}"

cd "$(dirname "$0")/.."

if ! az functionapp show -g "$RG" -n "$APP" >/dev/null 2>&1; then
  echo ">> Criando recursos..."
  az group create -n "$RG" -l "$LOCATION" -o none
  az storage account create -n "$STORAGE" -g "$RG" -l "$LOCATION" --sku Standard_LRS --allow-blob-public-access false -o none
  az functionapp create -g "$RG" -n "$APP" --storage-account "$STORAGE" \
    --flexconsumption-location "$LOCATION" --runtime node --runtime-version 22 -o none
fi

echo ">> Configurando app settings..."
SETTINGS=()
[[ -n "${BLIP_API_KEY:-}" ]] && SETTINGS+=("BLIP_API_KEY=$BLIP_API_KEY")
[[ -n "${BLIP_CONTRACT_ID:-}" ]] && SETTINGS+=("BLIP_CONTRACT_ID=$BLIP_CONTRACT_ID")
[[ -n "${BLIP_COMMANDS_URL:-}" ]] && SETTINGS+=("BLIP_COMMANDS_URL=$BLIP_COMMANDS_URL")
[[ -n "${MCP_AUTH_TOKEN:-}" ]] && SETTINGS+=("MCP_AUTH_TOKEN=$MCP_AUTH_TOKEN")
if (( ${#SETTINGS[@]} )); then
  az functionapp config appsettings set -g "$RG" -n "$APP" --settings "${SETTINGS[@]}" -o none
fi

echo ">> Build e pacote..."
rm -rf .deploy && mkdir .deploy
npm ci
npm run build
cp -r dist docs examples host.json package.json package-lock.json .deploy/
(cd .deploy && npm ci --omit=dev && zip -qr ../app.zip .)
rm -rf .deploy

echo ">> Publicando..."
az functionapp deployment source config-zip -g "$RG" -n "$APP" --src app.zip -o none
rm -f app.zip

KEY=$(az functionapp function keys list -g "$RG" -n "$APP" --function-name mcp --query default -o tsv 2>/dev/null || true)
echo
echo "Endpoint MCP: https://$APP.azurewebsites.net/api/mcp"
[[ -n "$KEY" ]] && echo "Com chave da função: https://$APP.azurewebsites.net/api/mcp?code=$KEY"
echo "Health:       https://$APP.azurewebsites.net/api/health"
