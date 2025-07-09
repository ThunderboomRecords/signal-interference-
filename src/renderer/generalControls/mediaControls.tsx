import { useState } from 'react';
import { Play, Square, Circle, Zap } from "lucide-react";
import './index.css';

export default function MediaControls() {
  const [isRecording, setIsRecording] = useState(false);
  return (
    <div id="MediaControls">
      <button id="playButton"><Play />Play</button>
      <button id="stopButton"><Square /> Stop</button>
      <button id="recordButton"
        className={`${isRecording && 'active-button'}`}
        onClick={(e) => {
          e.preventDefault();
          if (isRecording) {
            // should stop recording
            // TODO: add a stopRecording hook
            window.electronApi.sequencer.stopRecording();
            setIsRecording(false);
          } else {
            window.electronApi.sequencer.record();
            setIsRecording(true);
          }
        }}
      ><Circle />Record</button>
      <button id="rewindButton"><Zap />Generate</button>
    </div>
  );
}

