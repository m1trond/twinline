import { useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useApp } from "@/shared/context/AppContext";
import { useChat } from "@/features/messages/contexts/ChatContext";
import { speechAudioConstraints, getVoiceRecorderOptions } from "@/shared/utils/audio";

export function useVoiceRecording() {
  const { user } = useAuth();
  const { setErrorMessage } = useApp();
  const {
    sendVoiceMessage,
    isRecordingVoice,
    setIsRecordingVoice,
    setVoiceRecordingStartedAt,
    setVoiceRecordingDuration,
  } = useChat();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const shouldDiscardRecordingRef = useRef(false);
  const recordingAudioContextRef = useRef<AudioContext | null>(null);
  const recordingAnimationFrameRef = useRef<number | null>(null);

  const stopVoiceInputMeter = useCallback(() => {
    if (recordingAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(recordingAnimationFrameRef.current);
      recordingAnimationFrameRef.current = null;
    }
    if (recordingAudioContextRef.current) {
      if (recordingAudioContextRef.current.state !== "closed") {
        void recordingAudioContextRef.current.close();
      }
      recordingAudioContextRef.current = null;
    }
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--hush-voice-input-level", "0");
    }
  }, []);

  const startVoiceInputMeter = useCallback((stream: MediaStream) => {
    stopVoiceInputMeter();

    try {
      const AudioContextClass = window.AudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      let lastLevel = 0;

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      const dataArray = new Uint8Array(analyser.fftSize);
      source.connect(analyser);
      recordingAudioContextRef.current = audioContext;

      const tick = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (const value of dataArray) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }

        const volume = Math.sqrt(sum / dataArray.length);
        const nextLevel = Math.min(1, Math.max(0, (volume - 0.004) * 22));

        if (Math.abs(nextLevel - lastLevel) > 0.012) {
          lastLevel = nextLevel;
          if (typeof document !== "undefined") {
            document.documentElement.style.setProperty("--hush-voice-input-level", nextLevel.toFixed(4));
          }
        }

        recordingAnimationFrameRef.current = window.requestAnimationFrame(tick);
      };

      tick();
    } catch {
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--hush-voice-input-level", "0");
      }
    }
  }, [stopVoiceInputMeter]);

  const startVoiceRecording = useCallback(async () => {
    if (!user) {
      setErrorMessage("Сначала войди в аккаунт.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Браузер не поддерживает запись голоса.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: speechAudioConstraints,
      });
      const mediaRecorder = new MediaRecorder(stream, getVoiceRecorderOptions());

      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      shouldDiscardRecordingRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopVoiceInputMeter();
        const audioBlob = new Blob(recordingChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        recordingChunksRef.current = [];
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        setVoiceRecordingStartedAt(null);
        setVoiceRecordingDuration(0);

        if (!shouldDiscardRecordingRef.current && audioBlob.size > 0) {
          void sendVoiceMessage(audioBlob);
        }

        shouldDiscardRecordingRef.current = false;
      };

      mediaRecorder.start();
      startVoiceInputMeter(stream);
      setIsRecordingVoice(true);
      setVoiceRecordingStartedAt(Date.now());
      setVoiceRecordingDuration(0);
      setErrorMessage("");
    } catch {
      setErrorMessage("Не получилось получить доступ к микрофону.");
    }
  }, [user, setErrorMessage, sendVoiceMessage, setIsRecordingVoice, setVoiceRecordingStartedAt, setVoiceRecordingDuration, startVoiceInputMeter, stopVoiceInputMeter]);

  const stopVoiceRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;
    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    setIsRecordingVoice(false);
  }, [setIsRecordingVoice]);

  const handleCancelVoiceRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    shouldDiscardRecordingRef.current = true;

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    } else {
      stopVoiceInputMeter();
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      mediaRecorderRef.current = null;
      recordingChunksRef.current = [];
      shouldDiscardRecordingRef.current = false;
    }

    setIsRecordingVoice(false);
    setVoiceRecordingStartedAt(null);
    setVoiceRecordingDuration(0);
    setErrorMessage("");
  }, [setIsRecordingVoice, setVoiceRecordingStartedAt, setVoiceRecordingDuration, setErrorMessage, stopVoiceInputMeter]);

  const handleToggleVoiceRecording = useCallback(() => {
    if (isRecordingVoice) {
      stopVoiceRecording();
    } else {
      void startVoiceRecording();
    }
  }, [isRecordingVoice, stopVoiceRecording, startVoiceRecording]);

  useEffect(() => {
    return () => {
      stopVoiceInputMeter();
      if (recordingAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(recordingAnimationFrameRef.current);
      }
    };
  }, [stopVoiceInputMeter]);

  return {
    handleToggleVoiceRecording,
    handleCancelVoiceRecording,
  };
}
