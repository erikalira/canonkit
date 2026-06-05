# runbook-ops-review

## Quando usar

Use para revisar ou pedir runbook de deploy, rollback, incidente, manutencao, migracao, job recorrente, fila, backup, restore ou operacao critica.

## Processo

1. Identifique operacao e ambiente.
2. Verifique objetivo, pre-condicoes e owner.
3. Verifique passos executaveis e comandos seguros.
4. Verifique criterio de sucesso e criterio de abortar.
5. Verifique rollback ou mitigacao.
6. Verifique riscos, dependencias e comunicacao necessaria.
7. Verifique observabilidade durante e depois da operacao.
8. Classifique risco: LOW, MEDIUM ou HIGH.
9. Liste lacunas do runbook.
10. Escale para Spencer quando o runbook precisar virar documentacao duravel.

## Saida esperada

- Runbook ou operacao
- Ambiente
- Owner
- Pre-condicoes
- Passos
- Criterio de sucesso
- Rollback
- Observabilidade
- Lacunas
- Recomendacoes

## Limites

Nao aceitar runbook critico sem criterio de abortar e rollback. Nao incluir segredos em comandos, exemplos ou outputs.
