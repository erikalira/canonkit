# accessibility-review

## Quando usar

Use para revisar acessibilidade de telas, componentes, fluxos, formularios, conteudo interativo, estados dinamicos ou handoffs que precisam atender WCAG AA.

Use cedo quando acessibilidade puder afetar componente, fluxo, conteudo, estrutura semantica, foco, teclado ou criterios de aceite.

## Processo

1. Procure telas, spec, PRD, criterios de aceite, componentes existentes e padroes de acessibilidade adotados.
2. Identifique tarefas principais e usuarios afetados.
3. Revise contraste de texto, icones, estados e indicadores.
4. Revise foco visivel, ordem de foco e navegacao por teclado.
5. Revise ordem de leitura, rotulos, nomes acessiveis e semantica.
6. Revise mensagens de erro, ajuda, validacao e recuperacao.
7. Revise tamanho de alvo interativo e espacamento.
8. Verifique texto alternativo quando houver imagem com informacao relevante.
9. Identifique riscos WCAG AA e classifique severidade.
10. Recomende ajustes verificaveis e criterios para validacao.
11. Escale para Quinn quando a mudanca precisar de estrategia de teste acessivel.
12. Escale para Archie quando a correcao exigir alteracao estrutural de componente ou contrato.

## Saida esperada

- Escopo revisado
- Criterios WCAG AA afetados
- Problemas encontrados
- Severidade
- Ajustes recomendados
- Criterios verificaveis
- Dependencias
- Lacunas de evidencia

## Limites

Nao declarar conformidade total sem evidencia. Nao aprovar excecao de acessibilidade por conveniencia visual. Nao definir estrategia de testes sozinho quando houver risco relevante; escale para Quinn.
