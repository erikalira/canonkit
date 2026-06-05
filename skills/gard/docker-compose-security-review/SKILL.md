# docker-compose-security-review

## Quando usar

Use para revisar Dockerfile, Compose, imagens, build args, env vars, secrets, volumes, mounts, redes, usuarios, capabilities, privileged mode, healthchecks e exposicao de portas.

Use antes de alterar container, servico, rede, volume, gateway, deploy ou runtime.

## Processo

1. Identifique imagens, servicos, portas, redes e volumes afetados.
2. Verifique se segredos entram por build args, env vars, arquivo, mount ou log.
3. Verifique usuario do container, root, privileged mode, capabilities e acesso ao socket Docker.
4. Verifique mounts sensiveis e persistencia de dados.
5. Verifique exposicao de portas e redes compartilhadas.
6. Verifique pinning de imagem, origem confiavel e superficie instalada.
7. Verifique healthcheck, restart policy e logs quando houver impacto de seguranca.
8. Classifique risco: LOW, MEDIUM ou HIGH.
9. Recomende hardening proporcional.
10. Escale para Pipe quando mitigacao exigir mudanca operacional, deploy ou runtime.

## Saida esperada

- Arquivos revisados
- Servicos afetados
- Risco de segredo
- Risco de privilegio
- Risco de rede/exposicao
- Risco de persistencia
- Mitigacoes
- Evidencias esperadas
- Bloqueios
- Dependencias

## Limites

Nao rode Docker ou Compose sem autorizacao explicita. Nao aprove `privileged`, Docker socket, root ou mount sensivel sem justificativa forte.
