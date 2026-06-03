let ready = false;

export function isRuntimeReady() {
  return ready;
}

export function markRuntimeReady() {
  ready = true;
}
