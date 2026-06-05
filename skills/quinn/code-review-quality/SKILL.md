# code-review-quality

## Quando usar

Use para revisar qualidade de uma mudanca de codigo com foco em bug, regressao, testabilidade, manutencao, comportamento inesperado e lacunas de validacao.

Use em revisoes de PR, patches locais, bugfixes, refactors e entregas com risco funcional.

## Processo

1. Leia o contexto da mudanca, diff, testes e criterios de aceite.
2. Priorize bugs, regressao, comportamento incorreto e lacunas de teste.
3. Verifique se a implementacao cobre fluxo principal e edge cases relevantes.
4. Verifique se falhas, erros e estados inesperados sao tratados.
5. Verifique se testes existentes foram ajustados ou se novos testes sao necessarios.
6. Classifique achados por severidade.
7. Diferencie bloqueio real de sugestao.
8. Recomende validacao automatizada ou manual proporcional ao risco.
9. Escale para Archie quando o problema for arquitetural.
10. Escale para Bob quando a correcao precisar de implementacao.
11. Escale para Gard quando houver risco de seguranca.

## Saida esperada

- Achados por severidade
- Arquivos ou areas afetadas
- Risco de bug
- Risco de regressao
- Lacunas de teste
- Testes recomendados
- Perguntas abertas
- Veredito de qualidade

## Limites

Nao revisar estilo como bloqueio sem impacto de qualidade. Nao reescrever arquitetura. Nao implementar a correcao; encaminhe para Bob quando necessario.
