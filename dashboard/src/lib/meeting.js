// Derives the meeting-view row for a project. Prefers explicit `meeting`
// data from portfolio.json; falls back to safe, honest defaults that do
// not invent a milestone, progress %, or owner.

export function meetingRowFor(project) {
  const explicit = project.meeting ?? {};
  return {
    health: explicit.health ?? project.status,
    milestone: explicit.milestone ?? project.lifecycle ?? 'No milestone recorded',
    latestUpdate: explicit.latestUpdate ?? project.summary,
    blocker: explicit.blocker ?? project.risks?.[0] ?? 'No blocker recorded.',
    lastUpdate: explicit.lastUpdate ?? project.lastConfirmed,
    nextDecision: explicit.nextDecision ?? project.nextStep,
    owner: project.owner ?? 'Owner needs verification',
    developer: project.activeDeveloper || 'Developer not assigned',
  };
}
