# polyphonic_blues_ai.py

import os
import time
import mido
import random
import tempfile
import pretty_midi
import music21
from music21 import scale, pitch

# MIDI configuration
INPUT_PORT = "IAC Driver Bus 1"
OUTPUT_PORT = "IAC Driver Bus 2"
OUTPUT_DIR = tempfile.mkdtemp()

# Music parameters
QPM = 130
BEATS_PER_BAR = 4
BARS = 12
SECONDS_PER_BAR = 60.0 / QPM * BEATS_PER_BAR
GEN_BARS = 12

# Blues chord progression
BLUES_CHORDS = [
    ('Fm', 4), ('Fm', 4), ('Fm', 4), ('Fm', 4),
    ('Bbm', 4), ('Bbm', 4), ('Fm', 4), ('Fm', 4),
    ('Cm', 4), ('Bbm', 4), ('Fm', 4), ('Fm', 4),
]

QUANTIZED_DURATIONS = [1/16, 1/8, 3/16, 1/4, 3/8, 1/2, 3/4, 1.0]

# ---------------- MIDI Recording ---------------- #

def record_midi(filename, trigger_chords=False):
    duration = SECONDS_PER_BAR * BARS
    print(f"🎹 Recording for {duration:.2f} seconds...")

    out_port = mido.open_output(OUTPUT_PORT)

    if trigger_chords:
        # Trigger chord loop in Ableton via MIDI note (C0 = 12)
        out_port.send(mido.Message('note_on', note=12, velocity=100))
        out_port.send(mido.Message('note_off', note=12, velocity=0, time=200))

    mid = mido.MidiFile(ticks_per_beat=480)
    track = mido.MidiTrack()
    mid.tracks.append(track)

    in_port = mido.open_input(INPUT_PORT)
    start_time = time.time()
    last_event_time = start_time

    while time.time() - start_time < duration:
        for msg in in_port.iter_pending():
            now = time.time()
            elapsed = now - last_event_time
            ticks = mido.second2tick(elapsed, 480, 500000)
            msg.time = int(round(ticks))
            track.append(msg)
            last_event_time = now

    in_port.close()
    out_port.close()

    mid.save(filename)
    print(f"✅ Saved MIDI to {filename}")

# ---------------- Helpers ---------------- #

def shift_midi_to_start(pm, start_at=0.1):
    earliest = min(n.start for i in pm.instruments for n in i.notes if i.notes)
    shift_amount = earliest - start_at
    if shift_amount <= 0:
        return
    for instrument in pm.instruments:
        for note in instrument.notes:
            note.start -= shift_amount
            note.end -= shift_amount
    print(f"⏱️ Shifted notes by {round(shift_amount, 3)} seconds earlier.")

def get_scale_for_chord(chord_name):
    root_name = chord_name.replace('m', '')
    root_pitch = pitch.Pitch(root_name)
    return scale.MinorScale(root_pitch)

def filter_pitches_to_scale(pitches, chord_name):
    s = get_scale_for_chord(chord_name)
    return [p for p in pitches if s.getScaleDegreeFromPitch(pitch.Pitch(midi=p)) is not None]

def quantize_duration(d):
    return min(QUANTIZED_DURATIONS, key=lambda q: abs(q - d))

def apply_swing(duration):
    if duration == 0.5:
        return random.choice([0.33, 0.67])
    return duration

# ---------------- Markov Chain ---------------- #

def build_markov_chain(sequence, order=3):
    chain = {}
    for i in range(len(sequence) - order):
        state = tuple(sequence[i:i+order])
        next_item = sequence[i + order]
        chain.setdefault(state, []).append(next_item)
    return chain

def generate_from_chain(chain, length, order=1, start_state=None):
    if start_state and start_state in chain:
        current = list(start_state)
    else:
        current = list(random.choice(list(chain.keys())))
    result = current.copy()

    for _ in range(length - order):
        state = tuple(result[-order:])
        next_item = random.choice(chain.get(state, [random.choice(result)]))
        result.append(next_item)
    return result

# ---------------- Data Processing ---------------- #

