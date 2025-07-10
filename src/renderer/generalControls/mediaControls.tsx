import { useState } from 'react';
import { Play, Square, Circle, Zap } from "lucide-react";
import { Input } from "../components/ui/input";
import './index.css';
import useProject from '../lib/projectHook';

export default function MediaControls() {
  const { project, updateProject } = useProject();
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
      <Input className="record-length-input" onInput={(e) => {
      }}
        type='number'
        placeholder="Recording Length"
        value={project?.recordingLength || 12}
        onChange={(e) => {
          const num = parseInt(e.currentTarget.value);
          if (!isNaN(num) && num > 0) {
            updateProject({ recordingLength: num });
          }
        }}
      />
    </div>
  );
}

