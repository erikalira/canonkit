# Handoff: verificação proporcional (quando rodar a suíte completa)

Data: 2026-11-10. Origem: sessão que implementou `openspec/changes/runtime-model-discovery`.

## Objetivo

Adicionar ao canonkit uma regra de verificação proporcional ao alcance da mudança, para
que o lead e os subagentes não rodem a suíte completa a cada alteração. Propor primeiro;
aplicar só com o aceite da pessoa que mantém o kit. Isto é configuração do time:
dona é a Virgo, e o caminho é a skill `learning-loop`.

## Regra proposta pela pessoa

> - Mudança pequena e localizada: testes do arquivo ou da área afetada.
> - Mudança que cruza módulos ou altera comportamento compartilhado: testes afetados e
>   um smoke das interfaces principais.
> - Antes de concluir uma mudança maior ou preparar uma entrega: suíte completa e
>   validações do projeto.
> - Se a suíte completa falhar: investigar se a falha veio da mudança ou já existia; não
>   declarar a entrega verificada sem esclarecer isso.

## Ajustes sugeridos na sessão de origem

- **Testes afetados = os de quem consome o código alterado**, não só os do arquivo
  editado. Para achá-los, use grep ou graphify (quem chama a função ou lê o arquivo), e
  rode também os testes de invariantes do caminho tocado.
- **Suíte completa uma vez, depois da última edição**, antes de entregar ou de pedir a
  revisão final. Ela não se repete a cada iteração; se a revisão gerar edições, rode de
  novo só no fim.
- **Briefing de despacho** (skill `orchestrate`): o lead envia a evidência que já tem
  (comandos, contagens). O subagente roda só o que precisa para conferir uma afirmação e
  relata o que rodou.
- **Revisores** (Quinn, Gard, Archie e outros): reaproveitam a evidência recebida e
  rodam a suíte de novo só se suspeitarem dela.

## Evidência da sessão de origem

Cada suíte completa (`npm test`) levou cerca de 5 minutos no Windows.

| # | Quando | Resultado | Valeu? |
|---|---|---|---|
| 1 | Base, antes de editar (tarefa 1.1) | 908 aprovados | Sim. Separa falhas novas das que já existiam |
| 2 | Depois do grosso da implementação | 10 falhas | Sim. Ver abaixo |
| 3 | Depois de corrigir as 10 (já verificadas de forma direcionada) | 0 falhas | Não. As revisões ainda iam gerar edições |
| 4 | Depois das correções da revisão (última edição) | 966 testes, 0 falhas | Sim. Evidência pós-edição para a revisão |

As 10 falhas da rodada 2 estavam fora dos arquivos editados, em testes de invariantes:
- reinstalar sem mudanças não altera arquivos (`test/uninstall.test.js`);
- não executar binário plantado no repositório (`test/security-cli.test.js`, que pegou
  um bug de segurança real);
- limite de 2.500 palavras do perfil de instruções (`test/cli.test.js`).

Rodar só os testes do arquivo editado teria deixado o bug de segurança passar. É isso
que sustenta o ajuste "testes de quem consome o código".

Subagentes: na primeira revisão, Gard rodou só três arquivos de teste de módulo (43
testes, segundos) e Archie não citou testes. Na segunda, os dois disseram que não
reexecutaram nada e confiaram nos números do briefing. Desta vez não houve duplicação,
mas nada no kit garante esse comportamento.

## Restrições conhecidas

- O kit não tem hoje nenhuma regra sobre quando rodar a suíte. A busca em
  `reference/`, `skills/` e `agents/` não achou nada; o mais próximo é a seção
  Proportionality ("Reuse valid evidence and add checks for uncovered failure modes").
- `reference/agents-block.md` está perto do limite de 2.500 palavras, verificado em
  `test/cli.test.js` ("default source instruction profiles stay within 2500 words"). O
  texto novo pode ter de ir para a skill `orchestrate` ou para os arquivos dos agentes, e
  não para o bloco.
- A branch `feat/runtime-model-discovery` (ainda sem commit no momento deste handoff)
  altera `reference/agents-block.md` e `skills/orchestrate/SKILL.md`. Comece depois do
  merge dela, ou a partir do `main` atualizado, contando com um conflito pequeno.
- Os blocos gerenciados e os arquivos dos agentes são cópias que uma reinstalação
  sobrescreve. Edite as fontes no repositório do canonkit.
