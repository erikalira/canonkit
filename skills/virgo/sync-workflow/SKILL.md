# sync-workflow

## Quando usar

Use para sincronizar agentes e skills do repo `openclaw-team-config` para o runtime `~/.openclaw`.

## Processo

1. Confirmar autorização explícita para sync.
2. Rodar script de sync apropriado.
3. Validar arquivos copiados.
4. Não editar config automaticamente.
5. Não reiniciar gateway automaticamente.
6. Reportar resultado.

## Saída esperada

- Agente sincronizado
- Arquivos copiados
- Validação de presença
- Próxima etapa necessária

## Limites

Não sincronizar auth profiles, tokens ou segredos. Use fluxo específico e autorizado para auth.
