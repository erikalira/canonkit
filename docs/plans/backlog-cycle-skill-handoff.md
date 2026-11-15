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
   falharia sem a correção?). Depois roda os testes da área tocada e dos seus
   consumidores (por alcance, como no `orchestrate`), **antes** de chamar o
   revisor, para que a revisão não gaste uma rodada com algo que um teste pegaria.
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
9. **Commit/push**: ao terminar a implementação, perguntar com `AskUserQuestion`,
   sem assumir, qual destas três o usuário quer:
   - o lead faz o commit (e pergunta o push à parte);
   - o lead entrega só a mensagem de commit;
   - o lead entrega o comando de commit pronto (`git add …` + `git commit -m …`)
     para o usuário rodar.
10. **Próxima sessão**: entregar o prompt pronto para colar, com o próximo item,
    o handoff dele, a release em curso e o mesmo fluxo.

## Quando o ciclo não fecha

O fluxo acima cobre só o caminho feliz. A skill precisa de uma saída para estes
três casos:

- **O dono veta** e a correção não cabe nesta sessão;
- **o item é maior do que parecia** (o plano ou a implementação mostra que são
  vários itens);
- **o item já não faz sentido** (resolvido por outra change, obsoleto, ou o
  disco não bate com o handoff).

A saída é a mesma nos três: parar, dividir ou descartar o item, atualizar o
`todo.md` (com o motivo), escrever ou atualizar o handoff com o estado real, e
entregar o prompt da próxima sessão. Nada de deixar a change pela metade sem
registro.

## Decisões em aberto (resolver antes de escrever a skill)

- **Escopo:** skill do core do canonkit (`skills/`, instalada para todos) ou
  local deste repositório? O fluxo depende de `todo.md` + OpenSpec + release
  notes, convenções deste projeto. Um core genérico precisaria descobrir o
  backlog e o destino da release, ou recebê-los como parâmetro.
- **Cerimônia pelo tamanho do item:** o OpenSpec completo (proposal, spec delta,
  design, tasks) é demais para itens pequenos. Proposta:
  - LOW: inline, sem change no OpenSpec, só com o fechamento (passos 7, 9 e 10),
    como o `orchestrate` já diz;
  - MEDIUM pequeno: change só com proposal + tasks;
  - MEDIUM grande e HIGH: o pacote completo.

  Falta definir o critério objetivo entre "MEDIUM pequeno" e "MEDIUM grande".
- **Sobreposição com `orchestrate`:** a skill deve apontar para o ciclo de vida
  OpenSpec e a Integration Review do `orchestrate`
  (`skills/orchestrate/SKILL.md`, "OpenSpec change lifecycle"), sem copiar.
  O que ela acrescenta é a seleção pelo backlog, o ponto de aprovação, o
  fechamento e o prompt da próxima sessão.
- **Release:** como a skill sabe a versão em curso (branch `release/X.Y.Z`,
  `package.json`) e quando subir a versão (só no primeiro item da release).
- **Fonte do backlog:** a branch `feat/live-development-observatory` traz
  `CANONKIT_ROADMAP.md`, que tem fases próprias, além do `todo.md`. Decidir se a
  skill lê só o `todo.md` (e o roadmap fica de fora) ou se os dois são
  reconciliados.
- **Achados fora do escopo vão para o backlog, não para issues:** hoje o core
  manda oferecer issues no GitHub. `skills/orchestrate/out-of-scope-issues.md`
  diz que "project issues hold the incidental backlog" e descreve rascunho,
  aprovação e publicação via `gh`. O `## Incidental findings` do
  `AGENTS.md` gerenciado (`reference/agents-block.md`) diz "before offering
  issues", e `docs/out-of-scope-issues.md` documenta o mesmo. Na prática, o
  `todo.md` funcionou melhor: o achado entra na lista de prioridades que o
  próprio ciclo consome, sem uma rodada de publicação.
  **Decidido (2026-11-14): mudar o core.** O destino passa a ser o backlog que
  o projeto já usa (arquivo como `todo.md` ou o tracker), com issues no GitHub
  só quando é esse o backlog do projeto. Isso mexe no bloco gerenciado e no
  procedimento do `orchestrate` e afeta todos os projetos, então é uma change
  à parte (item próprio no `todo.md`), com Virgo, e Spencer para
  `docs/out-of-scope-issues.md`. A skill do ciclo só aponta para esse
  procedimento, sem repetir a regra. O canal privado para vulnerabilidades e
  segredos expostos continua como está: isso nunca vai para o `todo.md` de um
  repositório público.
  **Feito na 3.2.1:** procedimento, bloco gerenciado e
  `docs/out-of-scope-issues.md` já descrevem o backlog do projeto como destino.
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
