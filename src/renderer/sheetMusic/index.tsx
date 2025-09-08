import React, { useRef, useEffect, useState, CSSProperties, useCallback } from 'react';
import {
  Renderer,
  Stave,
  Voice,
  Formatter,
  Beam,
} from 'vexflow';
import { NoteEvent } from '../../main/types';
import {
  noteEventsToVexflowNotes,
  getFirstNBars,
} from './renderUtils';
import './index.css';
import useProject from '../hooks/projectHook';
import { ChevronRight } from 'lucide-react';

interface NoteTime {
  note: number;
  start: number;
  end: number;
}

function SheetMusic() {
  const { latestGeneratedNotes, generationOptions } = useProject();
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  const ticksPerQuarter = 96;

  const updateVisual = useCallback(() => {
    if (!visible) return;
    const div = containerRef.current;
    if (!div) return;
    div.innerHTML = '';

    const padding = 100;
    const width = div.clientWidth - padding;
    const barsPerRow = 4;
    const totalBars = generationOptions?.barsToGenerate ?? 4;
    const barWidth = width / barsPerRow;
    const staveHeight = 200;
    const height = staveHeight * Math.ceil(totalBars / barsPerRow);

    const renderer = new Renderer(div, Renderer.Backends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();

    const ticksPerBar = ticksPerQuarter * 4;
    const slicedNotes = getFirstNBars(latestGeneratedNotes, generationOptions, ticksPerQuarter);
    if (slicedNotes.length === 0) return;

    // Build bar array with timing info
    const bars: { event: NoteEvent; time: NoteTime }[][] = Array.from({ length: totalBars }, () => []);
    let currentTicks = 0;
    let currentBarIndex = 0;

    for (const note of slicedNotes) {
      currentTicks += note.deltaTime;
      if (currentTicks > (currentBarIndex + 1) * ticksPerBar && currentBarIndex < totalBars - 1) {
        currentBarIndex++;
      }

      bars[currentBarIndex].push({
        event: note,
        time: {
          note: note.note,
          start: currentTicks,
          end: currentTicks + note.duration,
        },
      });
    }

    bars.forEach((barNotes, barIdx) => {
      const row = Math.floor(barIdx / barsPerRow);
      const col = barIdx % barsPerRow;
      const x = col * barWidth;
      const y = 40 + row * staveHeight;

      const stave = new Stave(x, y, barWidth);
      if (barIdx === 0) {
        stave.addClef('treble').addTimeSignature('4/4');
      }
      stave.setContext(context).draw();

      const vexNotes = noteEventsToVexflowNotes(barNotes.map(e => e.event));

      if (vexNotes.length === 0) return;

      const voice = new Voice({ numBeats: 4, beatValue: 4 });
      voice.setStrict(false).addTickables(vexNotes);

      const beams = Beam.generateBeams(vexNotes);
      const formatter = new Formatter();
      formatter.joinVoices([voice]).format([voice], barWidth - 10);

      voice.draw(context, stave);
      beams.forEach((beam) => beam.setContext(context).draw());
    });
  }, [latestGeneratedNotes, generationOptions, containerRef]);

  useEffect(() => {
    updateVisual();
  }, [latestGeneratedNotes, generationOptions, visible]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      updateVisual();
    });
    if (containerRef) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [containerRef])




  const containerStyle: CSSProperties = visible ? {} : { height: '0px', overflowY: 'hidden' };

  return (
    <>
      <div id="item-header" onClick={() => setVisible((v) => !v)} >
        <div>GENERATED SOLO</div>
        <ChevronRight
          size={11}
          style={{
            transform: visible ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
        />
      </div>
      <div ref={containerRef} className="sheet-music-container" style={containerStyle} />
    </>
  );
}

export default SheetMusic;
