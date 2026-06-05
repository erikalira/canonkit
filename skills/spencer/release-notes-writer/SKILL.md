# release-notes-writer

## Quando usar

Use para criar release notes a partir de PRs, issues, changelog, commits ou decisões aprovadas, destacando impacto para usuários, operadores e manutenção futura.

## Processo

1. Procure PRs, issues, commits, changelog, specs, PRD, ADRs, docs e testes relacionados.
2. Separe mudanças por tipo: adicionadas, alteradas, corrigidas, removidas, migrações e riscos.
3. Explique impacto em linguagem clara e verificável.
4. Relacione documentação, runbooks, APIs e decisões relevantes.
5. Registre lacunas quando não houver contexto suficiente sobre impacto ou validação.
6. Peça revisão de Scott quando o impacto de produto estiver ambíguo.
7. Peça revisão de Pipe quando houver impacto operacional, deploy, migração ou rollback.
8. Peça revisão de Quinn quando validação ou regressão precisar ser explicitada.

## Saída esperada

- Versão ou intervalo
- Resumo
- Adicionado
- Alterado
- Corrigido
- Removido
- Migrações ou operação
- Riscos e compatibilidade
- Validação
- Referências
- Lacunas

## Limites

Não invente impacto, versão, compatibilidade ou validação. Não transforme release notes em marketing quando o objetivo for manutenção técnica.
