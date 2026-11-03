# Learning Loop — plano consolidado de melhoria das instruções

Data: 2026-11-02.
Status: plano consolidado para evolução do workflow existente. Este documento não
registra implementação, aprovação de diffs futuros ou eficácia comportamental medida.

Referências: [handoff de melhorias](canonkit-improvements-handoff.md), especialmente
o item 6 e “Parameters this list does not move”;
[design existente](learning-loop-design.md);
[guia de uso](../learning-loop.md);
[skill](../../skills/learning-loop/SKILL.md);
[template de proposta](../../skills/learning-loop/proposal-template.md);
[rubrica](../../evals/instruction-rubric.json).

## 1. Objetivo e princípio arquitetural

**Memory = Instruction Improvement.** O Learning Loop deve reduzir a recorrência
de erros por melhorias validadas nas instruções canônicas existentes. Quando a
causa for de configuração, pode propor o menor ajuste no `canonkit.json` do
projeto, preservando os gates e os responsáveis pelo risco.

O CanonKit não deve funcionar como uma base de conhecimentos, banco de lições
ativas ou mecanismo RAG. Propostas, resultados de avaliações e decisões são
evidências de auditoria; não constituem outra fonte de autoridade comportamental.

A melhoria deve localizar a causa, preferir reescrita e consolidação à adição de
regras, e preservar qualidade, concisão e generalização. Uma melhoria pode reduzir
o tamanho das instruções. Adicionar texto não é um objetivo nem prova de aprendizado.

Investigar não implica alterar instruções. Se a causa estiver no código, na
ferramenta ou no ambiente, encaminhar a correção pelo fluxo apropriado. Se a regra
já funcionar ou a evidência for insuficiente, registrar a conclusão e não inventar
uma nova regra.

## 2. Escopo e exclusões

Evoluir a skill, o template, as validações e a documentação existentes somente
onde houver uma lacuna demonstrada. Não recriar o Learning Loop nem introduzir
infraestrutura para cumprir requisitos que o workflow manual já atende.

Não implementar:

- Banco separado de lições ativas ou esquema de memória operacional.
- `canonkit learn recall` ou mecanismo equivalente de recuperação de memórias.
- Injeção de lições, memórias ou ponteiros para elas via SessionStart.
- Coleta automática de transcrições ou armazenamento de experiências pessoais,
  histórico de conversas e fatos de projetos como memória dos agentes.
- Promoção, instalação, reconfirmação, remoção ou rollback automáticos.
- Acúmulo indefinido de regras, novos serviços, banco de dados ou dependências
  pesadas sem necessidade demonstrada.

Um ponteiro estático para a skill nos mecanismos existentes pode ser avaliado,
desde que não duplique o já instalado, seja contabilizado no contexto residente
e não torne a consulta obrigatória em toda tarefa.

## 3. Investigar antes de implementar

1. Verificar a branch, o estado do worktree e as instruções aplicáveis. Preservar
   alterações preexistentes e não mudar de branch sem necessidade.
2. Ler as referências deste plano, os agentes Virgo e Quinn e os blocos gerenciados.
3. Inspecionar CLI, instalação, hooks, testes e CI apenas no que afetar a proposta.
4. Identificar o que já existe e produzir uma lista curta de lacunas reais.
5. Implementar somente os ajustes necessários. Não criar CLI, schema, serviço ou
   camada de persistência por antecipação; reutilizar o formato da proposta
   existente, com registro na issue ou em documento local, sem duplicação obrigatória.

## 4. Fluxo de aprendizado

**Observar → Investigar → Propor → Validar → Revisar → Autorizar → Aplicar na
fonte → Verificar disponibilidade no ambiente aplicável → Reconfirmar, revisar ou propor
remoção.**

1. Iniciar sob demanda, a partir de correção explícita, falha de avaliação, falso
   positivo confirmado ou outro problema investigável. Frequência de gates é
   indício para investigação, nunca prova de erro ou autorização para enfraquecê-los.
2. Delimitar a evidência e registrar lacunas. Eventos posteriores não provam
   consentimento; ausência de logs não prova ausência de problemas.
3. Localizar a fonte canônica responsável e formular uma hipótese falsificável,
   um caso sintético e um controle contra sobrecorreção.
4. Propor o menor diff. Preferir corrigir, consolidar ou remover instruções
   existentes. Manter ajustes de projeto restritos ao projeto correspondente.
