Estou continuando a configuração da minha equipe OpenClaw no Beelink MiniS.

Contexto técnico:
- OpenClaw roda no Beelink via Docker Compose.
- Repo do OpenClaw: C:\Users\lirae\openclaw
- Config/runtime: C:\Users\lirae\.openclaw
- Repo versionado da equipe: C:\Users\lirae\openclaw-team-config
- GitHub remoto: https://github.com/erikalira/openclaw-team-config
- O repo real openclaw-team-config está montado dentro do workspace do Virgo em:
  /home/node/.openclaw/workspace-virgo/openclaw-team-config
- Isso permite que o Virgo edite o repo real diretamente.
- Main voltou a ser o agente default neutro.
- OAuth OpenAI/Codex funciona por login, não API key.
- Auth é copiado do Archie para novos agentes com:
  ./scripts/sync-auth-to-agent.sh <agent>
- Sync de agente para runtime:
  ./scripts/sync-agent-to-openclaw.sh <agent>

Agentes já criados, commitados, pushados, sincronizados e testados:
- main — default neutro
- archie — arquitetura
- scott — produto
- virgo — maintainer/repo
- spencer — documentação
- pixie — UX/design
- quinn — qualidade/testes

Estado confirmado:
- Gateway healthy.
- Main responde.
- Virgo responde.
- Spencer responde.
- Pixie responde.
- Quinn responde.
- Último checkpoint feito:
  openclaw.json.with-quinn-working.<timestamp>
  docker-ps.with-quinn-working.<timestamp>

Fluxo correto:
1. Pedir ao Virgo para criar o próximo agente no repo:
   /home/node/.openclaw/workspace-virgo/openclaw-team-config
2. Virgo não deve sincronizar runtime, não editar openclaw.json, não rodar docker, não fazer commit/push.
3. Eu reviso no MiniS:
   cd ~/openclaw-team-config
   git status
   git diff --stat
   git diff --check
   find agents/<agent> skills/<agent> -type f | sort
4. Commit/push:
   git add agents/<agent> skills/<agent>
   git commit -m "Add <Agent> <domain> agent and skills"
   git push
5. Sync:
   ./scripts/sync-agent-to-openclaw.sh <agent>
   ./scripts/sync-auth-to-agent.sh <agent>
6. Backup openclaw.json.
7. Registrar agente no agents.list mantendo main como primeiro/default.
8. Restart/validate/test:
   cd ~/openclaw
   docker compose restart openclaw-gateway
   sleep 8
   docker compose ps
   docker compose run --rm openclaw-cli agents list --bindings
   docker compose run --rm openclaw-cli models status --probe --agent <agent>
9. Testar no dashboard.
10. Fazer checkpoint.

Instruções críticas adicionais:

1. Criar/commitar/sincronizar agente NÃO registra o agente no OpenClaw.
   Depois de:
   - git commit/push
   - ./scripts/sync-agent-to-openclaw.sh <agent>
   - ./scripts/sync-auth-to-agent.sh <agent>

   Ainda é obrigatório atualizar agents.list no openclaw.json.

2. Ao registrar agente, usar sempre:
   path: agents.list
   formato: lista de objetos
   campo correto: agentDir
   nunca usar "agent" no lugar de "agentDir".

3. Manter main sempre como primeiro agente da lista.
   main deve continuar default/neutro.

4. Usar paths absolutos dentro do container:
   /home/node/.openclaw/workspace-<agent>
   /home/node/.openclaw/agents/<agent>/agent

   Evitar salvar novos agentes com:
   $OPENCLAW_HOME/.openclaw/...
   porque em alguns comandos isso já virou /app/$OPENCLAW_HOME e quebrou auth/path.

5. Cada agente registrado deve ter:
   id
   name
   workspace
   agentDir
   identity.name
   skills

6. Depois de registrar agente:
   docker compose restart openclaw-gateway
   sleep 8
   docker compose ps
   docker compose run --rm openclaw-cli agents list --bindings
   docker compose run --rm openclaw-cli models status --probe --agent <agent>

7. Se aparecer "Unknown agent id <agent>", o agente ainda não está registrado no agents.list.
   Não refazer commit/sync; registrar no runtime.

8. Se aparecer 401 Unauthorized/profile=-, verificar:
   ./scripts/sync-auth-to-agent.sh <agent>
   e depois:
   docker compose run --rm openclaw-cli models status --probe --agent <agent>

9. Se o CLI probe der ok, mas o dashboard der 401, recriar gateway:
   cd ~/openclaw
   docker compose up -d --force-recreate openclaw-gateway
   sleep 10

10. Virgo edita o repo real montado em:
    /home/node/.openclaw/workspace-virgo/openclaw-team-config

    Esse caminho reflete:
    C:\Users\lirae\openclaw-team-config

11. Não colocar o repo principal dentro de .openclaw como fonte da verdade.
    O repo fonte da verdade continua:
    C:\Users\lirae\openclaw-team-config

12. Ficar atento a arquivos untracked inesperados.
    No caso atual apareceu docs/ como untracked.
    Antes de commit:
    git status --short
    find docs -type f | sort

13. Não executar comandos gerados pelo Virgo sem revisar formato.
    Ele já gerou uma vez um comando errado usando:
    {"agents": {...}}
    e "agent" em vez de "agentDir".