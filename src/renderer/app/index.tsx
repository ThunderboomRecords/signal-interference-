import { createRoot } from "react-dom/client";
import GeneralControls from "../generalControls";
import Songs from "../songs";
import SheetMusic from "../sheetMusic";
import SaveExport from "../saveExport";
import './index.css';
/*
 * TODO: 
 *  - Midi IO indicators
 */

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

