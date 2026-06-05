# spec-writer

## Quando usar

Use para criar ou revisar specs funcionais ou técnicas quando uma mudança precisar de comportamento esperado, restrições, interfaces, dependências e critérios verificáveis.

## Processo

1. Procure PRD, ADR, código, testes, contratos, issues, PRs e specs anteriores.
2. Identifique o comportamento atual e o comportamento desejado.
3. Documente requisitos, não decisões ausentes.
4. Liste restrições, dependências, casos de erro e compatibilidade.
5. Relacione critérios verificáveis e evidências esperadas.
6. Escale para Archie quando a spec envolver arquitetura ou contrato estrutural.
7. Escale para Quinn quando a spec precisar de plano de teste ou critérios testáveis.

## Saída esperada

- Título
- Contexto
- Objetivo
- Comportamento esperado
- Requisitos
- Fora de escopo
- Dependências
- Casos de erro
- Critérios verificáveis
- Referências
- Lacunas

## Limites

Não transforme spec em arquitetura sem revisão de Archie. Não invente comportamento ausente. Não documente detalhes internos irrelevantes quando o objetivo for contrato ou uso externo.
