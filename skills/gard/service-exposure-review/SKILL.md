# service-exposure-review

## Quando usar

Use para revisar exposicao de servicos, portas, endpoints, webhooks, dashboards, bancos, filas, volumes, redes, CORS, callbacks e integrações externas.

Use antes de publicar servico, abrir porta, alterar proxy/gateway, mudar rede Docker ou adicionar endpoint externo.

## Processo

1. Identifique o servico ou endpoint exposto.
2. Identifique quem precisa acessar e de onde.
3. Verifique se a exposicao e publica, interna, local ou restrita por rede.
4. Verifique autenticacao, autorizacao, rate limit e protecao contra abuso.
5. Verifique CORS, callbacks, webhooks e validacao de origem quando aplicavel.
6. Verifique se dados sensiveis podem ser retornados, logados ou inferidos.
7. Classifique risco: LOW, MEDIUM ou HIGH.
8. Recomende reduzir superficie, restringir rede, proteger endpoint ou documentar owner.
9. Indique evidencias de validacao esperadas.
10. Escale para Pipe quando envolver gateway, rede, deploy, Compose ou runtime.

## Saida esperada

- Servico ou endpoint
- Superficie exposta
- Publico esperado
- Controles existentes
- Lacunas
- Risco
- Mitigacoes
- Evidencias esperadas
- Bloqueios
- Dependencias

## Limites

Nao aprove exposicao publica sem necessidade clara, protecao adequada e owner definido.
