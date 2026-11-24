# Handoff — análise do A2UI (Google) para o canonkit

Criado em 2026-11-24. Análise apenas: nada é instalado, integrado ou commitado sem autorização.

## Pergunta

O A2UI (Agent-to-User Interface) é o protocolo aberto do Google em que um agente envia dados de layout e o app renderiza com os próprios componentes nativos (React, Angular, Lit, Flutter, SwiftUI, Compose). Queremos saber:

1. **O que inspira:** ideias do A2UI que o canonkit poderia adotar nas próprias regras (agentes, packs `ui-design`/`ui-review`/`react`, o padrão em `docs/plans/ui-lean-states-handoff.md`).
2. **O que o canonkit já faz melhor:** onde o canonkit já cobre o mesmo terreno com mais profundidade (revisão de UX/acessibilidade pela Pixie, direção visual pela Nova, carregamento progressivo, roteamento por risco, segurança).
3. **Relação recomendada**, escolhendo uma:
   - **(a) Ferramenta de projeto**, como Graphify e OpenSpec (`npx canonkit tool add a2ui`, com bloco gerenciado e `docs/tools.md`);
   - **(b) Stack pack** (`stack-packs/a2ui/`) com as regras para quem implementa com A2UI;
   - **(c) Integrar alguns pontos** nas regras existentes, sem dependência do A2UI;
   - **(d) Nada por enquanto.**

Atenção à diferença de categoria: Graphify e OpenSpec ajudam **o time a trabalhar** (grafo de código, estado de mudança). O A2UI é um **protocolo de runtime** que o produto adota ou não. Isso pesa contra (a) e a favor de (b) ou (c); a análise deve confirmar ou refutar.

## Fontes

- Spec e repositório oficiais do A2UI (versão atual do protocolo; a skill `a2ui-migration` cita v0.8, v0.9, v0.9.1 e v1.0).
- Skills `a2ui` e `a2ui-migration`, instaladas pela usuária em 2026-11-24 em `~/.agents/skills/` (via symlink em `~/.claude/skills/`). O caminho está fora da leitura da sandbox; carregar pela ferramenta Skill.
- No canonkit: `docs/tools.md` (como uma ferramenta de projeto se integra: "canonkit integrates, it never installs"), `stack-packs/` (formato dos packs), `agents/pixie.md`, `agents/nova.md`, `agents/gard.md`, `stack-packs/ui-design/SKILL.md`, `stack-packs/ui-review/SKILL.md`, `stack-packs/react/SKILL.md`.

Rede: a sandbox bloqueia hosts fora da allowlist (`github.com` já foi negado). Se um host for negado, registrar qual e por qual ferramenta, sem contornar; a usuária decide liberar.

## Eixos de comparação

- **Segurança:** o A2UI evita que um agente remoto envie código executável (catálogo de componentes confiável). Que regras Gard/`ui-review` deveriam ter para UI gerada por agente?
- **Estados e streaming:** como o A2UI trata carregamento incremental, erro e atualização parcial, comparado com o carregamento progressivo do canonkit (`agents/bob.md:56-58`).
- **Catálogo de componentes:** a ideia de "um componente por tipo de estado" do ui-lean-states parece com o catálogo do A2UI?
- **Acessibilidade:** quem garante WCAG AA na UI gerada, o renderer ou o agente?
- **Custo:** dependências, manutenção da integração e contexto (bloco gerenciado do `AGENTS.md` tem teto de 3.000 palavras).

## Risco e owners

A análise é LOW (só leitura). A decisão que sair dela pode ser MEDIUM/HIGH: uma ferramenta nova ou um pack novo é contrato público do canonkit (**Archie**). Se tocar em UI gerada por agente remoto, entra **Gard**. Se entrar regra de UX, **Pixie**. Implementação fica para outra mudança, com proposta via **Virgo**.

## Entrega

Um relatório curto (veredito na primeira linha, depois os 3 itens da pergunta, com evidência citada por URL ou `arquivo:linha`) salvo como seção "Resultado" neste arquivo, mais as próximas ações propostas. Nada aplicado.

## Resultado (2026-11-24, Archie)

**Veredito: (c), estreito.** Uma regra de segurança no Gard, sem dependência do A2UI. (a) e (b) rejeitadas por ora. A hipótese de categoria se confirma: o A2UI é um conjunto de bibliotecas de runtime nas dependências do produto (`@a2ui/react`, `@a2ui/web_core`, `a2ui_flutter`, `a2ui-agent-sdk`), sem binário nem fluxo de trabalho do time. As ferramentas de projeto do canonkit são binários no PATH que ele só detecta (`docs/tools.md:1-5`, `:56-60`).

**Fontes:** `a2ui.org/llms.txt` e `a2ui.org/specification/v1.0-a2ui/` via WebFetch (lidos os primeiros 100k de 117k caracteres); skills `a2ui` e `a2ui-migration`. Nenhum host negado; `github.com` não foi tentado.

