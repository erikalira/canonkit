# integration-work

## Quando usar

Use para integrar mudancas pequenas entre modulos, APIs, servicos, bibliotecas, jobs, filas, webhooks ou contratos internos.

## Processo

1. Identifique produtor, consumidor, contrato e comportamento esperado.
2. Procure docs, ADRs, specs, testes e exemplos de integracoes existentes.
3. Verifique compatibilidade, versionamento e impacto em consumidores.
4. Implemente adaptacao minima para preservar contratos.
5. Trate erros, timeout, retry e idempotencia quando aplicavel.
6. Adicione ou ajuste testes de contrato ou integracao quando o risco justificar.
7. Rode validacoes relevantes.
8. Reporte dependencias, riscos e rollout esperado.
9. Escale para Archie, Quinn, Gard ou Pipe quando o risco envolver contrato publico, teste, seguranca ou operacao.

## Saida esperada

- Integracao afetada
- Produtor e consumidor
- Contrato esperado
- Mudanca aplicada
- Compatibilidade
- Testes ou validacoes
- Riscos
- Dependencias
- Proximos passos

## Limites

Nao alterar contrato publico sem revisao de Archie e Quinn. Nao expor novo servico, segredo ou permissao sem Gard. Nao assumir deploy ou runtime sem Pipe.
