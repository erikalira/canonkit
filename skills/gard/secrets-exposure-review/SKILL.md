# secrets-exposure-review

## Quando usar

Use para revisar risco de exposicao de tokens, chaves, credenciais, `.env`, auth profiles, logs sensiveis, caches, sessoes, bancos SQLite, imagens Docker ou outputs de scripts.

Use sempre que uma mudanca tocar configuracao, deploy, runtime, logs, CI, scripts ou arquivos que possam carregar segredo.

## Processo

1. Identifique onde o segredo entra, circula, e sai do sistema.
2. Verifique se valores sensiveis aparecem em Git, imagem, log, output, prompt, cache ou artefato.
3. Verifique se placeholders seguros sao usados em templates.
4. Verifique permissao de arquivos, mounts, volumes e diretórios sensiveis.
5. Verifique se ha plano de rotacao quando houver suspeita de exposicao.
6. Classifique o risco: LOW, MEDIUM ou HIGH.
7. Defina bloqueios P0/P1 quando segredo real puder ter sido exposto.
8. Recomende mitigacao: remover, redigir, rotacionar, mover para secret store ou reduzir acesso.
9. Indique evidencias esperadas sem pedir que valores sensiveis sejam revelados.
10. Escale para Pipe quando envolver runtime, deploy, CI, Docker ou gateway.

## Saida esperada

- Fonte do segredo
- Caminho de exposicao
- Arquivos ou artefatos afetados
- Risco
- Impacto
- Mitigacao recomendada
- Necessidade de rotacao
- Evidencias esperadas
- Bloqueios
- Dependencias

## Limites

Nao solicite, copie ou imprima valores de segredo. Nao edite auth profiles, `.env`, logs, caches, bancos SQLite ou sessoes sem autorizacao explicita.
