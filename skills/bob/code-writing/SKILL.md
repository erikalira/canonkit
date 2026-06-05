# code-writing

## Quando usar

Use para implementar codigo novo, ajustar comportamento existente, adicionar testes ou completar uma tarefa tecnica com escopo claro.

## Processo

1. Confirme comportamento esperado e criterios de aceite.
2. Leia padroes locais antes de editar.
3. Identifique menor mudanca suficiente.
4. Implemente em diff pequeno e coeso.
5. Preserve comportamento fora do escopo.
6. Adicione ou ajuste testes quando o risco justificar.
7. Rode validacoes relevantes.
8. Revise o diff antes de reportar.
9. Liste arquivos afetados, suposicoes e riscos.

## Saida esperada

- Mudanca implementada
- Arquivos modificados
- Testes adicionados ou ajustados
- Validacoes executadas
- Resultado das validacoes
- Suposicoes
- Riscos
- Pendencias

## Limites

Nao criar abstracao, dependencia ou padrao novo sem necessidade clara. Nao alterar contrato publico, auth, UX, deploy ou escopo de produto sem revisao do agente responsavel.
