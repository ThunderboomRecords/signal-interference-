import { useState } from 'react';
import { Play, Square, Circle, Zap } from "lucide-react";
import { Input } from "../components/ui/input";
import './index.css';
import useMedia from '../lib/useMedia';

export default function MediaControls() {
  const { isRecording,
    stopRecording,
    startRecording,
    recordingLength,
    setRecordingLength,
    isPlaying,
    startPlayback,
    stopPlayback,
    generate,
  } = useMedia();

  return (
    <div id="MediaControls">
      <button
        id="playButton"
        className={`${isPlaying && 'active-button'}`}
        onClick={() => {
          if (isPlaying) {
            // stopPlayback();
          } else {
            startPlayback();
          }
        }}
      >
        <Play />Play
      </button>
      <button
        id="stopButton"
        onClick={() => {
          if (isPlaying) {
            stopPlayback();
          }
        }}
      ><Square /> Stop
      </button>
      <button id="recordButton"
        className={`${isRecording && 'active-button'}`}
        onClick={(e) => {
          e.preventDefault();
          console.log({ isRecording })
          if (isRecording) {
            // should stop recording
            stopRecording();
          } else {
            startRecording();
          }
        }}
      ><Circle />Record</button>
      <button
        id="generateButton"

        onClick={(e) => {
          e.preventDefault();
          generate();
        }}
      ><Zap />Generate</button>
      <Input className="record-length-input"
        type='number'
        placeholder="Recording Length"
        value={recordingLength}
        onChange={(e) => {
          const num = parseInt(e.currentTarget.value);
          if (!isNaN(num) && num > 0) {
            setRecordingLength(num);
          }
        }}
      />
    </div>
  );
}

