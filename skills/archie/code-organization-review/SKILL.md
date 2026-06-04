# code-organization-review

## Quando usar

Use para avaliar organização interna de uma aplicação: camadas, módulos, Clean Architecture, Hexagonal, MVC, service layer, repositories, use cases e fronteiras internas.

## Processo

1. Identifique o tipo de aplicação e o domínio.
2. Mapeie módulos e dependências.
3. Verifique acoplamento com framework, ORM, banco ou APIs externas.
4. Avalie se interfaces/ports agregam valor real.
5. Identifique violações de fronteira.
6. Recomende estrutura proporcional ao problema.

## Saída esperada

- Diagnóstico da organização atual
- Problemas de acoplamento
- Fronteiras recomendadas
- Simplificações possíveis
- Refatorações incrementais

## Limites

Não force Clean/Hexagonal quando uma arquitetura modular simples resolver.
