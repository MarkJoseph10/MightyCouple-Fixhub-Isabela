const runtimeNetworkState = {
  connected: true,
  connectionType: "unknown",
  effectiveType: "",
  isWeakConnection: false
};

export function setRuntimeNetworkState(nextState = {}) {
  Object.assign(runtimeNetworkState, nextState);
}

export function getRuntimeNetworkState() {
  return { ...runtimeNetworkState };
}