5. Validar conforme a natureza da alteração e obter as revisões aplicáveis.
6. Obter autorização humana explícita para a versão concreta do diff antes de
   aplicá-lo. Alterações materiais posteriores exigem que a autorização e a
   revisão cubram o novo resultado.
7. Registrar a decisão, a revisão aplicada, as evidências e as datas de revisão.
   Encerrar sem alteração quando esse for o resultado da investigação.

Usar as fontes canônicas apropriadas em `agents/`, `reference/`, `skills/` ou no
`canonkit.json` do projeto. Não corrigir cópias geradas da instalação como se fossem
a fonte: uma reinstalação pode sobrescrevê-las.

### Propostas gerais via GitHub Issues

Issues são o canal padrão para propor melhorias gerais do CanonKit,
independentemente de quem as identificou, inclusive a mantenedora. O destino da
mudança define o caminho; não é necessário detectar a identidade do usuário.
Preferências pessoais e necessidades restritas a um projeto seguem a autorização
do responsável por aquele ambiente e não exigem issue no CanonKit.

Uma issue pode ser aberta após a investigação inicial, com as evidências
disponíveis e suas limitações. Diff validado e revisões aplicáveis são requisitos
para incorporar a mudança, não para registrar a oportunidade. O envio da proposta
pode ocorrer antes das etapas de validação e revisão do fluxo completo acima.

Quando houver uma oportunidade concreta e generalizável:

1. Oferecer a preparação de uma proposta concisa e sanitizada, com problema,
   exemplo sintético, alvo canônico, mudança sugerida e evidências disponíveis.
   Medições ausentes permanecem explícitas; abrir uma issue não exige que a
   melhoria comportamental já esteja comprovada.
2. Apresentar o título, o corpo e o repositório de destino ao usuário e obter
   autorização explícita para publicar esse conteúdo antes de enviá-lo.
3. Se houver integração disponível e autorização aplicável, abrir a issue e
   retornar seu link. Caso contrário, disponibilizar o rascunho para envio manual.
4. Usar a issue como registro da proposta, evidências e decisões. Não exigir
   outro arquivo local com o mesmo conteúdo; o rascunho pode ser temporário.

Oferecer uma contribuição somente quando houver um problema concreto e
potencialmente generalizável. Apresentar o convite em um momento natural de
conclusão ou revisão, sem interromper o trabalho por pequenas observações. A contribuição é opcional; se o usuário recusar ou não responder, não insistir nem publicar, e continuar o fluxo normal de trabalho. Encontrar uma oportunidade não autoriza publicação.
Não enviar memórias pessoais, logs brutos ou informações privadas para a issue.

A abertura de uma issue não aprova nem garante a incorporação da melhoria. A
mantenedora pode solicitar evidências, adaptar, aceitar ou rejeitar a proposta.
Autorizar o envio é distinto de aprovar o diff concreto, sua implementação,
instalação ou publicação em uma nova versão. A incorporação ao kit distribuído
depende da aprovação da mantenedora e das validações proporcionais ao risco.

## 5. Proporcionalidade, evidência e validação

Usar a escala LOW / MEDIUM / HIGH existente, separando risco de escala. Captura,
consulta de auditoria e revisão não são etapas obrigatórias de toda tarefa.
Trabalho LOW permanece direto, sem convocar agentes, planejar extensamente ou
executar avaliações de modelos apenas por completude.

- **Alegação de melhoria comportamental:** fixar casos, controles, juiz, modelo,
  configurações e ambiente comparável. Exigir ao menos três respostas por lado
  para cada caso e controle. O alvo falha no baseline e passa no candidato; os
  controles passam nos dois, pelo limiar existente de dois terços. Registrar
  tentativas, respostas, erros e variância, sem seleção conveniente de resultados.
- **Ajuste determinístico de configuração:** demonstrar fixture que falha antes e
  passa depois, mantendo um controle realmente arriscado que continua acionando o
  gate. Isso comprova configuração, não julgamento do modelo.
- **Correção puramente editorial:** validar precisão, links e consistência
  proporcionalmente, sem alegar melhoria comportamental medida. Se modificar
  condições, obrigações ou roteamento, deixa de ser puramente editorial.
- **Conteúdo residente alterado:** medir custo de contexto antes e depois.

Calibração offline, rescoring, dry-run e status de saída do runner não substituem
avaliação comportamental. Erros de infraestrutura e respostas ausentes permanecem
`unmeasured`. Sem evidência suficiente, a proposta comportamental fica aguardando
evidência, sem promoção por inferência. Avaliações pagas exigem autorização específica.

