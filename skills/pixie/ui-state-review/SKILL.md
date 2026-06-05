# ui-state-review

## Quando usar

Use para revisar estados de interface: vazio, carregando, erro, sucesso, permissao, validacao, desabilitado, parcial, offline, sincronizando ou dados indisponiveis.

Use antes da implementacao quando a ausencia de estados puder gerar ambiguidade, bug de experiencia, regressao, erro critico ou handoff incompleto.

## Processo

1. Identifique a tela, componente ou fluxo afetado.
2. Procure PRD, spec, criterios de aceite, API, componentes existentes e comportamento atual.
3. Liste todos os estados necessarios para a tarefa.
4. Defina gatilhos, conteudo, acoes disponiveis e saida de cada estado.
5. Verifique microcopy para vazio, erro, carregando e sucesso.
6. Verifique acessibilidade de estados dinamicos, foco, leitura e recuperacao.
7. Identifique estados bloqueantes, recuperaveis e informativos.
8. Confirme quando acoes devem ficar desabilitadas, ocultas ou disponiveis.
9. Classifique risco de estados ausentes.
10. Escale para Archie quando estados dependerem de contrato, API, evento ou integracao.
11. Escale para Quinn quando estados precisarem virar criterio de teste.

## Saida esperada

- Escopo revisado
- Matriz de estados
- Gatilhos
- Conteudo e microcopy
- Acoes por estado
- Regras de recuperacao
- Acessibilidade
- Riscos
- Dependencias de engenharia
- Lacunas

## Limites

Nao assumir comportamento de API ausente. Nao esconder erro tecnico atras de mensagem generica quando o usuario precisa agir. Nao aprovar handoff sem estados essenciais.
