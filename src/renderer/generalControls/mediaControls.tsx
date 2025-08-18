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
        <Play />PLAY
      </button>
      <button
        id="stopButton"
        onClick={() => {
          if (isPlaying) {
            stopPlayback();
          }
        }}
      ><Square /> STOP
      </button>
      <button id="recordButton"
        className={`${isRecording && 'active-button'}`}
        onClick={(e) => {
          e.preventDefault();
          if (isRecording) {
            // should stop recording
            stopRecording();
          } else {
            startRecording();
          }
        }}
      ><Circle />RECORD</button>
      <button
        id="generateButton"

        onClick={(e) => {
          e.preventDefault();
          generate();
        }}
      ><Zap />GENERATE</button>
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

