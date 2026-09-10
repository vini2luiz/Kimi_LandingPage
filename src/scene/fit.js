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

// Below this aspect the window is a portrait phone/tablet: the layout stacks the
// copy above the figure and the panels below it, so the subject has to give back
// far more than the gentle desktop trim and sit lower to leave that band clear.
// The ramp bottoms out at 0.58 because both common phone shapes — 16:9 (0.56)
// and 19.5:9 (0.46) — need the same treatment; only tablets sit between it and
// PORTRAIT_ASPECT.
const PORTRAIT_ASPECT = 0.95;
const NARROWEST_ASPECT = 0.58;
const PORTRAIT_FIT = 0.5;
const PORTRAIT_DROP = 0.44;

const ramp = (aspect) =>
  Math.min(1, Math.max(0, (PORTRAIT_ASPECT - aspect) / (PORTRAIT_ASPECT - NARROWEST_ASPECT)));

// How much the whole subject gives back on a narrow/squarer window, so the
// masthead and copy keep clearing the figure without a layout-owned fit box.
export function narrowFit(aspect) {
  if (aspect >= REFERENCE_ASPECT) return 1;
  if (aspect >= PORTRAIT_ASPECT) {
    return Math.max(MIN_FIT, Math.min(1, aspect / REFERENCE_ASPECT));
  }
  return MIN_FIT - (MIN_FIT - PORTRAIT_FIT) * ramp(aspect);
}

// World units the subject slides down by on a portrait window, so the shrunken
// figure lands in the band between the identity copy and the panels rail.
export function narrowDrop(aspect) {
  if (aspect >= PORTRAIT_ASPECT) return 0;
  return PORTRAIT_DROP * ramp(aspect);
}
