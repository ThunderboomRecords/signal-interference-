import { createRoot } from "react-dom/client";
import GeneralControls from "../generalControls";
import Songs from "../songs";
import SheetMusic from "../sheetMusic";
import SaveExport from "../saveExport";
import './index.css';

export default function App() {

  return (
    <div id="main">
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

