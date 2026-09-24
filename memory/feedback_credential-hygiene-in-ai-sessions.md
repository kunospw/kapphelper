---
name: credential-hygiene-in-ai-sessions
description: Don't leave SSH/API credentials pasted in an AI chat session; revoke tokens after use; keep a private, gitignored credentials note separate from any AI-visible file
metadata:
  type: feedback
---

When setting up cross-server access for an AI coding session (SSH keys between servers, GitHub
PATs, API tokens), Praisilia's own stated practice — confirmed by Ken as correct — is:

1. Enter credentials into config (SSH `authorized_keys`, token files) as needed to get the AI
   session working, then **revoke/rotate the token afterward** so it doesn't sit valid indefinitely
   just because it was convenient during setup.
2. Even after revoking, the value may still be visible in the session's chat/log history (or in
   files like a GitHub PAT config) — so don't rely on "I revoked it" alone as the reason it's safe
   to leave visible; still clean up).
3. Keep a **separate, personal, dedicated notes file** for actual credential values (Ken's example:
   OneNote, organized into sections/subsections per customer/topic — "customer details", "business
   details", etc.) rather than a single running notes page. That file is where a person looks up a
   real value; it must never be pushed to GitHub or pasted into an AI chat.

Ken also explained the underlying SSH key model explicitly (private key stays with you and is
never shared; the public key is what you hand to a server, and matching the two is how the server
verifies identity) — worth restating to any new team member setting this up for the first time,
since Ken observed this often isn't well understood.

**Why:** Praisilia/Ken, 9 Sept meeting, while setting up cross-server SSH access for an onboarding
session. Losing a private key or leaving a PAT exposed lets someone impersonate that person's
commits/access; the team is increasingly giving AI sessions real infra access (see
[[use-mac-build-server-for-app-store-uploads]]), which raises the stakes on this.

**How to apply:** Before pasting any credential into a Claude/AI session to unblock a setup step,
plan how it will be revoked or scoped down afterward, and where the durable copy will actually
live (not in the chat, not in a repo file the AI or git can see). Applies to every kapphelper
project — reinforces the existing `known_credential_leaks` list in `projects.yaml` and the
"Secrets never in git" hard rule in the root `CLAUDE.md`.
