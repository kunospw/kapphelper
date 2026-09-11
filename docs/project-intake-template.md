# Kairos Project Intake Template

This is the maintainer template used to normalise a project after facts are gathered. Developers
should normally fill only the short project-specific requests in `docs/intake/`, rather than this
full file.

Fill only what is known. Use `needs verification` for anything uncertain; do not infer values
from a similar app. Never put passwords, tokens, private keys, keystores, connection strings, or
client credentials in this file.

## 1. Project Card

| Field | Value | Where to get it |
|---|---|---|
| Project slug | `<e.g. tcs-time-entry>` | `projects.yaml` |
| Display name | | Product/app name used by the team/client |
| Customer/client | | Contract, meeting notes, or Plane project |
| Product owner | | Ken / account owner / meeting notes |
| Active developer(s) | | Team allocation / Plane |
| Backup/support owner | | Team allocation; `needs verification` if none |
| Lifecycle | prototype / active build / internal test / live / paused / retired | Current status confirmed by owner |
| Intended users | | Client workflow and meeting notes |
| Business workflow in one sentence | | Product owner or client requirement |
| Current milestone | | Plane / client plan |
| Next action | | Latest handover or Plane issue |
| Known blocker/risk | | Plane, capture, or test result |
| Last confirmed date | | Date of the source above |

## 2. Source Code and Runtime

| Field | Value | Where to get it |
|---|---|---|
| Primary repository URL | | GitHub `origin` URL |
| Primary working branch | | `git branch --show-current` on the active checkout |
| Shared repository/dependency | | Architecture docs / repository README |
| Shared repository branch | | Git config / confirmed deployment branch |
| Local/server checkout path | | Server `pwd` / `projects.yaml` |
| Stack | | README / project files (`package.json`, `.csproj`, `pubspec.yaml`) |
| Build command | | Verified README or successful prior build; do not guess |
| Test command | | Verified README or CI workflow |
| Deployment method | | `projects.yaml`, runbook, or confirmed server procedure |
| Environments | local / test / pilot / production, with purpose only | Deployment config and owner confirmation |

## 3. Context and Documentation

| Item | Link/path | Owner | Last confirmed | Notes |
|---|---|---|---|---|
| Project overview / scope | | | | |
| Architecture or README | | | | |
| Client requirements / meeting notes | | | | |
| Plane project/filter | | | | |
| Test checklist / evidence | | | | |
| Deployment runbook | | | | |
| Support / troubleshooting notes | | | | |
| Relevant SharePoint folder | | | | Link only; do not copy restricted files |

## 4. Mobile Release Profile

Complete this section only for mobile projects. If Android and iOS differ, keep both records even
when the source code is shared.

### Android

| Field | Value | Where to get it |
|---|---|---|
| Android package ID | | `android/app/build.gradle(.kts)` or AndroidManifest |
| Current app version / build number | | `pubspec.yaml` or Gradle config; verify against console |
| Play Console app name | | Play Console app selector |
| Play Console URL | | Browser URL after selecting the correct app |
| Permitted lane now | blocked / internal testing / closed testing / production | Product owner/client release decision |
| Target client/company | | Confirmed release plan; never infer from branch |
| API URL used by this lane | | App config + test confirmation |
| Required test evidence | | Test checklist / release policy |
| Approver before upload | | Named developer/product owner/client contact |
| Signing material reference | | Secure-store/keychain reference only, never a secret value |

### iOS

| Field | Value | Where to get it |
|---|---|---|
| iOS bundle ID | | Xcode target settings, `project.pbxproj`, or Apple Developer portal |
| Current version / build number | | `pubspec.yaml` or Xcode; verify against App Store Connect |
| App Store Connect app name | | App Store Connect app selector |
| App Store Connect URL | | Browser URL after selecting the correct app |
| Permitted lane now | blocked / TestFlight / App Store production | Product owner/client release decision |
| Target client/company | | Confirmed release plan; never infer from branch |
| API URL used by this lane | | App config + test confirmation |
| Required test evidence | | Test checklist / release policy |
| Approver before upload | | Named developer/product owner/client contact |
| Signing material reference | | Secure-store/keychain reference only, never a secret value |

## 5. Release Safety Gate

Before an AI prepares an upload command, every item below must be confirmed for the selected
platform and lane.

- [ ] Client/company is explicit.
- [ ] Source repo and branch are explicit.
- [ ] API URL/environment is explicit and tested.
- [ ] Package ID or bundle ID matches the selected store app.
- [ ] Distribution lane is explicit (internal testing, TestFlight, or production).
- [ ] Required tests and their evidence are linked.
- [ ] Named developer has reviewed the release plan.
- [ ] Required client/product-owner approval is recorded.

If any box is unchecked, the result is `release blocked - needs verification`. Claude may explain
what is missing, but must not prepare a distribution command as though the target were known.

## 6. Handover Snapshot

Update this after a meaningful work session.

| Field | Value |
|---|---|
| Date and developer | |
| Work completed | |
| Code branch / commit | |
| Tests run and result | |
| Plane issue(s) touched | |
| Deployment/release performed | none / describe verified target |
| Unresolved issue or risk | |
| Next recommended action | |
| Capture/decision to add to KAppHelper | |

## 7. Items Needing Verification

List unresolved fields here, including who can confirm each one.

| Missing/uncertain item | Why it matters | Person/source to confirm | Status |
|---|---|---|---|
| | | | open |
