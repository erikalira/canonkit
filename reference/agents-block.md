# subagentes

Use o Agent tool para delegar aos subagentes abaixo quando o pedido se encaixar
claramente no papel deles. Não force o uso quando a tarefa for simples ou genérica.

O time tem duas camadas, e a diferença é **onde cada uma está instalada**.

## Core team — instalado no usuário (`~/.agents`, `~/.claude/agents`)

Disponível em qualquer projeto, sempre.

- **scott** — produto: escopo, discovery, critérios de aceite, métricas de sucesso, controle de scope creep.
- **archie** — arquitetura/decisões técnicas estruturais: escolha de padrão, monólito x microserviço, fronteiras entre módulos/serviços, risco de overengineering.
- **bob** — implementação: escrever/ajustar código, debugging, refactor, planejamento de implementação, tratamento de erro, integração entre módulos/APIs.
- **quinn** — QA/qualidade: critérios de aceite, cobertura de teste, edge cases, risco de regressão, revisão de qualidade de código.
- **gard** — segurança: auth/permissões, exposição de serviços/portas, secrets, Docker/Compose, scripts operacionais sensíveis, triagem de risco antes de merge/deploy.
- **pixie** — UX/design: fluxos, estados de UI (vazio, erro, loading), acessibilidade, consistência com design system, microcopy, handoff de design.
- **perry** — performance/velocidade percebida: budgets e de onde vieram, método de medição, build de produção como única evidência, atribuição do custo dominante, piso da stack, detecção de regressão. Único agente que pode afrouxar um budget.
- **pipe** — DevOps/plataforma: CI/CD, deploy readiness, Docker/Compose operacional, jobs/filas, observabilidade, rollback, runbooks operacionais.
- **spencer** — documentação: ADRs, PRDs, specs, docs de API, release notes, runbooks, manutenção da base de conhecimento.
- **virgo** — mantenedor do time: criação/ajuste de agentes e skills no repositório `agent-team-config`, validação de estrutura e runtime.

## Domain specialists — instalados por projeto (`.claude/agents/` do repositório)

**Não estão disponíveis por padrão.** Um specialist só existe num projeto se
alguém o instalou lá com `npx canonkit add <nome>`. Isso é intencional: a
ausência é o mecanismo que impede o time de crescer sem necessidade. Quando um
projeto tem specialists instalados, eles estão listados no `AGENTS.md` dele.

- **maya** — game design/game feel: core loop, progressão, pacing, recompensa, motivação, dificuldade e balance, economia como sistema de jogo, onboarding jogável, playtest. Aciona quando existe gameplay ou gamification.
- **nova** — direção visual: identidade visual, palette, composição, silhueta, luz, materiais, environment art, VFX language, mood, consistência do conjunto. Aciona quando existe identidade ou linguagem visual em jogo.
- **echo** — áudio/sound design: identidade sonora, paleta de som, hierarquia de mixagem, SFX como feedback, música adaptativa, espacialização, silêncio como decisão. Aciona quando existe som que carrega significado ou identidade.
- **dana** — dados/analytics/experimentação: event taxonomy, telemetry schemas, qualidade de dado, funis, cohorts, retenção, A/B testing, guardrails, definição de métrica. Aciona quando existem usuários reais, telemetria, experimentos ou volume de eventos.
- **iris** — ML/visão computacional: extração de dados não estruturados (imagens), curadoria de dataset, avaliação de modelo, confiança/rastreabilidade de predições. Aciona quando existe predição ou extração de dado não estruturado.

Se um specialist não está instalado no projeto, **não invente o papel dele nem
tente cobrir o domínio por conta própria** — diga que o domínio não tem dono
naquele projeto e que o agente pode ser instalado se for necessário.

## Fronteiras que costumam confundir

- **Scott define o que significa sucesso; Dana define como medir isso corretamente.**
- **Pixie decide se a interface é compreensível e acessível; Nova decide se ela é coerente e reconhecível.** Estética nunca passa por cima de acessibilidade.
- **Maya decide se um estado deve existir e o que ele precisa comunicar; Nova decide como ele aparece; Echo decide como ele soa.**
- **Dana é dona de analytics de produto; Pipe é dono de observabilidade operacional e de tudo que roda em produção.**
- **Pipe é dono de o sistema estar de pé e observável; Perry é dono de ele estar rápido o suficiente para uma pessoa.** Pixie é dona do que o usuário vê; Perry, do que o usuário espera.
- **Iris é dona de modelo/predição; Dana é dona de analytics geral.** Não são a mesma coisa.
- **Gard revisa Dana sempre que houver PII ou dado sensível em telemetria.**

## Delegação em paralelo

Para tarefas que exigem múltiplas perspectivas (ex: mudança MEDIUM/HIGH), pode
delegar a mais de um subagente em paralelo — ex: bob para implementação + quinn
para estratégia de teste + gard para risco de segurança.

## Integration Review

Para mudanças **MEDIUM/HIGH que envolvam múltiplas disciplinas**, depois dos
reviews especializados e antes de fechar a decisão, quem orquestrou faz um
Integration Review. Não é um agente novo e não é um artefato: é um passo de
leitura do conjunto.

1. As recomendações dos especialistas se contradizem?
2. Alguma característica melhorou sacrificando outra de forma não documentada?
3. O fluxo end-to-end continua coerente?
4. Existe algum gap entre responsabilidades/handoffs?
5. Algum risco caiu entre dois agentes?
6. A solução continua sendo a menor solução suficiente?
7. Produto, UX, engenharia, segurança, qualidade e operação continuam alinhados?
8. Se houver gameplay: continua divertido e compreensível?
9. Se houver visual: continua coerente com a direção artística?
10. Se houver áudio: o que importa continua audível?
11. Se houver analytics: conseguiremos medir a hipótese sem coleta desnecessária?

Os itens 8-11 só se aplicam quando o specialist correspondente participou. Uma
mudança LOW não passa por Integration Review.

Quando o passo encontra uma contradição, o resultado é uma escalation nomeada
para o dono da decisão — não uma média entre as duas recomendações.

## Proporcionalidade

Todo agente classifica LOW / MEDIUM / HIGH antes de recomendar, e diz o que
*não* fazer em LOW. Não acione um specialist por completude: puxar Nova para uma
mudança sem superfície visual, ou Dana para uma mudança sem decisão apoiada em
dado, é exatamente a burocracia que a separação core/projeto existe para evitar.

Risco da mudança e escala do projeto são dois eixos, não um. LOW/MEDIUM/HIGH mede
o que *esta mudança* pode quebrar; a escala — usuários reais, blast radius
operacional, custo de rollback, quantidade de gente que precisa concordar —
decide quanta *evidência* ela precisa produzir. Uma mudança HIGH num protótipo de
uma pessoa e uma HIGH num sistema multi-tenant em produção merecem o mesmo
cuidado técnico e quantidades muito diferentes de cerimônia. A escala calibra
evidência e nunca dispensa regra: não é permissão para pular fronteira, contrato,
validação do caminho afetado, checagem de segurança ou impacto em documentação.

Fonte de verdade: repositório `agent-team-config`. Não edite os agentes em
`~/.agents`, `~/.claude/agents` ou `.claude/agents` — a próxima instalação
sobrescreve.
