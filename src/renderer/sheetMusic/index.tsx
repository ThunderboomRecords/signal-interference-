import React, { useRef, useEffect } from 'react';
import {
  Renderer,
  Stave,
  Voice,
  Formatter,
  StaveNote,
  Barline,
} from 'vexflow';
import { NoteEvent } from 'src/main/types';
import {
  noteEventsToVexflowNotes,
  getFirstFourBars,
} from './renderUtils';
import './index.css';

interface SheetMusicProps {
  notes: NoteEvent[];
}

const SheetMusic: React.FC<SheetMusicProps> = ({ notes }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const div = containerRef.current;
    if (!div) return;

    div.innerHTML = '';

    const padding = 20; // or 30 for extra room
    const width = div.clientWidth - padding;
    console.log("Current width Sheets:", width);
    const height = 200;
    const totalBars = 4;
    const barWidth = width / totalBars;
    
    const renderer = new Renderer(div, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();

    const staveY = 40;
    const startX = 0;

    // Step 1: Get the first four bars as a flat list
    const slicedNotes = getFirstFourBars(notes);
    if (slicedNotes.length === 0) return;

    // Step 2: Split notes into 4 bars based on deltaTime
    const ticksPerQuarter = 96;
    const ticksPerBar = ticksPerQuarter * 4;
    let bars: NoteEvent[][] = [[], [], [], []];
    let currentTicks = 0;
    let currentBarIndex = 0;

    for (const note of slicedNotes) {
      currentTicks += note.deltaTime;

      if (currentTicks > (currentBarIndex + 1) * ticksPerBar && currentBarIndex < 3) {
        currentBarIndex++;
      }

      bars[currentBarIndex].push(note);
    }

    // Step 3: Render each bar
    bars.forEach((barNotes, index) => {
      const x = startX + index * barWidth;
      const stave = new Stave(x, staveY, barWidth);

      if (index === 0) {
        stave.addClef('treble').addTimeSignature('4/4');
      }

      if (index === bars.length - 1) {
        const barlineX = stave.getX() + stave.getWidth();
        const topY = stave.getYForLine(0);
        const bottomY = stave.getYForLine(4);
      
        context.beginPath();
        context.moveTo(barlineX, topY);
        context.lineTo(barlineX, bottomY);
        context.stroke();
      }

      stave.setContext(context).draw();

      const vexNotes = noteEventsToVexflowNotes(barNotes);
      if (vexNotes.length === 0) return;

      const voice = new Voice({ numBeats: 4, beatValue: 4 });
      voice.setStrict(false);
      voice.addTickables(vexNotes);

      const formatter = new Formatter();
      formatter.joinVoices([voice]).format([voice], barWidth - 10);
      voice.draw(context, stave);
    });

  }, [notes]);

  return <div ref={containerRef} className="sheet-music-container"/>;
};

export default SheetMusic;
