import { Play, Square, Circle, Zap } from "lucide-react";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import './index.css';
import useMedia from '../hooks/useMedia';
import useProject from "../hooks/projectHook";
import { OffsetMode } from "../../main/types";

export default function MediaControls() {
  const {
    isRecording,
    stopRecording,
    startRecording,
    recordingLength,
    setRecordingLength,
    isPlaying,
    startPlayback,
    stopPlayback,
    generate,
  } = useMedia();

  const {
    offsetMode,
    setOffsetMode,
  } = useProject();

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
      <Input className="record-length-input max-w-[100px]"
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
      <Select value={offsetMode} onValueChange={(val: OffsetMode) => setOffsetMode(val)}>
        <SelectTrigger className="select-offset min-w-[144px]">
          <SelectValue placeholder="Select Offset" />
        </SelectTrigger>
        <SelectContent >
          <SelectItem value="off">off</SelectItem>
          <SelectItem value="mode 1">mode 1</SelectItem>
          <SelectItem value="mode 2">mode 2</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

