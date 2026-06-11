# model-evaluation-strategy

## Quando usar

Use para definir como medir a qualidade do modelo, em conjunto com o dono de qualidade:
métricas, baseline, conjunto de teste e validação de generalização.

## Processo

1. Defina as métricas adequadas à tarefa (erro/MAE, acurácia, F1, calibração, cobertura)
   com limites aceitáveis.
2. Defina baseline (ex.: heurística simples ou processo atual) para comparação honesta.
3. Defina o conjunto de teste isolado e representativo do uso real.
4. Quando o modelo alimenta um sistema downstream, defina a métrica ponta-a-ponta do
   resultado final usando a saída do modelo vs. a verdade-ouro.
5. Planeje a validação de generalização entre distribuição de treino e de uso real;
   quantifique o *domain shift*.
6. Defina evidências esperadas e relatório versionado por versão de modelo.
7. Co-valide com o dono de qualidade; escale para o dono de produto se a métrica de sucesso
   for ambígua.

## Saída esperada

- Métricas com limites aceitáveis
- Baseline
- Conjunto de teste e representatividade
- Métrica ponta-a-ponta quando houver downstream
- Plano de validação de generalização
- Evidências esperadas
- Dependências e escalonamentos

## Limites

Não reportar acurácia sem baseline e sem conjunto de teste honesto. Não tratar métrica em
uma única distribuição como prova de uso real. Não substituir critério de aceite de produto.
