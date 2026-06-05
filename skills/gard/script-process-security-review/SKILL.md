# script-process-security-review

## Quando usar

Use para revisar scripts, comandos operacionais, fluxos de sync, automacoes, migracoes, backups, cleanup, deploy, restart, gateway, auth ou manipulacao de arquivos sensiveis.

Use antes de rodar ou versionar script que possa alterar runtime, permissao, config, secrets, dados persistidos ou estado operacional.

## Processo

1. Identifique o objetivo do script e quem deve roda-lo.
2. Verifique arquivos, diretorios, variaveis e comandos afetados.
3. Verifique se o script manipula segredos, auth, `.env`, logs, caches, bancos SQLite ou sessoes.
4. Verifique uso de comandos destrutivos, globs amplos, paths relativos, permissao excessiva e falta de dry-run.
5. Verifique idempotencia, backup, rollback e mensagens de erro.
6. Verifique se outputs podem vazar dados sensiveis.
7. Classifique risco: LOW, MEDIUM ou HIGH.
8. Recomende guardrails: confirmacao, dry-run, allowlist, backup, redacao de output ou menor permissao.
9. Indique evidencias esperadas de validacao.
10. Escale para Pipe quando envolver deploy, Docker, gateway, runtime ou sync operacional.

## Saida esperada

- Script ou processo revisado
- Estado afetado
- Dados sensiveis envolvidos
- Riscos
- Mitigacoes
- Guardrails recomendados
- Evidencias esperadas
- Bloqueios
- Dependencias

## Limites

Nao rode scripts de sync, deploy, Docker, restart, auth ou runtime sem autorizacao explicita. Nao aprove script destrutivo sem guardrails proporcionais.
