import { Button } from '../components/ui/button';
import './index.css';

export default function SaveExport() {
  return (
    <>
      <div id="item-header">
        SAVE & EXPORT
      </div>
      <div id="save-export-container">
        <Button
          id='openProjectButton'
          onClick={async () => {
            window.electronApi.project.loadWithDialog();
          }}
        >Open Project
        </Button>
        <Button
          id='saveProjectButton'
          onClick={async () => {
            window.electronApi.project.saveWithDialog();
          }}
        >Save Project
        </Button>
        <Button
          id='saveCurrentSongHistory'
          onClick={async () => {
            window.electronApi.project.saveHistory();
          }}
        >Save History of Current Song
        </Button>
      </div>
    </>
  )
}
