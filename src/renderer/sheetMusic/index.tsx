import React, { useRef, useEffect } from 'react';
import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter
} from 'vexflow';
import { NoteEvent } from 'src/main/types';
import { noteEventsToVexflowNotes } from './renderUtils';
import './index.css';

interface SheetMusicProps {
  notes: NoteEvent[];
}

const SheetMusic: React.FC<SheetMusicProps> = ({ notes }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const div = containerRef.current;
    if (!div) return;

    div.innerHTML = ''; // Clear previous render

    const renderer = new Renderer(div, Renderer.Backends.SVG);
    renderer.resize(600, 200);
    const context = renderer.getContext();

    const stave = new Stave(10, 40, 580);
    stave.addClef('treble').addTimeSignature('4/4');
    stave.setContext(context).draw();

    const vexNotes = noteEventsToVexflowNotes(notes);
    console.log('Notes received in <SheetMusic />:', notes);
    console.log('Converted VexFlow notes:', vexNotes);
    if (vexNotes.length === 0) return;

    const voice = new Voice({ numBeats: 4, beatValue: 4 });
    voice.setStrict(false); // This prevents IncompleteVoice errors
    voice.addTickables(vexNotes);

    const formatter = new Formatter();
    formatter.joinVoices([voice]).format([voice], 500);    voice.draw(context, stave);

  }, [notes]);

  return <div ref={containerRef} className="sheet-music-container" />;
};

export default SheetMusic;
