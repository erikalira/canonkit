# OpenClaw Team Config

Configuração versionada da equipe de agentes OpenClaw.

Este repositório guarda prompts, skills, templates, scripts e documentação controlados manualmente para reconstruir e manter a equipe OpenClaw.

## Estado da equipe

Agentes principais configurados:

| Agente    | Papel                      |
| --------- | -------------------------- |
| `main`    | default neutro             |
| `archie`  | arquitetura                |
| `scott`   | produto                    |
| `virgo`   | maintainer/repo            |
| `spencer` | documentação               |
| `pixie`   | UX/design                  |
| `quinn`   | qualidade/testes           |
| `gard`    | segurança                  |
| `bob`     | engenharia/implementação   |
| `pipe`    | DevOps/plataforma/operação |
| `iris`    | Machine Learning / Visão Computacional |

## Fonte da verdade

O repo fonte da verdade fica em:

```text
C:\Users\lirae\openclaw-team-config
```

Dentro do runtime do OpenClaw, esse repo real está montado no workspace do Virgo em:

```text
/home/node/.openclaw/workspace-virgo/openclaw-team-config
```

Esse caminho reflete o mesmo repo do Windows:

```text
C:\Users\lirae\openclaw-team-config
```

O Virgo pode editar esse repo real diretamente, mas não deve sincronizar runtime, editar `openclaw.json`, rodar Docker, fazer commit ou push sem revisão humana.

## Runtime real

O runtime real do OpenClaw fica em:

```text
C:\Users\lirae\.openclaw
```

No container, os caminhos equivalentes usam:

```text
/home/node/.openclaw
```

Este repositório **não** substitui o runtime. Ele é a fonte da verdade para os arquivos que queremos preservar, revisar, versionar e reconstruir.

## Não colocar o repo principal dentro de `.openclaw`

Não usar `.openclaw` como fonte da verdade do repo versionado.

Correto:

```text
C:\Users\lirae\openclaw-team-config
```

Incorreto:

```text
C:\Users\lirae\.openclaw\openclaw-team-config
```

## O que versionar

* `agents/<agent>/AGENTS.md`
* `skills/<agent>/<skill>/SKILL.md`
* templates
* scripts auxiliares revisados
* documentação da equipe
* instruções operacionais que não contenham segredo

## O que não versionar

* tokens
* `.env`
* auth profiles
* OAuth profiles
* logs
* caches
* sessões
* bancos SQLite
* arquivos temporários do runtime
* backups do `openclaw.json`
* arquivos gerados dentro de `.openclaw`

## Fluxo para criar agente novo

1. Pedir ao Virgo para criar os arquivos no repo real:

```text
/home/node/.openclaw/workspace-virgo/openclaw-team-config
```

2. O Virgo deve criar apenas:

```text
agents/<agent>
skills/<agent>
```

3. O Virgo não deve:

* sincronizar runtime;
* editar `openclaw.json`;
* rodar Docker;
* rodar scripts de sync;
* fazer commit;
* fazer push;
* alterar permissões;
* mexer em auth, tokens ou credenciais;
* editar arquivos fora do escopo do agente.

4. Revisar no MiniS:

```bash
cd ~/openclaw-team-config

git status --short
git diff --stat
git diff --check
find agents/<agent> skills/<agent> -type f | sort
```

5. Commit/push:

```bash
git add agents/<agent> skills/<agent>
git commit -m "Add <Agent> <domain> agent and skills"
git push
```

6. Sincronizar para runtime:

```bash
./scripts/sync-agent-to-openclaw.sh <agent>
./scripts/sync-auth-to-agent.sh <agent>
```

7. Corrigir permissão do auth do agente novo, se necessário:

```bash
cd ~/openclaw
docker compose exec -u root openclaw-gateway sh -c '
chown node:node /home/node/.openclaw/agents/<agent>/agent/auth-profiles.json &&
chmod 600 /home/node/.openclaw/agents/<agent>/agent/auth-profiles.json &&
ls -l /home/node/.openclaw/agents/<agent>/agent/auth-profiles.json
'
```

O esperado é:

```text
-rw------- 1 node node ... /home/node/.openclaw/agents/<agent>/agent/auth-profiles.json
```

8. Fazer backup do `openclaw.json`:

```bash
cd ~/.openclaw
cp openclaw.json "openclaw.json.before-<agent>.$(date +%Y%m%d-%H%M%S)"
```

9. Registrar manualmente o agente em:

```text
agents.list
```

Dentro de:

```text
C:\Users\lirae\.openclaw\openclaw.json
```

## Registro em `agents.list`

Criar/commitar/sincronizar um agente **não registra** o agente no OpenClaw.

Depois de:

