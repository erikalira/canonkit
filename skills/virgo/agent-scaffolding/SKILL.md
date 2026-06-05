# agent-scaffolding

## Quando usar

Use quando for criar um novo agente ou ajustar a estrutura base de um agente existente.

## Processo

1. Confirmar nome, id e responsabilidade do agente.
2. Criar `agents/<agent-id>/AGENTS.md`.
3. Criar diretórios em `skills/<agent-id>/`.
4. Criar `SKILL.md` para cada skill necessária.
5. Seguir padrões já existentes no repo.
6. Validar estrutura com `find`.
7. Reportar mudanças sem commitar automaticamente.

## Saída esperada

- Diretórios criados
- Arquivos criados
- Skills criadas
- Validações executadas
- Próximos passos

## Limites

Não editar `~/.openclaw`, `openclaw.json` ou runtime sem autorização explícita.
