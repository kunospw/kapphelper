// What the user is told before marking a Plane-linked item done, depending on the server's write-back mode.
export function planeCopy(mode) {
  if (mode === 'live') return 'This will also set the item to Done in Plane.';
  if (mode === 'dry-run') return 'Plane write-back is in dry-run: Plane will NOT be changed.';
  return 'Plane write-back is off: this is recorded in the dashboard only and Plane will not change.';
}