**Fatos verificados:**
- O protocolo atual é a v1.0. Antes vieram v0.9.1 e v0.9; a v0.8 está deprecada. Os nomes das mensagens mudam entre versões, e a skill avisa para não escrever A2UI de memória.
- Mensagens: `createSurface`, `updateComponents`, `updateDataModel` e `deleteSurface`, do agente para o renderer; `action` e `error`, de volta.
- Referência ausente vira placeholder; mensagens chegam na ordem em que foram geradas; o erro leva código, `surfaceId`, caminho JSON-pointer e mensagem, e volta ao modelo para ele se corrigir.
- O catálogo não pode ser buscado pela rede. Funções `requiresUserActivation` só rodam num gesto da pessoa. `sendDataModel` vai só para o agente que criou a superfície.
- Acessibilidade: "enforcement falls to catalog and renderer implementations", via `@accessibility`.
- O trecho lido não orienta sobre prompt injection nem sobre segurança de URL e imagem em `openUrl`/`Image`.

**1. O que inspira (inferência):**
- **Gard:** UI gerada por agente é saída não confiável. Ela só renderiza por uma lista fixa de componentes permitidos, nunca como HTML ou código. Cada ação que ela dispara exige a mesma autorização de uma ação da pessoa, e efeito colateral exige gesto real. URL e imagem vindas do modelo são entrada não confiável, e o estado da UI volta só para o agente que a criou. Estende a linha de fluxos agênticos (`agents/gard.md:20`), sem seção nova.
- **ui-review M3 (opcional, Pixie):** para UI gerada, checar acessibilidade no catálogo de componentes, não em cada payload.
- O "um componente por tipo de estado" do ui-lean-states é só analogia: o catálogo do A2UI é allow-list de segurança, e o lean-states trata de consistência visual. Não misturar os dois.

**2. O que o canonkit já faz melhor (verificado nos arquivos):**
- **Carregamento:** o A2UI diz só "placeholder se faltar". O canonkit espera só o essencial, adia o resto, carrega primeiro as imagens da primeira tela e dá a cada parte fallback próprio, tamanho reservado e erro local (`agents/bob.md:56-58`).
- **Estados:** o canonkit nomeia loading, empty, error, partial, success e permission, cada um com recuperação, e checa ação repetida e atualização fora de ordem (`stack-packs/ui-review/SKILL.md:39-53`). O A2UI só exige entrega em ordem.
- **Erros:** classificados por código, nunca pelo texto (`agents/bob.md:55`).
- **Segurança e revisão:** roteamento por risco e revisão da superfície renderizada.

**3. Relação:** pack (b) rejeitado por ora. Seria um contrato público novo amarrado a um protocolo que mudou quatro vezes, e as skills da usuária já cobrem a implementação. Rever (b) quando um projeto que usa canonkit adotar `@a2ui/*` ou `a2ui_flutter` no manifesto e a v1.x estiver estável há algum tempo. O Archie bloquearia hoje um pack ou uma ferramenta.

**Risco e owners do seguimento:** linha no Gard é MEDIUM (owner Gard; Virgo propõe e aplica; Quinn confere depois). Linha no ui-review, MEDIUM (owner Pixie). Sem ADR.

**Próximas ações propostas:**
1. Perguntar à usuária se a linha do Gard entra como mudança própria, separada de `feat/ui-lean-states`.
2. Opcional: ler o resto da spec (a partir do caractere 100000) para confirmar se não há orientação sobre URL ou prompt injection.

## Pergunta extra: o instalador `npx skills add` como inspiração

A usuária instalou as skills com `npx skills add a2ui-project/a2ui` (CLI `skills@1.9.0`, da Vercel). Comparar com o `canonkit install` (`docs/install.md`), que já tem escopo usuário/projeto, vários harnesses, `--dry-run`, manifesto com IDs estáveis e receipt de segurança por projeto. Pontos do fluxo deles a avaliar:

- **Um diretório canônico com symlinks:** instala uma vez em `~/.agents/skills/<skill>` e liga por symlink a cada harness (opção "Symlink (Recommended)"). O canonkit grava uma cópia por harness, que um reinstall sobrescreve. Pesar: deduplicação e uma fonte única contra o Windows (symlink exige privilégio ou modo desenvolvedor, e a matriz de CI inclui Windows) e o fato de a sandbox não ler `~/.agents` (por isso só a ferramenta Skill conseguiu ler essas skills).
- **Escolha de agentes por nome:** são 79 alvos detectados, com seleção múltipla. O canonkit tem uma lista fixa de harnesses.
- **Avaliação de risco antes de instalar:** mostra Gen, Socket e Snyk por skill (aqui, `a2ui-migration` e `find-skills` vieram com Snyk "Med Risk") e avisa "they run with full agent permissions". Avaliar se specialists, stack packs ou ferramentas de terceiros no canonkit deveriam mostrar algo parecido. Owner: **Gard**.
- **Oferta casada:** no fim, um prompt "uma vez só" oferece instalar `find-skills`, com Yes como padrão. Provavelmente um contra-exemplo: o canonkit não deveria instalar nada que não foi pedido.

Owners: **Archie** para o formato da instalação (é contrato público do canonkit) e **Gard** para a avaliação de risco e para os symlinks. Entrega: a mesma seção de resultado, separada da do A2UI.
