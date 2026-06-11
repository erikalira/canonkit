# inference-confidence-review

## Quando usar

Use ao definir ou revisar como o modelo expressa confiança e como trata baixa confiança,
garantindo o princípio "a IA propõe; o domínio decide" quando o contexto exige supervisão.

## Processo

1. Defina o sinal de confiança por predição (calibração, faixa, significado).
2. Defina o limiar abaixo do qual a predição é sinalizada como sugestão fraca.
3. Garanta que nenhum campo de decisão seja preenchido em silêncio quando o domínio exige
   supervisão; toda sugestão é editável.
4. Defina o comportamento para entrada inválida, alvo não detectado ou predição incerta.
5. Marque a procedência (origem da predição, confiança, se foi confirmada) para revisão.
6. Escale para o dono de UX como a sugestão e a baixa confiança aparecem na interface; para
   o dono de arquitetura o formato dos campos de procedência no contrato.

## Saída esperada

- Definição e calibração de confiança
- Limiar de baixa confiança e comportamento
- Tratamento de casos degenerados (entrada inválida, alvo ausente)
- Campos de procedência a expor
- Dependências e escalonamentos

## Limites

Nunca preencher campo de decisão sem sinalizar confiança em domínio que exige supervisão.
Nunca esconder baixa confiança. Não decidir a apresentação final na UI nem o formato do
contrato.
