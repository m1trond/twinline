export const speechAudioConstraints: MediaTrackConstraints = {
  autoGainControl: true,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  sampleRate: 48000,
};

const voiceRecorderMimeTypes = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/webm",
];

export function getVoiceRecorderOptions(): MediaRecorderOptions {
  const mimeType = voiceRecorderMimeTypes.find((type) => {
    return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type);
  });

  return {
    audioBitsPerSecond: 96000,
    ...(mimeType ? { mimeType } : {}),
  };
}

export async function applyCallAudioQuality(sender: RTCRtpSender) {
  if (sender.track?.kind !== "audio") {
    return;
  }

  try {
    const parameters = sender.getParameters();

    if (!parameters.encodings || parameters.encodings.length === 0) {
      parameters.encodings = [{}];
    }

    parameters.encodings[0].maxBitrate = 64000;

    await sender.setParameters(parameters);
  } catch {
    // Some browsers reject sender parameter changes. Calls still work with default Opus settings.
  }
}