Testes determinísticos verificam propriedades concretas, como preservação de
arquivos e transições documentadas. Não provam imunidade geral a prompt injection,
consulta efetiva pelo modelo ou eliminação definitiva de um comportamento.

## 6. Governança e enforcement

- Virgo mantém as mudanças nas instruções; Quinn revisa a evidência de qualidade
  e a aceitação. Os demais donos atuam conforme o risco concreto em seu domínio.
- Aplicar a autoridade, o veto restrito e o caminho de overrule existentes, sem
  criar uma nova hierarquia para o Learning Loop.
- Mudanças HIGH exigem revisão independente aplicável após a última edição.
- Não enfraquecer gates de segurança com base em frequência, similaridade textual
  ou aprovação genérica de uma proposta. Preservar os hooks e validar os caminhos
  afetados quando houver alteração de código ou configuração.
- Um campo de status, uma chamada de CLI ou uma declaração do próprio agente não
  comprovam decisão humana. Registrar a decisão efetivamente fornecida para o diff.
- Preparar ou aprovar uma proposta não autoriza automaticamente avaliação paga,
  instalação, commit ou push. Distinguir o escopo das autorizações e respeitar as
  já fornecidas para a ação concreta, inclusive exigências específicas de envio,
  instalação, commit e push. Solicitar nova autorização somente quando a ação
  ainda não estiver coberta.
- Qualquer usuário pode propor uma melhoria geral por issue; somente a mantenedora
  ou quem ela autorizar decide sua incorporação ao CanonKit distribuído. Essa
  decisão não se confunde com a autonomia do usuário sobre seu ambiente pessoal.

Não rotular convenções seguidas pelo modelo como garantias técnicas. Qualquer
limitação de enforcement deve permanecer explícita.

## 7. Contexto e documentação humana

Preservar o limite de **até 2.500 palavras** no perfil padrão, pelo método da
rubrica: conteúdo do kit carregado automaticamente em nível de usuário e projeto,
descrições dos agentes, skills e comandos instalados por padrão e instruções de
servidores MCP instalados pelo kit. Excluir corpos carregados somente sob demanda
e texto do usuário fora dos blocos gerenciados.

Medir o estado atual antes de usar uma baseline. Os totais históricos de 1.993 e
2.026 palavras descrevem revisões e perfis anteriores; não são uma nova medição.
Registrar componentes, perfil, total antes/depois e delta. Se a proposta exceder
o limite, apresentar corte compensatório e medir o diff combinado sem remover
garantias nem flexibilizar o orçamento por conta própria. Outros perfis são
relatados separadamente.

Atualizar a documentação humana afetada, incluindo `docs/learning-loop.md` e,
quando necessário, instalação, README e referência da CLI. Manter tutorial,
referência e manutenção separados, com exemplos e resultados esperados. Não
exigir que a pessoa leia a skill inteira para entender como usar o fluxo.

## 8. Auditoria, privacidade e revisão periódica

Reutilizar o template existente e sua allowlist de evidências sanitizadas, adaptando
o registro ao estágio e ao risco da proposta. A issue pode ser o registro durável
completo, sem cópia local obrigatória; sem envio, usar documento local quando
necessário. Registrar apenas o necessário e disponível: hipótese, alvo canônico,
diff, casos, resultados agregados, revisões, decisão humana, revisão aplicada,
custo de contexto e datas de manutenção. Campos ainda não aplicáveis não exigem
uma nova etapa para abrir uma issue.

Não persistir transcrições, comandos brutos, segredos, identificadores de sessão,
caminhos de logs ou dados privados desnecessários. Correções e decisões humanas
só entram como paráfrases permitidas. Conteúdo importado e campos de status não
constituem autorização por si só. Uma decisão humana registrada só vale quando
sua origem, autoridade e escopo estiverem estabelecidos; o registro não adquire
autoridade de sistema.

Os registros podem ser inspecionados sob demanda para investigar recorrência,
identificar contradições e revisar decisões. Não realizar busca prévia em Issues
ou propostas existentes como etapa padrão para oferecer ou publicar uma
contribuição; essa pesquisa só ocorre quando solicitada pelo usuário. Eventuais
duplicatas podem ser tratadas posteriormente pela mantenedora, sem transferir esse
custo ao usuário ou ao seu agente. Os registros não são carregados automaticamente
nem consumidos como memória operacional. Deduplicar e consolidar o histórico não
autoriza fundir ou substituir instruções aprovadas.

