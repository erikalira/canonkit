# edge-case-analysis

## Quando usar

Use para identificar edge cases, limites de dados, estados raros, falhas plausiveis, concorrencia, permissao, entradas invalidas ou combinacoes de fluxo que podem gerar bugs.

Use quando a mudanca envolver regras, formularios, dados, integracoes, auth, estados de UI, migracoes, jobs ou comportamento compartilhado.

## Processo

1. Identifique regra, fluxo, componente ou contrato afetado.
2. Procure spec, PRD, testes existentes, codigo, bug reports e limites conhecidos.
3. Liste entradas validas, invalidas, vazias, minimas, maximas e duplicadas.
4. Liste estados de permissao, auth, sessao expirada e acesso negado quando aplicavel.
5. Liste falhas externas: API indisponivel, timeout, resposta parcial ou dados inconsistentes.
6. Liste concorrencia, repeticao de acao, refresh, retry e navegacao interrompida quando aplicavel.
7. Classifique edge cases por probabilidade e impacto.
8. Separe casos relevantes de cenarios improvaveis sem dano claro.
9. Recomende testes ou mitigacoes proporcionais.
10. Escale para Gard quando houver seguranca, auth, dados sensiveis ou abuso.
11. Escale para Archie quando edge case revelar problema de contrato, dados ou arquitetura.

## Saida esperada

- Escopo analisado
- Edge cases relevantes
- Probabilidade e impacto
- Casos descartados e motivo
- Testes recomendados
- Mitigacoes
- Dependencias
- Lacunas de contexto

## Limites

Nao inflar escopo com casos teoricos sem impacto plausivel. Nao decidir seguranca ou arquitetura sozinho. Nao tratar todos os edge cases como bloqueadores.
