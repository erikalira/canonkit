# design-system-consistency

## Quando usar

Use para revisar consistencia com design system, componentes existentes, tokens, padroes visuais, comportamento de interacao, densidade, hierarquia e nomenclatura de UI.

Use cedo quando uma tela ou componente novo puder criar padrao paralelo, divergencia visual, inconsistencia de comportamento ou custo desnecessario para engenharia.

## Processo

1. Procure design system, biblioteca de componentes, tokens, telas existentes e padroes documentados.
2. Identifique componentes, variantes, estados e tokens necessarios.
3. Verifique se ja existe componente ou padrao aplicavel.
4. Revise hierarquia visual, densidade, espacamento, tipografia, cor e iconografia.
5. Revise consistencia de comportamento: hover, foco, desabilitado, loading, erro e sucesso.
6. Verifique acessibilidade WCAG AA para contrastes, foco e alvos interativos.
7. Identifique divergencias justificadas e divergencias sem justificativa.
8. Recomende reutilizacao, extensao pequena ou novo componente apenas quando necessario.
9. Escale para Archie quando a recomendacao criar componente compartilhado ou contrato estrutural.
10. Escale para Scott quando a divergencia existir por necessidade de produto.
11. Escale para Spencer quando um novo padrao precisar virar guideline duravel.

## Saida esperada

- Componentes revisados
- Padroes existentes relacionados
- Divergencias encontradas
- Impacto na experiencia
- Impacto para engenharia
- Recomendacao
- Requisitos WCAG AA
- Necessidade de novo padrao ou guideline
- Dependencias

## Limites

Nao criar novo padrao visual sem evidencia de necessidade. Nao bloquear ajuste local apenas por diferenca cosmetica sem impacto. Nao alterar design system duravel sem revisao apropriada.
