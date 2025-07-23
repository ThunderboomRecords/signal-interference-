import { createRoot } from "react-dom/client";
import GeneralControls from "../generalControls";
import Songs from "../songs";
import SheetMusic from "../sheetMusic";
import SaveExport from "../saveExport";
import './index.css';
/*
 * TODO: 
 *  - Midi IO indicators
 *  - Generate & play, & recording buttons
 */

// Optional test data to pass in
const testNoteEvents = [
  { note: 60, deltaTime: 0, duration: 96 },
  { note: 62, deltaTime: 96, duration: 48 },
  { note: 64, deltaTime: 144, duration: 24 },
];

export default function App() {

  return (
    <div id="general-controls-header">
      <GeneralControls />
      <div id="app-container">
      <SheetMusic />
      <Songs />
      <SaveExport />
      </div>
    </div>
  );
}

const root = createRoot(document.body);
root.render(<App />);

