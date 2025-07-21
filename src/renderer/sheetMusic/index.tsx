import React, { useRef, useEffect } from 'react';
import {
  Renderer,
  Stave,
  Voice,
  Formatter,
  StaveNote,
  Barline,
  Beam,
} from 'vexflow';
import { GenerationOptions, NoteEvent } from 'src/main/types';
import {
  noteEventsToVexflowNotes,
  getFirstNBars,
} from './renderUtils';
import './index.css';
import useProject from '../lib/projectHook';
import { Underline } from 'lucide-react';

interface SheetMusicProps {
  notes: NoteEvent[];
  generationOptions: GenerationOptions;
}

function SheetMusic(props: {}) {
  const { latestGeneratedNotes, generationOptions } = useProject();
  const notes = latestGeneratedNotes;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const div = containerRef.current;
    if (!div) return;

    div.innerHTML = '';

    const padding = 100;
    const width = div.clientWidth - padding;
    const barsPerRow = 4; // Max bars per horizontal row
    const totalBars = generationOptions?.barsToGenerate ?? 4;
    const barWidth = width / barsPerRow;

    const rows = Math.ceil(totalBars / barsPerRow);
    const staveHeight = 200; // height per stave row
    const height = staveHeight * rows;

    const renderer = new Renderer(div, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();

    const ticksPerQuarter = 96;
    const ticksPerBar = ticksPerQuarter * 4;

    // Get sliced notes based on generation options
    const slicedNotes = getFirstNBars(notes, generationOptions);
    console.log("Current generation options:", generationOptions);
    if (slicedNotes.length === 0) return;

    // Split notes into bars
    const bars: NoteEvent[][] = Array.from({ length: totalBars }, () => []);
    let currentTicks = 0;
    let currentBarIndex = 0;

    for (const note of slicedNotes) {
      currentTicks += note.deltaTime;
      if (currentTicks > (currentBarIndex + 1) * ticksPerBar && currentBarIndex < totalBars - 1) {
        currentBarIndex++;
      }
      bars[currentBarIndex].push(note);
    }

    // Render each bar
    bars.forEach((barNotes, index) => {
      const rowIndex = Math.floor(index / barsPerRow);
      const colIndex = index % barsPerRow;

      const x = colIndex * barWidth;
      const y = 40 + rowIndex * staveHeight;

      const stave = new Stave(x, y, barWidth);

      if (index === 0) {
        stave.addClef('treble').addTimeSignature('4/4');
      }

      stave.setContext(context).draw();

      const vexNotes = noteEventsToVexflowNotes(barNotes);
      if (vexNotes.length === 0) return;

      const voice = new Voice({ numBeats: 4, beatValue: 4 });
      voice.setStrict(false);
      voice.addTickables(vexNotes);

      const beams = Beam.generateBeams(vexNotes);

      const formatter = new Formatter();
      formatter.joinVoices([voice]).format([voice], barWidth - 10);
      voice.draw(context, stave);
      beams.forEach((beam) => beam.setContext(context).draw());

      // Draw final barline only for the last bar
      if (index === totalBars - 1) {
        const barlineX = stave.getX() + stave.getWidth();
        const topY = stave.getYForLine(0);
        const bottomY = stave.getYForLine(4);
        context.beginPath();
        context.moveTo(barlineX, topY);
        context.lineTo(barlineX, bottomY);
        context.stroke();
      }
    });

  }, [notes, generationOptions]);

  return <div ref={containerRef} className="sheet-music-container"/>;
};

export default SheetMusic;
