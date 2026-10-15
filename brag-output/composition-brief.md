# Hyperframes Composition Brief: PicoBlocks

## Objective
Create a short launch-style launch/brag video for PicoBlocks.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080 (16:9)
- Duration: 18.0 seconds

## Source Material
- Project root: `c:\Users\Neil baranwal\Downloads\embedded project\picoblocks`
- Primary files read: `README.md`, `src/index.css`, `src/App.tsx`, `package.json`, `docs/images/*`
- Product name: PicoBlocks
- Tagline / strongest claim: "Drag blocks, watch the MicroPython appear, and run it on a Raspberry Pi Pico — from a browser tab. No IDE, no drivers, no extension, no account."
- Key UI or visual moments to recreate:
  - Blockly blocks connected to live MicroPython code generation side-by-side
  - Web Serial Connect & Run buttons with live REPL terminal output
  - Interactive Pico GPIO wiring helper diagram
  - "Saved as main.py — it keeps running on its own"
- Copy that must appear verbatim:
  - "No IDE, no drivers, no extension, no account."
  - "Open the page, click Connect, pick your Pico, press Run."
  - "blocks ──▶ MicroPython ──▶ raw REPL over USB ──▶ your Pico"
  - "Saved as main.py. It now runs whenever the Pico powers up."

## Creative Direction
- Tone preset: `default`
- Creative direction: "tactile hardware in a browser tab"
- Interpretation: Playful, clean, maker-friendly energy. Generous breathing room, warm tactile paper cards, crisp responsive typography, and delightful button feedback.
- Angle: Embedded development without the pain. From zero to blinking a real Raspberry Pi Pico in 60 seconds directly in Chrome over Web Serial.
- Hook: The classic pains of microcontroller programming (toolchains, drivers, huge IDEs) getting swept away.
- Outro / punchline: "Save to Pico" — unplug it, power it from a phone charger, and your code is running standalone.
- Avoid:
  - Generic corporate SaaS clichés ("streamline your workflow")
  - Abstract filler graphics
  - Distorted or unreadable micro-text

## Visual Identity
- Background: `#fdf7ec` (Warm Paper)
- Paper Deep: `#f3e9d6`
- Surface: `#ffffff`
- Text: `#22201d` (Ink), `#6f665b` (Muted Ink)
- Border / Line: `#e5d8bf`
- Accent / Brand: `#c51a4a` (Raspberry Pi Raspberry Red)
- Status Colors: `#15803d` (Run Green), `#2563eb` (Pin Blue), `#c2410c` (Sound Orange)
- Terminal Dark: `#221f1c`
- Display font: `'Fredoka', ui-rounded, system-ui, sans-serif`
- Body font: `'Atkinson Hyperlegible Next', ui-sans-serif, sans-serif`
- Code font: `'JetBrains Mono', ui-monospace, monospace`
- Visual references:
  - Warm cards with rounded corners (`border-radius: 14px`)
  - Real screenshots available in `assets/images/` (`editor.jpg`, `wiring-helper.jpg`, `file-manager.jpg`, `favicon.svg`)

## Storyboard
Detailed storyboard in `brag-output/brag-plan.md`:
1. Scene 1: The Hook (0.0s – 3.5s) — 3 pain point tags pop in on beat, then sweep away for "Until now."
2. Scene 2: The Core Revelation (3.5s – 8.0s) — Live Blockly blocks generate MicroPython in real time.
3. Scene 3: Direct Hardware Flow & Terminal (8.0s – 12.5s) — Web Serial connect, click Run, live terminal stream & wiring pin helper.
4. Scene 4: Standalone Hardware & Outro (12.5s – 18.0s) — "Save to Pico" -> main.py runs untethered, ending with the signature PicoBlocks logo lockup.

## Audio
- Audio role: Upbeat, warm maker bed with tactile UI clicks and clean chime accents.
- Audio arc: Building upbeat rhythm that locks onto the live demo and peaks with a celebratory chime at the standalone run reveal.
- Music: `assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`
- Volume: 0.32 background bed, subtle ducking during terminal stream, fade out at 17.5s - 18.0s.
- Cue source: `assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json` (Tempo: ~120.19 BPM)
  - Strong cues: 16.02s, 17.02s
  - Sequential beats: 0.8s, 1.3s, 1.8s
- SFX files:
  - `assets/sfx/impact/impactSoft_medium_001.ogg`
  - `assets/sfx/ui/mouseclick1.ogg`
  - `assets/sfx/interface/switch_001.ogg`
  - `assets/sfx/interface/drop_001.ogg`
  - `assets/sfx/impact/impactBell_heavy_000.ogg`
