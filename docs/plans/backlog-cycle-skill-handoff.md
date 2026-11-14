# Handoff — skill para o ciclo "um item do backlog por sessão"

Criado em 2026-11-14, depois de fechar o P0 do `todo.md` (issue #36) com este fluxo
(change arquivada em `openspec/changes/archive/2026-11-14-wsl-security-follow-ups/`,
commits `35831af` e `87348dd`). A ideia é transformar o fluxo numa skill reutilizável.

## O fluxo que funcionou

Um item por sessão, na ordem de prioridade do `todo.md`:

1. **Escolher** o próximo item aberto de maior prioridade e ler o handoff ou a
   seção ligada a ele, além do código citado. Confirmar no disco que o que o
   handoff descreve ainda existe.
2. **Classificar** o risco (LOW/MEDIUM/HIGH) e nomear o dono que revisa.
3. **Planejar** com `openspec-propose` (proposal, spec delta, design, tasks) e
   validar com `openspec validate --strict`. **Parar e pedir aprovação.**
4. **Implementar**: em MEDIUM/HIGH, o código fica com o Bob, com modelo e esforço
   tirados de `canonkit models show` e um brief que já leva as linhas e
   decisões. Enquanto ele trabalha, o lead prepara as notas da release e a
   subida de versão, sem tocar nos arquivos do Bob.
5. **Conferir**: o lead lê o diff e faz um teste "vermelho" barato (o teste novo
   falharia sem a correção?).
6. **Revisar** com o dono certo, depois da última edição. Uma regressão que a
   change introduziu é corrigida na própria change, e o dono confirma de novo.
   Um problema que já existia antes vira achado no `todo.md`.
7. **Fechar**:
   - marcar as tarefas;
   - remover o handoff que foi resolvido;
   - marcar o item no `todo.md` e registrar os achados;
   - rodar `graphify update .`.
8. **Arquivar** com `openspec-archive-change` (sync da spec e validação das specs)
   e rodar `npm run validate`.
9. **Commit/push**: perguntar com `AskUserQuestion`, sem assumir.
10. **Próxima sessão**: entregar o prompt pronto para colar, com o próximo item,
    o handoff dele, a release em curso e o mesmo fluxo.

## Decisões em aberto (resolver antes de escrever a skill)

- **Escopo:** skill do core do canonkit (`skills/`, instalada para todos) ou
  local deste repositório? O fluxo depende de `todo.md` + OpenSpec + release
  notes, convenções deste projeto. Um core genérico precisaria descobrir o
  backlog e o destino da release, ou recebê-los como parâmetro.
- **Itens LOW:** passam pelo OpenSpec ou ficam inline? O `orchestrate` diz que
  LOW fica inline. Proposta: LOW sem change no OpenSpec, só com o fechamento
  (passos 7, 9 e 10).
- **Sobreposição com `orchestrate`:** a skill deve apontar para o ciclo de vida
  OpenSpec e a Integration Review do `orchestrate`
  (`skills/orchestrate/SKILL.md`, "OpenSpec change lifecycle"), sem copiar.
  O que ela acrescenta é a seleção pelo backlog, o ponto de aprovação, o
  fechamento e o prompt da próxima sessão.
- **Release:** como a skill sabe a versão em curso (branch `release/X.Y.Z`,
  `package.json`) e quando subir a versão (só no primeiro item da release).
- **Nome:** por exemplo `backlog-cycle` ou `next-task`.

## Como fazer

- Configuração do time é domínio do **Virgo**: ele escreve a skill e roda a
  validação do canonkit. Se for para o core, avaliar se o **Spencer** precisa
  documentar em `docs/` e nas notas da release.
- Planejar como change do OpenSpec (provável MEDIUM: muda o comportamento dos
  agentes).
- Incluir avaliação de roteamento (`npm run eval`) se a skill tiver uma
  description que dispara sozinha.
- Fechar este handoff quando a skill estiver instalada e um ciclo real a usar.
