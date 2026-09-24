---
name: use-mac-build-server-for-app-store-uploads
description: Prefer a dedicated Mac build server driven by an AI coding session over manual SCP or waiting on GitHub Actions for App Store / Play Store releases
metadata:
  type: feedback
---

Ken's standard for shipping mobile app updates: run a persistent Claude Code session in a tmux
pane on a Mac build server (Mac mini/MacBook Air kept for this purpose), and drive the whole
release — bump version, build, sign, upload to both Play Store and App Store, even generate
screenshots via simulator and fill in App Store Connect metadata — by just telling it what's
needed in plain language ("bump up the version, build both, upload, tell me how long it took, put
the changes in git"). Demoed 4 Sept and again 11 Sept: full round trip (both stores) in ~70-90
seconds once set up, versus ~15-30 minutes doing it manually via WinSCP + waiting on a GitHub
Actions build (Jesynta's prior approach) or similar manual steps.

**Why:** Ken explicitly wants the team writing/compiling code less over time and spending more of
their time on business analysis, requirements, and support — automating the mechanical release
process is the concrete instance of that. He was surprised the team hadn't already converged on
this, and pushed multiple times (1 Sept, 4 Sept, 11 Sept) for developers to default to asking AI to
do the whole pipeline rather than doing manual steps they've learned once and keep repeating.
Removing GitHub Actions from the loop specifically avoids the CI queue/build wait — everything
needed (Xcode, signing certs, fastlane-equivalent tooling) lives on the one Mac already.

**How to apply:** When a Kairos mobile app needs a store update, check whether the relevant repo
has (or should have) build-machine access set up this way before defaulting to manual
compile+upload steps. Kairos convention: put shared build scripts/checkouts for a project under
`/opt/kairos/<repo>` on the build Mac (per `projects.yaml` `mobile_deploy_guide` /
`iOS-Deployment-Guide.md`), not a personal home directory, so any team member's Claude session can
see and use them. See also [[model-usage-discipline]] for keeping usage/cost sane while doing this
kind of longer agentic work.
