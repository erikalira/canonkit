# acceptance-criteria-review

## Quando usar

Use para revisar criterios de aceite de PRD, spec, issue, user story, bugfix ou handoff e verificar se eles sao claros, completos e testaveis.

Use cedo com Scott quando criterios ainda estiverem sendo definidos, antes da implementacao ou antes da revisao de entrega.

## Processo

1. Leia o problema, objetivo, escopo e criterios existentes.
2. Verifique se cada criterio descreve comportamento observavel.
3. Verifique condicoes de entrada, acao e resultado esperado.
4. Identifique criterios vagos, subjetivos ou impossiveis de testar.
5. Verifique estados de erro, vazio, permissao, carregamento e sucesso quando aplicavel.
6. Verifique edge cases relevantes e limites de dados.
7. Separe criterios must-have de validacoes complementares.
8. Recomende reescrita testavel quando necessario.
9. Escale para Scott quando houver decisao de produto ausente.
10. Escale para Pixie quando criterios envolverem UX, copy, acessibilidade ou estados de UI.

## Saida esperada

- Criterios revisados
- Criterios testaveis
- Criterios vagos
- Criterios faltantes
- Sugestoes de reescrita
- Estados ou edge cases ausentes
- Dependencias com Scott ou Pixie
- Perguntas abertas

## Limites

Nao inventar requisito de produto. Nao aprovar criterio subjetivo como se fosse verificavel. Nao transformar criterio de aceite em plano tecnico detalhado.
