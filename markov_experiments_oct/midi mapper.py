import mido

# Send C0 (note 12) to Ableton via IAC Bus
out = mido.open_output("IAC Driver Bus 2")  # Adjust if needed
out.send(mido.Message('note_on', note=12, velocity=100))
out.send(mido.Message('note_off', note=12, velocity=0, time=200))
out.close()

print("✅ Sent C0 to Ableton")
