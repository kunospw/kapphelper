---
name: deploy
description: Deploy, restart, tail logs, or open a DB shell for a registered project. Reads projects.yaml for the target's deploy config, runs non-privileged pre-flight checks via SSH, then either hands the sudo command to the user (advisory mode) or executes it directly (executed mode — future). Use when the user says "deploy X", "restart X", "tail X logs", or "open DB on X".
---

# deploy

Ship code that's already committed, restart a running service, or poke at its runtime state.
Never invents deploy targets — everything comes from `projects.yaml`.

## When to run

- User says "deploy <project>", "push to prod", "restart <service>", "rebuild <service>"
- User asks to tail logs, open a DB shell, or curl a health endpoint on a live service
- After a code change that needs to reach a running server

## When NOT to run

- Code change hasn't been pushed to the branch the server pulls from → prompt to commit + push first
- Target isn't in `projects.yaml` → propose adding an entry, don't hardcode
- Target is `type: mobile-ios` / `mobile-android` → this is not the mobile-deploy flow (App Store is a separate skill; not built yet)
- Target has `deploy.type: not-owned` / `none` → refuse

## Steps

### 1. Identify target

- User named it? Use that slug.
- Multi-stack project (e.g. TSApp has `pilot` and `live`)? User must name the stack.
  If not specified → ASK. Never guess between pilot and live.
- Ambiguous or unregistered → list registered `apps.*` + `clients.*` from `projects.yaml`.

### 2. Look up deploy config

Read the relevant block from `projects.yaml`:
- Single-stack: `apps.<slug>.deploy` or `clients.<slug>.deploy`
- Multi-stack: `clients.<slug>.deploys.<stack>`

Bail early if:
- `type` is not `docker` (this skill is docker-only)
- `mode` is unknown (only `advisory` and `executed` are valid)
- Required fields missing (`ssh_host` for target: ssh, `path`, `compose_file`, at least one of `services` or `common_commands`)

### 3. Pre-flight (non-privileged, always safe)

Everything here works **without sudo** — plain SSH + git + ls + curl.

```bash
ssh <ssh_host> "cd <path> && \
  echo '── branch ──' && git branch --show-current && \
  echo '── uncommitted ──' && git status --short && \
  echo '── recent ──' && git log --oneline -5 && \
  echo '── env ──' && ls -la <env_file> 2>/dev/null && \
  echo '── secrets ──' && ls -la <secrets_dir> 2>/dev/null"
```

Report:
- Branch (flag if not `main` / not the branch in `projects.yaml`)
- Uncommitted files count (block deploy if there are uncommitted **tracked** changes on the server — that's a state divergence)
- Latest commit vs local: is server behind?
- Env file + secrets dir present? (if config specifies them)

If anything looks off → **stop and report before generating the deploy command**.

### 4. Generate the deploy command

Prefer `common_commands.deploy` verbatim — that's the user's known-good workflow.

Fallback template if `common_commands` not present:

```bash
cd <path>
git pull
sudo docker compose \
  [-p <compose_project>] \
  [--env-file <env_file>] \
  [-f <compose_file>] \
  up -d --build [<services list — omit for all>]
```

Only include flags that the config actually sets (don't emit `-p tsapp-live` if `compose_project` isn't defined).

### 5. Branch on `deploy.mode`

**`mode: advisory`** (current default for tsapp):

Present the command in a fenced block. Include a one-line "why this command" summary if the flags matter (e.g. Live requires `-p tsapp-live -f docker-compose.live.yml` — bare `sudo docker compose up` hits pilot).

Format:

```
▶ <project> <stack> — ready to deploy

Pre-flight: <one-line summary>

Run this in your SSH terminal (sudo will prompt for password):
─────────────────────────────────────────────
<command>
─────────────────────────────────────────────

Paste the last ~30 lines of output when done — I'll verify from here.
```

Then STOP. Wait for user output.

**`mode: executed`** (future — not any project today):

Run the command via SSH directly. Refuse if `common_commands.deploy` contains `sudo` and there's no whitelisted passwordless-sudo entry.

### 6. Post-deploy verification (non-privileged)

After the user pastes output (advisory) or the executed command returns:

- Parse the output for obvious failures (`Error`, `unhealthy`, non-zero exit)
- For each `health` entry in the config:
  ```bash
  ssh <ssh_host> "curl -s -m 10 -o /dev/null -w '%{http_code}\n' <url>"
  ```
  Expect 200. Report code + name.
- If a `ports` block is defined, spot-check the port is listening (no sudo needed for the check):
  ```bash
  ssh <ssh_host> "ss -tln 2>/dev/null | grep -E ':(<port>)\\s' || echo 'not listening'"
  ```
- If verification fails, offer to tail logs (use `common_commands.tail_api_logs`).

### 7. Report

One tight paragraph:

```
✓ <project> <stack> deployed
  <container-name-1> on :<port> → 200 (health OK)
  <container-name-2> on :<port> → 200
  Commit: <sha> "<subject>"

Anything to check? (tail logs / open DB shell / redeploy)
```

If anything red → be explicit about what failed and offer the next debug move (tail logs is almost always it).

## Sibling operations (same skill)

If the user's request is not a full deploy but one of these, jump straight to the right command:

| Request | Config field | Advisory action |
|---|---|---|
| "tail api logs" / "show me the logs" | `common_commands.tail_api_logs` | print the command; ask user to run |
| "tail frontend logs" | `common_commands.tail_frontend_logs` | same |
| "open db shell" / "sqlcmd" | `common_commands.db_shell` | same (env var `$SA_PASSWORD` must be set in user's shell) |
| "restart <service>" | `common_commands.restart_only` | same |

Pre-flight is optional for these — user usually just wants the command.

## Rules

- **Never generate a command with a real credential in it.** If a `common_commands` entry has a placeholder like `$SA_PASSWORD`, keep it as-is — don't substitute.
- **Never invent flags** — if you don't know whether to add `--force-recreate` etc., ask. Extra flags on a rebuild can wipe state.
- **Never pipe the sudo password in.** No `echo pw | sudo -S ...`, no `sshpass`. If a project needs it, mode should be `advisory`.
- **Never suggest destructive commands casually** — `docker compose down -v` wipes volumes; `git reset --hard` loses uncommitted work on the server. If the fix requires one, spell out what it will destroy and wait for explicit go-ahead.
- **Live is not pilot.** For tsapp specifically: bare `sudo docker compose up` hits pilot. Live requires the full `-p tsapp-live --env-file .env.live -f docker-compose.live.yml` trio. Never let this collapse into "just deploy tsapp."

## What this skill does NOT do

- **Push code** — user pushes from local; this skill only pulls on the server side.
- **Run migrations** — if a deploy needs a migration, surface the fact and ask; don't run it.
- **Manage secrets** — `.env`, `secrets/*.json`, etc. live on the server and are edited by the user (or Ken). Never `scp` a secret up.
- **Rotate credentials** — separate flow, needs Ken's involvement.

## After deploy

If anything durable came out — a new gotcha, a config that surprised us, a step that isn't in
this skill yet — write a capture (`apps/<slug>/capture/` or `clients/<slug>/capture/`) or a
memory (`memory/feedback_*.md`) so the next session doesn't relearn it.