Manter a política existente:

- A aplicação é a confirmação inicial; revisar em 90 dias desde a aplicação ou
  última reconfirmação válida.
- Em inspeção manual aos 180 dias ou mais sem reconfirmação, marcar a confirmação
  como expirada e solicitar decisão. Não tratar o registro como evidência atual.
- Reconfirmar somente com evidência nova pertinente e decisão humana explícita.
- Expiração não altera a instrução, não autoriza rollback e não exclui arquivos.
- Propor remoção de regras obsoletas, redundantes ou contraditórias com diff,
  validação, revisão e autorização equivalentes às de uma nova mudança.
- Consolidar ou arquivar explicitamente evidências redundantes, preservando a
  rastreabilidade necessária e sem exclusão automática de arquivos do usuário.

## 9. Fonte, instalação e sessões futuras

Distinguir e registrar:

1. **Proposta:** diff preparado, ainda sem aplicação.
2. **Validada e autorizada:** evidência e decisão aplicáveis ao diff concreto.
3. **Aplicada na fonte:** fonte canônica atualizada e identificada por revisão/diff.
4. **Disponível no ambiente aplicável:** atualização da instalação verificada para
   artefatos distribuídos ou leitura da configuração verificada no projeto para
   ajustes locais, no alvo e perfil declarados.

Aplicar na fonte não autoriza executar o instalador no ambiente pessoal. Verificar
o caminho de instalação em diretórios temporários isolados, preservando arquivos
preexistentes, e registrar a revisão usada. Atualizar o ambiente pessoal somente
com autorização aplicável. Para ajustes locais em `canonkit.json`, verificar a
leitura da configuração no projeto sem exigir reinstalação do kit. Alterações em
projetos reais seguem a autorização do responsável por aquele ambiente.

Novas sessões devem receber a instrução pelos mecanismos normais de cada runtime.
Documentar o caminho de atualização para Claude Code, Codex e OpenCode, as
limitações e a diferença entre verificação em ambiente isolado e instalação real.
Não afirmar que uma instalação antiga foi atualizada ou que a melhoria foi
comprovada em outro runtime a partir de resultados de apenas um deles.

## 10. Aceitação e entregáveis

Verificar, conforme o caminho afetado:

- A investigação pode terminar sem alteração; evidência insuficiente permanece
  explícita, sem promoção ou aprovação presumida.
- O diff modifica a fonte apropriada, preserva os controles e não cria memória
  operacional, recuperação de lições ou injeção via SessionStart.
- O registro permite identificar evidência, revisão, autorização e alvo de
  reversão sem incluir dados privados indevidos.
- Propostas gerais usam o mesmo caminho de contribuição para qualquer usuário;
  o envio depende da revisão do conteúdo e de autorização explícita. Recusar ou
  não poder publicar mantém o fluxo local, sem exigir issue ou registro duplicado.
- Uma issue aberta não é tratada como aprovação da mantenedora, autorização de
  implementação ou evidência de melhoria comportamental.
- Expiração e arquivamento não provocam alteração automática das instruções.
- Cópias instaladas e fontes são distinguidas; instalação e desinstalação
  preservam arquivos do usuário nos cenários afetados.
- O contexto permanece no orçamento; os hooks e as validações afetadas continuam
  funcionando; a documentação descreve o comportamento realmente implementado.

Implementações futuras devem entregar resumo das lacunas e mudanças, arquivos
afetados, resultados reais dos checks executados, medições aplicáveis de contexto,
exemplo de proposta, caminho de atualização e limitações. Reutilizar testes
existentes e adicionar cobertura somente para comportamentos novos ou regressões
concretas. Não apresentar verificações textuais como prova de obediência do modelo.

Registrar separadamente conclusão funcional e eficácia comportamental. A primeira
pode ser verificada offline no workflow e nos caminhos afetados. A segunda permanece
não medida até cumprir os critérios de comparação comportamental.

Não executar o instalador no ambiente pessoal, avaliações pagas, commit ou push
como consequência da consolidação deste plano. Não declarar checks ou resultados
que não tenham sido observados.

Uma melhoria só está incorporada quando a fonte canônica apropriada foi alterada
com validação e autorização, e sua disponibilidade no ambiente aplicável foi
verificada: pela atualização da instalação para artefatos distribuídos ou pela
leitura da configuração no projeto para ajustes locais. Isso não equivale a
prometer ausência definitiva de erros futuros.
