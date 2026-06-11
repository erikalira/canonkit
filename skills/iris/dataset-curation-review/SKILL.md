# dataset-curation-review

## Quando usar

Use ao selecionar, revisar ou documentar dataset para treino e avaliação: fonte, licença,
qualidade de anotação, splits e risco de *domain shift*.

## Processo

1. Identifique a fonte (público, sintético, real) e a licença de uso.
2. Avalie a anotação: quem anotou, critério, consistência, presença de verdade-ouro.
3. Verifique cobertura e representatividade frente ao uso real (classes, faixas, condições
   de captura).
4. Defina splits treino/validação/teste sem vazamento (separar por entidade, não por
   amostra correlacionada).
5. Avalie *domain shift* entre dataset e uso real; declare o gap.
6. Sinalize viés e lacunas de representatividade.
7. Escale para o dono de segurança se houver dado real/sensível; para o dono de documentação
   a documentação do dataset.

## Saída esperada

- Fonte e licença
- Qualidade e proveniência da anotação
- Cobertura e representatividade
- Estratégia de split e risco de vazamento
- Risco de domain shift e gap declarado
- Viés identificado
- Dependências e escalonamentos

## Limites

Não treinar com dataset de licença incompatível. Não assumir generalização a partir de uma
única distribuição. Não usar dado real sensível sem aprovação do dono de segurança.
