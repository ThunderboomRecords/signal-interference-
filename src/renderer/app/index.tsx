import { createRoot } from "react-dom/client";
import GeneralControls from "../generalControls";
import Songs from "../songs";
import SheetMusic from "../sheetMusic";
import './index.css';
import useProject from "../lib/projectHook";
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
  const { getLatestGeneratedNotes } = useProject();
  const notes = getLatestGeneratedNotes();

  return (
    <div id="app-container">
      <GeneralControls />
      <Songs />
      <SheetMusic notes={notes ?? []} />
    </div>
  );
}

const root = createRoot(document.body);
root.render(<App />);

