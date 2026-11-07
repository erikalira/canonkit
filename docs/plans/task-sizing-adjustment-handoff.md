# Handoff: ajuste de dimensionamento de tarefas

Data: 2026-11-07. Nota de coordenação entre trabalhos concorrentes; não é uma instrução instalada.

## Motivo e autorização

O usuário solicitou ajustar o CanonKit para dimensionar melhor tarefas pequenas, mantendo qualidade com menos custo. Autorizou a alteração no fonte, sem criar branch nem commitar. O objetivo foi evitar que uma solução inicialmente pequena ganhe infraestrutura e uma sequência automática de revisores.

## Trechos alterados por este trabalho

Somente dois arquivos canônicos foram modificados:

1. `reference/agents-block.md`, seção **Proportionality**:
   - MEDIUM passou de uma lista ampla de novidades/“plausible regression” para mudanças de comportamento com risco concreto de regressão.
   - Em MEDIUM, encaminhar riscos que precisam do julgamento do dono; cada revisor adicional deve cobrir uma lacuna distinta. Mudanças pequenas não têm uma cadeia fixa de revisões.
   - A escala passou a calibrar escopo, revisões e validação. Escolher a menor solução suficiente; infraestrutura exige requisito atual ou reutilização demonstrada; reaproveitar evidência válida.
2. `skills/orchestrate/SKILL.md`, **OpenSpec change lifecycle**, itens 2 e 4:
   - Dimensionar a solução antes de expandir tarefas/infraestrutura; ferramenta, fonte ou diretório de change, isoladamente, não elevam o risco.
   - Em MEDIUM, o implementador confere deriva documental; Spencer participa quando há decisão documental não resolvida ou ambiguidade. Em HIGH, Spencer continua conferindo.

Não foram alterados por este trabalho o bloco de superfícies HIGH, seus donos obrigatórios, a revisão independente após a última edição, regras de segurança, contratos, pedidos explícitos por um dono, hooks ou agentes individuais. A orientação de briefs compactos e reaproveitamento de evidências já existia no fonte; não foi criada aqui.

## Validação e limites

- Quinn aprovou uma revisão estática focada. O caso pequeno foi uma importação delimitada de imagens aprovadas para UI existente; o controle protegido foi um serviço que aceita URLs arbitrárias de usuários, que continua exigindo os donos e revisão de HIGH.
- Passaram os 11 testes existentes da seção **orchestrate skill** de `test/cli.test.js`, incluindo distribuição em HOME temporário, preservação de arquivos pessoais e limite de 2.500 palavras.
- Perfis automáticos do diff isolado: Claude 2.484 → 2.471; Codex 2.377 → 2.364; OpenCode 2.423 → 2.410 palavras. Descrições de agentes/skills não mudaram. O corpo sob demanda de orchestrate foi de 1.427 para 1.451 palavras.
- Economia real de tokens e eficácia comportamental permanecem **não medidas**. Não houve avaliação paga nem reinstalação pessoal.

## Separação do trabalho concorrente

A base observada no início era `8e0428ffc7f060445878bdf9844d98586f601dd5`, na branch `main`. Ao concluir, o checkout já estava em `docs/memory-migration-rules`, com o mesmo HEAD. Este trabalho não executou criação/troca de branch, commit ou push, nem alterou o handoff de migração.

O diff original destes dois arquivos tinha 20 inserções e 19 remoções. Depois disso, o estado do repositório avançou por outras operações; esta nota descreve a autoria dos trechos, não afirma que eles ainda estejam sem commit.

Ao combinar os trabalhos, preservar os trechos concorrentes. As adições sobre instruções de IA, evidências de estado em disco e claims retransmitidas, assim como mudanças em Gard, Pipe e documentação de ferramentas/hooks, não pertencem a este ajuste. Não reverter o diff inteiro dos arquivos compartilhados para retirar apenas estas mudanças. Recalcular o orçamento com o conjunto combinado; os números acima são históricos do diff isolado.
