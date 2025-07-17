import { createRoot } from "react-dom/client";
import GeneralControls from "../generalControls";
import Songs from "../songs";
import './index.css';
/*
 * TODO: 
 *  - Midi IO indicators
 *  - Generate & play, & recording buttons
 */

export default function App() {
  return (
    <div id="app-container">
      <GeneralControls />
      <Songs />
    </div>
  );
}

const root = createRoot(document.body);
root.render(<App />);