def load_polyphonic_training_data(midi_path, slice_window=0.25):
    pm = pretty_midi.PrettyMIDI(midi_path)
    notes = sorted(
        [(n.start, n.end, n.pitch) for inst in pm.instruments for n in inst.notes],
        key=lambda x: x[0]
    )

    slices = []
    if not notes:
        return slices

    current_slice = []
    start_time = notes[0][0]
    window_end = start_time + slice_window

    for s, e, p in notes:
        if s <= window_end:
            current_slice.append((p, s, e))
        else:
            if current_slice:
                pitches = tuple(sorted(set(p for p, _, _ in current_slice)))
                duration = round(max(e for _, _, e in current_slice) - min(s for _, s, _ in current_slice), 3)
                slices.append((pitches, duration))
            current_slice = [(p, s, e)]
            window_end = s + slice_window

    if current_slice:
        pitches = tuple(sorted(set(p for p, _, _ in current_slice)))
        duration = round(max(e for _, _, e in current_slice) - min(s for _, s, _ in current_slice), 3)
        slices.append((pitches, duration))

    return slices

# ---------------- Generation ---------------- #

def generate_full_response(primer_path, output_path):
    print("🎼 Loading training data...")
    training_data = load_polyphonic_training_data("trainings_midi/solo.mid", slice_window=0.25)

    print("🎼 Loading primer...")
    pm = pretty_midi.PrettyMIDI(primer_path)
    input_data = load_polyphonic_training_data(primer_path, slice_window=0.25)

    markov_order = 3
    poly_chain = build_markov_chain(training_data, order=markov_order)

    if len(input_data) >= markov_order:
        seed = tuple(input_data[-markov_order:])
    else:
        seed = None

    print("🎹 Generating polyphonic melody...")
    # Generate more than needed, trim to 12 bars
    max_events = 100  # generate generously
    generated = generate_from_chain(poly_chain, length=max_events, order=markov_order, start_state=seed)


    out_pm = pretty_midi.PrettyMIDI()
    melody_inst = pretty_midi.Instrument(program=0)

    bar_duration = 4 * (60.0 / QPM)
    beat_duration = bar_duration / BEATS_PER_BAR
    
    current_time = 0.0
    bar_limit = 12
    bar_duration = 4 * (60.0 / QPM)
    total_duration = bar_limit * bar_duration

    for (pitches, duration) in generated:
        if current_time >= total_duration:
            break
        if not pitches:
            continue

        bar_index = int(current_time // bar_duration)
        chord_name, _ = BLUES_CHORDS[bar_index % 12]
        filtered = filter_pitches_to_scale(pitches, chord_name)

        if not filtered:
            continue

        # swung = apply_swing(duration)
        # quantized_duration = quantize_duration(swung)
        quantized_duration = quantize_duration(duration)

        num_notes = random.randint(1, min(5, len(filtered)))
        melodic_notes = filtered[:num_notes]

        for pitch in melodic_notes:
            melody_inst.notes.append(pretty_midi.Note(
                velocity=95,
                pitch=pitch,
                start=round(current_time / (1/16 * bar_duration)) * (1/16 * bar_duration),
                end=current_time + quantized_duration
            ))

        current_time += quantized_duration

    out_pm.instruments.append(melody_inst)
    shift_midi_to_start(out_pm, start_at=0.1)
    out_pm.write(output_path)
    print(f"✅ Polyphonic response saved to {output_path}")

# ---------------- Playback ---------------- #

def play_response(midi_file):
    print(f"🎧 Playing back via {OUTPUT_PORT}...")
    port = mido.open_output(OUTPUT_PORT)
    mid = mido.MidiFile(midi_file)

    for msg in mid.play():
        if not msg.is_meta:
            port.send(msg)

    port.close()
    print("✅ Playback complete.")

# ---------------- Main Loop ---------------- #

if __name__ == "__main__":
    trigger_once = True
    while True:
        input_path = os.path.join(OUTPUT_DIR, "input.mid")
        output_path = os.path.join(OUTPUT_DIR, "response.mid")

        record_midi(input_path, trigger_chords=trigger_once)
        trigger_once = False

        generate_full_response(input_path, output_path)
        play_response(output_path)

        print("🔁 Ready for next round (Ctrl+C to exit).")
