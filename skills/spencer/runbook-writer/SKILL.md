# runbook-writer

## Quando usar

Use para criar ou atualizar runbooks de operação, deploy, rollback, incidentes, jobs, filas, observabilidade ou tarefas recorrentes.

## Processo

1. Procure runbook existente, ADR, spec, código operacional, scripts, logs seguros, dashboards, alertas, issues e PRs.
2. Defina objetivo operacional, pré-condições, sinais de sucesso e sinais de falha.
3. Documente passos mínimos, verificações, rollback e contatos ou responsáveis.
4. Separe comandos seguros de comandos destrutivos ou sensíveis.
5. Registre lacunas quando faltar evidência operacional.
6. Peça revisão de Pipe para deploy, operação, rollback, jobs, filas ou observabilidade.
7. Peça revisão de Gard quando houver auth, secrets, permissões ou dados sensíveis.

## Saída esperada

- Objetivo
- Quando executar
- Pré-condições
- Passos
- Verificações
- Rollback
- Sinais de falha
- Referências
- Lacunas
- Revisores necessários

## Limites

Não execute operação, deploy, docker compose, restart ou sync ao escrever runbook. Não inclua tokens, secrets, `.env`, auth profiles, logs sensíveis ou dados privados. Não invente comandos sem validação de Pipe.
