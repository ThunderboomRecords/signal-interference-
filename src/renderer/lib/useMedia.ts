import { useEffect, useState } from "react";
import { create } from "zustand";
import useProject from "./projectHook";

export interface MediaState {
  isRecording: boolean;
  isPlaying: boolean;
  setIsRecording: (isRecording: boolean) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  playbackClock: number;
  setPlaybackClock:(clock: number) => void;
}

const useMediaStore = create<MediaState>()((set) => {
  window.electronApi.sequencer.onRecordingStatus((status: boolean) => {
    useMediaStore.getState().setIsRecording(status);
  });
  window.electronApi.sequencer.onPlaybackStatus((status: boolean) => {
    useMediaStore.getState().setIsPlaying(status);
  });
      window.electronApi.sequencer.onClock((clock) => {
      useMediaStore.getState().setPlaybackClock(clock);
    })

  return {
    isRecording: false,
    isPlaying: false,
    setIsPlaying: (isPlaying: boolean) => set((state) => {
      const newState = { ...state };
      newState.isPlaying = isPlaying;
      return newState;
    }),
    setIsRecording: (isRecording: boolean) => set((state) => {
      const newState = { ...state };
      newState.isRecording = isRecording;
      return newState;
    }),
    setPlaybackClock:(clock: number) => set((state) => {
    const newState = { ...state };
      newState.playbackClock = clock;
      return newState;
    }),

  };
});



export default function useMedia() {
  const { project, updateProject } = useProject();
  const { isRecording, isPlaying, playbackClock } = useMediaStore();
  // recording
  // playing
  // generating
  // stop
  // start
  // generation amount
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
    playbackClock,
  }
}
