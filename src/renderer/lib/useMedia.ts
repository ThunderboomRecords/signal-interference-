import { useEffect, useState } from "react";
import useProject from "./projectHook";

export default function useMedia() {
  const { project, updateProject } = useProject();
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  // recording
  // playing
  // generating
  // stop
  // start
  // generation amount
  useEffect(() => {
    window.electronApi.sequencer.onRecordingStatus((status: boolean) => {
      setIsRecording(status);
    });
    window.electronApi.sequencer.onPlaybackStatus((status: boolean) => {
      setIsPlaying(status);
    });
  }, []);
  const stopRecording = () => {
    window.electronApi.sequencer.stopRecording();
  };

  const startPlayback = () => {
    window.electronApi.sequencer.startPlayback();
  };

  const stopPlayback = () => {
    window.electronApi.sequencer.stopPlayback();
  };

  const generate = () => {
    window.electronApi.sequencer.generate();
  };
  const startRecording = () => {
    window.electronApi.sequencer.record();
  };
  const setRecordingLength = (num: number) => {
    updateProject({ recordingLength: num });
  }

  return {
    isRecording,
    stopRecording,
    startRecording,
    recordingLength: project?.recordingLength || 12,
    setRecordingLength,
    generate,
    isPlaying,
    startPlayback,
    stopPlayback,
  }
}
