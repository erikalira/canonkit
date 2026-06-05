# rollback-planning

## Quando usar

Use quando uma mudanca precisa de plano de rollback, abort criteria, mitigacao de falha ou retorno seguro para estado anterior.

## Processo

1. Identifique o que muda: codigo, config, dados, infra, job, fila ou dependencia.
2. Identifique o estado anterior e como restaura-lo.
3. Verifique se rollback e reversivel, parcial ou impossivel.
4. Defina criterio de abortar.
5. Defina passos de rollback e owner.
6. Verifique impacto em dados persistentes e compatibilidade.
7. Defina validacao apos rollback.
8. Classifique risco: LOW, MEDIUM ou HIGH.
9. Liste mitigacoes quando rollback direto nao for possivel.
10. Escale para Archie, Gard ou Quinn quando houver contrato, dados, seguranca ou validacao critica.

## Saida esperada

- Mudanca
- Estado anterior
- Tipo de rollback
- Criterio de abortar
- Passos de rollback
- Validacao apos rollback
- Risco
- Mitigacoes
- Bloqueios
- Dependencias

## Limites

Nao aceitar rollback implicito para mudanca HIGH. Se rollback nao for possivel, exigir mitigacao, plano de contingencia e aceite explicito do risco.
