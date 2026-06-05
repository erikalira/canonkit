# docker-compose-review

## Quando usar

Use para revisar Dockerfile, Compose, imagens, volumes, redes, portas, env vars, healthchecks, restart policy e comportamento local/staging/producao.

## Processo

1. Identifique servicos, imagens, portas, volumes e redes afetados.
2. Diferencie uso local, staging e producao.
3. Verifique healthchecks, restart policy e dependencias entre servicos.
4. Verifique persistencia, backup e risco de perda de dados.
5. Verifique exposicao de portas e redes.
6. Verifique configuracao por ambiente sem abrir valores sensiveis.
7. Verifique logs e observabilidade operacional.
8. Classifique risco: LOW, MEDIUM ou HIGH.
9. Recomende validacoes antes de rodar Docker/Compose.
10. Escale para Gard quando houver secrets, permissao, rede, auth ou exposicao.

## Saida esperada

- Arquivos revisados
- Servicos afetados
- Ambiente
- Portas/redes
- Volumes/persistencia
- Health/readiness
- Risco operacional
- Lacunas
- Validacoes recomendadas
- Dependencias

## Limites

Nao rode Docker ou Compose sem autorizacao explicita. Nao aprovar mudanca de producao sem considerar rollback, persistencia e observabilidade.
