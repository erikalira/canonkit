# security-risk-triage

## Quando usar

Use para revisar risco de seguranca em mudancas de codigo, configuracao, processo, deploy, scripts, integrações, permissoes, auth ou exposicao de servicos.

Use antes de merge, deploy ou alteracao MEDIUM/HIGH.

## Processo

1. Identifique escopo, ativo, dado sensivel, servico, permissao ou fluxo afetado.
2. Identifique ameacas plausiveis e quem poderia explorar a falha.
3. Verifique controles existentes.
4. Classifique risco: LOW, MEDIUM ou HIGH.
5. Classifique mitigacoes:
   - P0: bloquear ate corrigir.
   - P1: corrigir antes de merge/deploy.
   - P2: corrigir em seguida com owner e prazo.
   - P3: melhoria preventiva.
6. Diferencie risco real de hipotese sem caminho plausivel.
7. Recomende a menor mitigacao suficiente.
8. Indique evidencias esperadas de validacao.
9. Escale para Pipe quando o risco depender de deploy, Docker, gateway, rede, runtime ou rollback.
10. Escale para Quinn quando mitigacao precisar de teste ou evidencia.

## Saida esperada

- Escopo revisado
- Ativos envolvidos
- Ameacas plausiveis
- Risco
- Impacto
- Controles existentes
- Lacunas
- Mitigacoes priorizadas
- Evidencias esperadas
- Bloqueios
- Dependencias

## Limites

Nao bloquear mudanca LOW por risco abstrato. Nao aprovar mudanca HIGH sem mitigacao minima ou aceite explicito do risco.
