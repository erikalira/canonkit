# Handoff — follow-ups de segurança WSL

Atualizado em 2026-11-12. O suporte de resolvers WSL foi concluído em `806f6cb`, documentado em ADR 0001, `docs/install.md` e nas notas 3.1.0. A suíte registrada nessa implementação passou (1.159 testes; 21 ignorados).

## Ainda falta

Os únicos itens restantes deste trabalho estão no [issue #36](https://github.com/erikalira/canonkit/issues/36):

- endurecer chamadas Git antigas (`core.fsmonitor=false` e remoção de `GIT_*`);
- proteger as leituras FIFO restantes;
- cobrir `unsafeWriteRoot` aninhado.

Fechar este handoff quando o issue estiver resolvido. Não duplicar aqui o plano técnico do issue. Preservar alterações não relacionadas; não fazer commit sem autorização.
