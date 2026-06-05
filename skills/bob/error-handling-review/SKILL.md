# error-handling-review

## Quando usar

Use para revisar ou implementar tratamento de erro, validacao, retries, mensagens tecnicas, fallbacks, estados de falha e recuperacao.

## Processo

1. Identifique operacao que pode falhar e impacto para usuario ou sistema.
2. Liste erros esperados, erros inesperados e falhas externas.
3. Verifique como erro e propagado, logado, exibido ou recuperado.
4. Evite engolir excecoes sem acao.
5. Preserve informacao util para debug sem vazar dado sensivel.
6. Defina fallback, retry ou fail-fast conforme o risco.
7. Adicione testes para caminhos de erro relevantes.
8. Escale para Pixie quando mensagem ou estado de UI for decisao de UX.
9. Escale para Gard quando logs ou erros puderem vazar informacao sensivel.

## Saida esperada

- Operacao revisada
- Erros esperados
- Comportamento de falha
- Logs ou observabilidade
- Risco de vazamento
- Mitigacoes
- Testes recomendados
- Validacoes executadas
- Pendencias

## Limites

Nao expor stack trace, segredo ou dado sensivel para usuario final. Nao esconder falha critica como sucesso. Nao decidir copy de UX ou politica de seguranca sozinho.
