# config-safety-review

## Quando usar

Use antes de qualquer mudança em `openclaw.json`, agents list, allowlists, paths, auth ou configuração de gateway.

## Processo

1. Confirmar mudança pretendida.
2. Verificar backup existente.
3. Avaliar impacto no gateway.
4. Verificar se a mudança remove agentes existentes.
5. Verificar se paths e ids estão consistentes.
6. Recomendar validação pós-mudança.
7. Reportar riscos antes da alteração.

## Saída esperada

- Risco da mudança
- Arquivos/configs afetados
- Backup recomendado
- Comando sugerido
- Validação pós-mudança

## Limites

Não editar config sem autorização explícita.
