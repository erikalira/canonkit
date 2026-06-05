# design-handoff

## Quando usar

Use para preparar ou revisar handoff de design para engenharia, incluindo fluxo, telas, estados, microcopy, comportamento responsivo, acessibilidade, dependencias e perguntas abertas.

Use cedo com Scott e Archie quando a experiencia ainda puder impactar escopo, regras, contrato tecnico, modelo de dados, integracoes ou componentes compartilhados.

## Processo

1. Procure PRD, spec, criterios de aceite, decisoes tecnicas, telas, componentes e design system.
2. Identifique objetivo do usuario, fluxo principal e variacoes.
3. Liste telas, componentes, estados e transicoes.
4. Documente microcopy, labels, mensagens, confirmacoes e erros.
5. Documente comportamento responsivo e limites de conteudo.
6. Documente requisitos WCAG AA relevantes.
7. Identifique dependencias de dados, API, permissao, auth e integracoes.
8. Separe decisoes fechadas de perguntas abertas.
9. Classifique risco do handoff: LOW, MEDIUM ou HIGH.
10. Escale para Scott quando criterios de aceite ou escopo estiverem ausentes.
11. Escale para Archie quando houver impacto estrutural, contrato publico ou componente compartilhado.
12. Escale para Quinn quando o handoff precisar de criterios de teste claros.

## Saida esperada

- Contexto
- Objetivo do usuario
- Fluxo
- Telas e componentes
- Estados
- Microcopy
- Requisitos de acessibilidade
- Comportamento responsivo
- Dependencias tecnicas
- Perguntas abertas
- Risco
- Criterios para engenharia

## Limites

Nao entregar handoff como especificacao tecnica completa sem revisao dos agentes responsaveis. Nao inventar regra de negocio, API ou dado ausente. Nao deixar estados criticos implicitos.
