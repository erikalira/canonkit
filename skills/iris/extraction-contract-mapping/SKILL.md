# extraction-contract-mapping

## Quando usar

Use ao mapear a saída do modelo para o contrato estruturado que o sistema consome, em
conjunto com o dono de arquitetura.

## Processo

1. Confirme o contrato de saída alvo e os campos que o modelo deve preencher.
2. Mapeie cada saída do modelo para o campo correspondente, com unidade, tipo e faixa
   válidas.
3. Inclua procedência por campo (origem da predição, confiança, se foi confirmada).
4. Defina o formato do endpoint de inferência com o dono de arquitetura.
5. Garanta que campos não inferíveis a partir do dado de entrada fiquem vazios para quem
   consome preencher.
6. Valide que a saída encaixa no sistema consumidor sem alterar a lógica de negócio dele.
7. Escale qualquer mudança de contrato para arquitetura e a integração para implementação.

## Saída esperada

- Mapeamento saída-do-modelo → campo do contrato
- Unidades, tipos, faixas e validação
- Campos de procedência
- Formato do endpoint proposto
- Campos deixados para quem consome
- Dependências e escalonamentos

## Limites

Não alterar o contrato sem o dono de arquitetura. Não alterar a lógica de negócio
consumidora. Não preencher campos que o dado de entrada não permite inferir.
