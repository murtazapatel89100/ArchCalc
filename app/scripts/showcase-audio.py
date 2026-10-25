#!/usr/bin/env python3
"""Synthesize the soundtrack for the LinkedIn showcase cut.

Everything is generated here (no samples or third-party music), so the result is free to publish:
an original chord-pad / arpeggio / soft-beat bed that follows the video's structure, plus click
and whoosh effects placed at the times the recorder logged.

    python3 showcase-audio.py events.json out.wav

events.json: {"duration": seconds, "appStart": s, "appEnd": s,
              "events": [{"type": "click" | "caption", "t": seconds}, ...]}
"""

import json
import sys
import wave

import numpy as np

SR = 48_000
BPM = 96
BEAT = 60 / BPM
rng = np.random.default_rng(7)


def midi(n: float) -> float:
    return 440.0 * 2 ** ((n - 69) / 12)


def env_adsr(n: int, a: float, r: float) -> np.ndarray:
    """Linear attack, flat sustain, linear release (seconds), length n samples."""
    e = np.ones(n)
    ai, ri = min(n, int(a * SR)), min(n, int(r * SR))
    if ai:
        e[:ai] = np.linspace(0, 1, ai)
    if ri:
        e[n - ri :] *= np.linspace(1, 0, ri)
    return e


def add(buf: np.ndarray, start: float, sig: np.ndarray, pan: float = 0.0) -> None:
    """Mix a mono signal into the stereo buffer at `start` seconds with equal-power pan."""
    i = int(start * SR)
    if i >= buf.shape[0] or i < 0:
        return
    sig = sig[: buf.shape[0] - i]
    left = np.cos((pan + 1) * np.pi / 4)
    right = np.sin((pan + 1) * np.pi / 4)
    buf[i : i + len(sig), 0] += sig * left
    buf[i : i + len(sig), 1] += sig * right


def soft_saw(freq: float, n: int, harmonics: int = 7) -> np.ndarray:
    t = np.arange(n) / SR
    out = np.zeros(n)
    for h in range(1, harmonics + 1):
        out += np.sin(2 * np.pi * freq * h * t + h * 0.3) / (h**1.35)
    return out


def pad_chord(notes: list[int], dur: float) -> np.ndarray:
    n = int(dur * SR)
    out = np.zeros(n)
    for note in notes:
        for detune in (-0.08, 0.0, 0.08):
            out += soft_saw(midi(note + detune), n)
    return out * env_adsr(n, 0.9, 1.2) / (len(notes) * 9)


def pluck(note: int, dur: float = 0.55) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(note)
    tone = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return tone * np.exp(-t * 7) * env_adsr(n, 0.004, 0.05)


def bass(note: int, dur: float) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(note)
    return (np.sin(2 * np.pi * f * t) + 0.2 * np.sin(4 * np.pi * f * t)) * env_adsr(n, 0.02, 0.15) * np.exp(-t * 1.2)


def kick() -> np.ndarray:
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    freq = 45 + 75 * np.exp(-t * 28)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return np.sin(phase) * np.exp(-t * 9)


def hat() -> np.ndarray:
    n = int(0.06 * SR)
    noise = rng.standard_normal(n)
    noise = noise - np.convolve(noise, np.ones(6) / 6, mode="same")  # crude high-pass
    return noise * np.exp(-np.arange(n) / SR * 70)


def click_sfx() -> np.ndarray:
    n = int(0.045 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 2600 * t) * 0.6 + np.sin(2 * np.pi * 1300 * t) * 0.4
    return tone * np.exp(-t * 120) * env_adsr(n, 0.002, 0.005)


def whoosh() -> np.ndarray:
    n = int(0.5 * SR)
    noise = rng.standard_normal(n)
    smooth = np.convolve(noise, np.ones(40) / 40, mode="same")
    shape = np.sin(np.linspace(0, np.pi, n)) ** 2
    return smooth * shape


def main() -> None:
    events_path, out_path = sys.argv[1], sys.argv[2]
    spec = json.load(open(events_path))
    duration = spec["duration"]
    app_start, app_end = spec["appStart"], spec["appEnd"]

    music = np.zeros((int((duration + 1) * SR), 2))
    drums = np.zeros_like(music)

    # Fmaj7 – Cmaj7/E – Am7 – G6, two bars each.
    progression = [
        (53, [65, 69, 72, 76]),
        (52, [64, 67, 71, 76]),
        (57, [64, 67, 69, 72]),
        (55, [62, 67, 71, 76]),
    ]
    bar = BEAT * 4
    chord_len = bar * 2
    t, idx = 0.0, 0
    while t < duration:
        root, notes = progression[idx % len(progression)]
        add(music, t, pad_chord(notes, chord_len + 1.0) * 0.55)
        in_app = app_start - 0.2 <= t < app_end
        if in_app:
            # Arpeggio on eighth notes, alternating pan.
            arp = notes + [n + 12 for n in notes[:2]]
            for step in range(16):
                add(music, t + step * BEAT / 2, pluck(arp[(step * 3) % len(arp)]) * 0.12, pan=0.35 if step % 2 else -0.35)
            for beat in range(8):
                add(music, t + beat * BEAT, bass(root - 12, BEAT * 0.95) * 0.22)
        t += chord_len
        idx += 1

    # Soft beat while the app is on screen: kick on 1 & 3, hats on the off-beats.
    beat_t = app_start
    n_beat = 0
    while beat_t < app_end - BEAT:
        if n_beat % 2 == 0:
            add(drums, beat_t, kick() * 0.45)
        add(drums, beat_t + BEAT / 2, hat() * 0.05, pan=0.2)
        beat_t += BEAT
        n_beat += 1

    # Gentle sidechain: duck the music a little on every kick.
    duck = np.ones(music.shape[0])
    k = 0
    beat_t = app_start
    while beat_t < app_end - BEAT:
        if k % 2 == 0:
            i = int(beat_t * SR)
            n = min(int(0.3 * SR), len(duck) - i)
            duck[i : i + n] = np.minimum(duck[i : i + n], 1 - 0.35 * np.exp(-np.arange(n) / SR * 10))
        beat_t += BEAT
        k += 1
    music *= duck[:, None]

    sfx = np.zeros_like(music)
    for e in spec["events"]:
        if e["type"] == "click":
            add(sfx, e["t"], click_sfx() * 0.16, pan=0.0)
        elif e["type"] == "caption":
            add(sfx, e["t"] - 0.15, whoosh() * 0.10)

    mix = music + drums + sfx
    # Fade in/out and soft-clip.
    n_total = int(duration * SR)
    mix = mix[:n_total]
    fade_in, fade_out = int(1.5 * SR), int(3.0 * SR)
    mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    mix[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
    mix = np.tanh(mix * 1.4) / np.tanh(1.4)
    mix /= max(1e-9, np.max(np.abs(mix))) / 0.89

    pcm = (mix * 32767).astype(np.int16)
    with wave.open(out_path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main()
