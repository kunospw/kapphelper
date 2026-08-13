# standards/

Kairos-wide engineering conventions. Currently just a pointer to the master handbook — will
grow into per-stack files (`dotnet.md`, `node.md`, `flutter.md`, `docker-compose.md`) as
patterns crystallize.

## Master reference

The authoritative document is `Kairos_Dev_Knowledge_Handbook.md` (lives at the parent Kairos
folder, not in this repo — it predates kapphelper). Rules from there that Claude must know:

- **Commit format:** Conventional Commits — `<type>(<scope>): <desc>` where type ∈
  `feat`/`fix`/`docs`/`chore`/`refactor`/`test`/`build`/`ci`
- **Branches:** `feature/<name>` → `dev` → `prod` going forward. Existing repos grandfathered
  (some still on `main`, `master`, `nazmitest`) — always check the repo's own README.
- **Build before push:** `npm run build` / `dotnet build` / `flutter analyze && flutter build`
  as appropriate. No CI gate — expected practice.
- **Docs per repo:** README + CHANGELOG + CONTEXT + DEPLOYMENT at the root. Format specified in
  handbook §6.
- **Secrets:** Never inline in any doc. Only reference where they live (password manager /
  vault name).
- **Server-side apps** run via Docker Compose under `/opt/<project>/` on the server (e.g.
  `/opt/kconnect`).
- **CRLF gotcha:** Windows-cloned repos can show ~200 files as "changed" from line-ending
  noise. Never `git add .` blindly — stage only what you actually changed.

## What lives in this folder

Currently: only this README + `KairosWeb` branch note below. Add a file here when a convention
comes up often enough that Claude keeps re-deriving it.

## Special cases worth remembering

**`KairosWeb`** is a shared backend consumed by both KFMS and the Time Entry apps, with separate
long-lived branches per consumer (e.g. `FMS`, `TWPC-TC`). Always confirm which branch feeds the
app you're actually working on before pushing — wrong branch affects an unrelated app.
