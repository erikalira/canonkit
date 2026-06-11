# model-risk-traceability

## Quando usar

Use ao garantir rastreabilidade e gestão de risco do modelo: versionamento de modelo e
dataset, reprodutibilidade, model card e necessidades de domínios regulados quando aplicável.

## Processo

1. Versione modelo e dataset de forma imutável e referenciável.
2. Registre proveniência: dados de treino, anotação, hiperparâmetros, métricas, data.
3. Garanta reprodutibilidade do treino e da avaliação.
4. Produza model card: uso pretendido, limitações, população/condições, viés, métricas,
   conjunto de teste, domain shift.
5. Quando o domínio for regulado, mapeie as necessidades de rastreabilidade e gestão de
   risco e escale a responsabilidade regulatória ao dono de produto.
6. Escale para o dono de documentação a documentação durável (model card, decisão) e para
   o dono de plataforma o versionamento operacional/serving.

## Saída esperada

- Esquema de versionamento de modelo e dataset
- Registro de proveniência
- Garantias de reprodutibilidade
- Conteúdo do model card
- Lacunas regulatórias e escalonamento, quando aplicável
- Dependências

## Limites

Não classificar nem submeter regulatório (escalar). Não publicar desempenho sem
rastreabilidade. Não assumir o mercado/jurisdição regulatória; confirmar com o projeto.
