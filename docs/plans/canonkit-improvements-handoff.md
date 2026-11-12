# Handoff — pendências das melhorias CanonKit

Atualizado em 2026-11-12. Itens 1–9 do plano original foram implementados; este handoff mantém só o que ainda requer acompanhamento. A implementação não comprova eficácia comportamental nem as pontuações-alvo. O histórico detalhado foi removido deste handoff; decisões duráveis estão nas instruções e ADRs do projeto.

## Pendências

- **Remoção na versão 3.x:** remover de `~/.agents/` as cópias idênticas de agentes core, conforme planejamento da migração universal. A versão 3.0 foi o destino previsto, mas a remoção não está registrada como concluída. Conferir comportamento e notas de release antes de fechar este item.
- **Eficácia comportamental:** medir learning loop e stack packs; a implementação existe, mas os resultados não foram avaliados. Definir corpus e executar avaliação autorizada antes de afirmar eficácia.
- **Avaliação do corpus de qualidade:** reexecutar o corpus completo atualizado e registrar baseline. Há histórico anterior, mas não substitui uma medição atual.
- **Escopo do `context-tune`:** decidir se `skills/context-tune` permanece no core.
- **Política de chaves desconhecidas:** decidir entre WARN e FAIL. Não há gate padrão adicional de lint/testes registrado.
- **Rubrica:** os ajustes propostos para E1/E3/E4 e a classificação de contexto injetado pelo SessionStart não foram aplicados; só retomar junto a uma nova revisão versionada da rubrica.

## Limites

Avaliações com modelos reais podem consumir crédito e exigem autorização explícita. Não inferir eficácia a partir de implementação, testes sintéticos ou avaliação parcial. Este documento não autoriza publicação, commit ou push.
