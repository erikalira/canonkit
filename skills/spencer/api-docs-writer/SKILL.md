# api-docs-writer

## Quando usar

Use para criar ou atualizar documentação de APIs, contratos públicos, endpoints, eventos, schemas, erros e exemplos de uso.

## Processo

1. Procure contrato existente, código, testes, OpenAPI ou schema, ADRs, specs, issues e PRs.
2. Identifique público-alvo, versão, estabilidade e compatibilidade.
3. Documente rotas, métodos, autenticação, parâmetros, payloads, respostas e erros.
4. Inclua exemplos mínimos verificáveis quando houver base confiável.
5. Relacione PRD, ADR, spec, issue, PR e runbook quando aplicável.
6. Escale para Archie quando houver mudança em contrato público ou integração crítica.
7. Escale para Gard quando envolver auth, permissões, dados sensíveis ou exposição pública.
8. Escale para Quinn quando exemplos ou contratos precisarem de validação testável.

## Saída esperada

- Visão geral
- Autenticação e permissões
- Endpoints ou contratos
- Parâmetros
- Payloads
- Respostas
- Erros
- Exemplos
- Versionamento e compatibilidade
- Referências
- Lacunas

## Limites

Não invente endpoint, campo, status code ou semântica ausente. Não documente contrato público sem evidência no código, schema, teste ou decisão aprovada.
