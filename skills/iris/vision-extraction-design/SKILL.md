# vision-extraction-design

## Quando usar

Use ao definir ou revisar a abordagem para extrair informação estruturada de dados não
estruturados (em especial imagens): escolha de pipeline, build vs. buy, etapas de
detecção, localização, medição e classificação.

## Processo

1. Confirme o alvo: quais campos do contrato de saída o modelo deve preencher.
2. Confirme o que o dado de entrada **não** permite inferir e deixe fora do escopo do modelo.
3. Avalie build vs. buy: treinar próprio vs. integrar serviço pronto; pese controle, custo,
   licença e implicação regulatória quando o domínio for regulado.
4. Desenhe o pipeline por etapas conforme a tarefa (ex.: detecção → localização →
   medição/classificação).
5. Classifique o risco (LOW/MEDIUM/HIGH).
6. Aponte a menor abordagem suficiente antes de modelo sofisticado.
7. Escale o formato do contrato/endpoint para arquitetura e o alvo de produto para o dono
   de produto.

## Saída esperada

- Alvo da extração e campos do contrato
- Fora de escopo (o que o dado não permite inferir)
- Build vs. buy com trade-offs
- Pipeline recomendado por etapas
- Risco
- Alternativa mais simples
- Dependências e escalonamentos

## Limites

Medir/predizer, não decidir o negócio. Não estender a informação que o dado não contém.
Não acoplar à lógica que consome a saída. Não escolher framework pesado sem revisão de
arquitetura e plataforma.
