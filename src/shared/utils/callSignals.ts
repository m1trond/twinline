export function isSessionDescriptionPayload(
  payload: unknown,
): payload is RTCSessionDescriptionInit {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const maybePayload = payload as Record<string, unknown>;

  return (
    typeof maybePayload.type === "string" &&
    typeof maybePayload.sdp === "string"
  );
}

export function isIceCandidatePayload(
  payload: unknown,
): payload is RTCIceCandidateInit {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return typeof (payload as Record<string, unknown>).candidate === "string";
}
