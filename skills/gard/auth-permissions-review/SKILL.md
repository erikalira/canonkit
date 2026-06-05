# auth-permissions-review

## Quando usar

Use para revisar autenticacao, autorizacao, sessoes, roles, allowlists, permissões, escopos de token, acesso administrativo ou fronteiras entre usuarios e agentes.

Use antes de mudancas que afetem login, API protegida, acao destrutiva, dados sensiveis, pagamento, runtime ou operacao.

## Processo

1. Identifique sujeito, recurso, acao e contexto.
2. Verifique como autenticacao e estabelecida.
3. Verifique onde autorizacao e aplicada.
4. Procure bypass plausivel, permissao ampla, escalation path ou default inseguro.
5. Verifique expiracao, revogacao, escopo e propagacao de sessoes ou tokens.
6. Verifique comportamento de erro para evitar vazamento de informacao.
7. Classifique risco: LOW, MEDIUM ou HIGH.
8. Recomende menor permissao suficiente.
9. Defina testes ou evidencias esperadas para casos permitido, negado e expirado.
10. Escale para Quinn quando os cenarios precisarem virar estrategia de teste.

## Saida esperada

- Sujeito
- Recurso
- Acao
- Modelo de auth
- Permissoes requeridas
- Riscos de bypass
- Riscos de escalada
- Mitigacoes
- Evidencias esperadas
- Bloqueios

## Limites

Nao aprove permissao ampla sem justificativa. Nao assumir que autenticacao implica autorizacao.