```bash
git commit
git push
./scripts/sync-agent-to-openclaw.sh <agent>
./scripts/sync-auth-to-agent.sh <agent>
```

ainda é obrigatório atualizar manualmente:

```text
agents.list
```

em:

```text
openclaw.json
```

## Formato correto de agente registrado

Usar sempre:

* path: `agents.list`
* formato: lista de objetos
* campo correto: `agentDir`
* nunca usar `agent` no lugar de `agentDir`

Manter `main` sempre como primeiro agente da lista.

Exemplo:

```json
{
  "id": "<agent>",
  "name": "<Agent>",
  "workspace": "/home/node/.openclaw/workspace-<agent>",
  "agentDir": "/home/node/.openclaw/agents/<agent>/agent",
  "identity": {
    "name": "<Agent>"
  },
  "skills": [
    "skill-name"
  ]
}
```

## Paths absolutos no runtime

Ao registrar novos agentes, usar paths absolutos dentro do container:

```text
/home/node/.openclaw/workspace-<agent>
/home/node/.openclaw/agents/<agent>/agent
```

Evitar salvar novos agentes com:

```text
$OPENCLAW_HOME/.openclaw/...
```

Esse formato já resolveu incorretamente como:

```text
/app/$OPENCLAW_HOME
```

em alguns fluxos e pode quebrar auth/path.

## Validação depois de registrar agente

Depois de editar `openclaw.json`:

```bash
cd ~/.openclaw
node -e "JSON.parse(require('fs').readFileSync('openclaw.json','utf8')); console.log('openclaw.json OK')"
```

Depois:

```bash
cd ~/openclaw

docker compose restart openclaw-gateway
sleep 8
docker compose ps
docker compose run --rm openclaw-cli agents list --bindings
docker compose run --rm openclaw-cli models status --probe --agent <agent>
```

## Interpretação de erros comuns

### `Unknown agent id <agent>`

O agente ainda não está registrado em:

```text
agents.list
```

Não refazer commit/sync. Registrar o agente no runtime.

### `401 Unauthorized/profile=-`

Verificar auth:

```bash
./scripts/sync-auth-to-agent.sh <agent>
```

Depois corrigir permissão do auth e repetir:

```bash
docker compose run --rm openclaw-cli models status --probe --agent <agent>
```

### CLI probe OK, mas dashboard dá 401

Recriar gateway:

```bash
cd ~/openclaw
docker compose up -d --force-recreate openclaw-gateway
sleep 10
```

## Checkpoints

Depois que um agente estiver registrado, validado e testado, criar checkpoint:

```bash
cd ~/.openclaw
cp openclaw.json "openclaw.json.with-<agent>-working.$(date +%Y%m%d-%H%M%S)"

cd ~/openclaw
docker compose ps > ~/.openclaw/"docker-ps.with-<agent>-working.$(date +%Y%m%d-%H%M%S)"
```

Para checkpoint final da equipe completa:

```bash
cd ~/.openclaw
cp openclaw.json "openclaw.json.with-full-team-working.$(date +%Y%m%d-%H%M%S)"

cd ~/openclaw
docker compose ps > ~/.openclaw/"docker-ps.with-full-team-working.$(date +%Y%m%d-%H%M%S)"
docker compose run --rm openclaw-cli agents list --bindings > ~/.openclaw/"agents-list.with-full-team-working.$(date +%Y%m%d-%H%M%S)"
```

## Atenção com arquivos inesperados

Antes de cada commit:

```bash
git status --short
```

Se aparecerem diretórios inesperados, especialmente `docs/`, revisar antes:

```bash
find docs -type f | sort
```

Nunca adicionar arquivos inesperados automaticamente.

## Segurança operacional

Após `sync-auth-to-agent.sh`, conferir permissões do auth profile:

```bash
cd ~/openclaw
docker compose exec -u root openclaw-gateway sh -c 'ls -l /home/node/.openclaw/agents/<agent>/agent/auth-profiles.json'
```

Corrigir se necessário:

```bash
docker compose exec -u root openclaw-gateway sh -c '
chown node:node /home/node/.openclaw/agents/<agent>/agent/auth-profiles.json &&
chmod 600 /home/node/.openclaw/agents/<agent>/agent/auth-profiles.json &&
ls -l /home/node/.openclaw/agents/<agent>/agent/auth-profiles.json
'
```

Auth profiles devem ficar:

```text
-rw------- 1 node node
```

## Regra de revisão

Não executar comandos gerados por agentes sem revisar o formato.

O Virgo já gerou uma vez comando incorreto usando:

```json
{"agents": {...}}
```

e também usando:

```text
agent
```

em vez de:

```text
agentDir
```

O formato correto é `agents.list` como lista de objetos e campo `agentDir`.
