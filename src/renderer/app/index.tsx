import { createRoot } from "react-dom/client";
import GeneralControls from "../generalControls";
import Songs from "../songs";
export default function App() {
  return (
    <>
      <h1>
        Open Culture Tech Hammond AI
      </h1>
      <GeneralControls />
      <Songs />
    </>
  );
}

const root = createRoot(document.body);
root.render(<App />);
