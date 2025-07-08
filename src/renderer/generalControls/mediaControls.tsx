import { Play, Square, Circle, Zap } from "lucide-react";
import './index.css';

export default function MediaControls() {
  return (
    <div id="MediaControls">
      <button id="playButton"><Play />Play</button>
      <button id="stopButton"><Square /> Stop</button>
      <button id="recordButton"><Circle />Record</button>
      <button id="rewindButton"><Zap />Generate</button>
    </div>
  );
}

