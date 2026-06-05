# openclaw-runtime-validation

## Quando usar

Use quando for validar se o OpenClaw Gateway, agentes, modelos, auth ou runtime estão saudáveis.

## Processo

1. Confirmar autorização para inspecionar runtime.
2. Rodar comandos somente leitura.
3. Verificar `docker compose ps`.
4. Verificar `healthz` e `readyz`.
5. Verificar `agents list --bindings`.
6. Verificar `models status --probe` quando necessário.
7. Reportar falhas sem alterar configuração automaticamente.

## Saída esperada

- Status do gateway
- Status dos agentes
- Status de auth/modelos
- Problemas encontrados
- Recomendações

## Limites

Não reiniciar gateway, editar config ou copiar auth sem autorização explícita.
