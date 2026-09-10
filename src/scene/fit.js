export const CAMERA_FOV = 35;
export const CAMERA_Y = 0.1;

export const visibleWorldHeight = (cameraZ) =>
  2 * cameraZ * Math.tan((CAMERA_FOV * Math.PI) / 360);

const DEG = Math.PI / 180;

// The helmet's cursor rotation, normalised with tanh so it saturates toward
// the edges of the window rather than snapping at a hard clamp.
export function swing(v, ampDeg, curve) {
  const amp = ampDeg * DEG;
  if (curve < 1e-3) return amp * v;
  return (amp * Math.tanh(curve * v)) / Math.tanh(curve);
}

const REFERENCE_ASPECT = 1.778;
const MIN_FIT = 0.9;

// How much the whole subject gives back on a narrow/squarer window, so the
// masthead and copy keep clearing the figure without a layout-owned fit box.
export function narrowFit(aspect) {
  if (aspect >= REFERENCE_ASPECT) return 1;
  return Math.max(MIN_FIT, Math.min(1, aspect / REFERENCE_ASPECT));
}
