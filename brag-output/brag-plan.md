# Brag Plan: PicoBlocks

## What is this app?
PicoBlocks lets you drag blocks, see MicroPython appear live, and run it on a Raspberry Pi Pico straight from your browser tab over Web Serial — with no IDE, no drivers, no extension, and no account.

## The angle
Embedded programming has a reputation for painful friction: compiler toolchains, driver installation, serial port permissions, and heavy IDEs. PicoBlocks obliterates all of it. You open a website in Chrome, plug in a $4 Raspberry Pi Pico, drag a block, and hit Run. The MicroPython wire protocol speaks raw REPL over USB directly from the browser, and you can flash `main.py` so the board runs untethered from a phone charger. It's the joy of physical computing with zero setup anxiety.

## Hook (first 2-3 seconds)
Display text on warm paper background: "Microcontroller programming used to mean..."
Three crossed-out pain points slam in with quick percussive snaps:
- ❌ C++ toolchains
- ❌ USB driver hell
- ❌ Heavy desktop IDEs
Then a bold punch: "Until now." with the Raspberry Pi Pico icon.

## Key moments (the middle)
- **Live Blocks to MicroPython:** Recreating the snappy split editor — colorful Blockly blocks snapping together while clean MicroPython code generates instantly on the right (not a preview, the actual program).
- **One-Click Web Serial Connection & Terminal:** Simulated click on **Connect** → browser Web Serial connects instantly to the Pico board via raw REPL → click **Run** → xterm terminal streams output live over USB.
- **Dynamic Wiring Helper:** The diagram automatically highlights the exact GPIO pins you selected in your blocks so you never miswire a button or buzzer.

## Outro / punchline
"Save to Pico."
The code writes directly to flash as `main.py`. Unplug the board from your laptop, plug it into a 5V phone charger, and it keeps running on its own — no computer attached.
Final hero card: PicoBlocks logo, "Open. Connect. Run.", and zero-install claim.

## User flow worth showing
1. **Connect:** Web Serial prompt connects straight to the Pico board via USB without any drivers or software.
2. **Build:** Drag blocks (LED blink loop) and watch the Python code generate character-by-character live.
3. **Run & Flash:** Hit Run to stream REPL output, then click "Save to Pico" as `main.py` for standalone execution.

## Tone
- Preset: `default`
- Creative direction: "tactile hardware in a browser tab"
- Interpretation: Playful, clean, postable maker energy. Generous breathing room, warm paper textures, tactile button clicks, and punchy, readable claims.

## Format: landscape — 1920x1080
## Duration: 18.0 seconds

## Visual identity (from the project)
- Background: `#fdf7ec` (warm paper)
- Paper Deep / Borders: `#f3e9d6` / `#e5d8bf`
- Surface: `#ffffff`
- Text / Ink: `#22201d`
- Accent / Brand: `#c51a4a` (Raspberry Pi signature red)
- Status Colors: `#15803d` (Run Green), `#2563eb` (Pin Blue), `#c2410c` (Buzzer Orange)
- Terminal Dark: `#221f1c`
- Display font: `Fredoka`, ui-rounded, sans-serif
- Body font: `Atkinson Hyperlegible Next`, ui-sans-serif, sans-serif
- Code font: `JetBrains Mono`, monospace
- Strongest visual elements: Warm cards with 1.5px borders, tactile pill buttons, dynamic wiring pin diagram, real live MicroPython code block.

## Share copy (draft)
Drag blocks, watch the MicroPython appear, and run it on a Raspberry Pi Pico — straight from your browser tab. No IDE, no drivers, no account. 🔌🍓

## Audio direction
- Role: Upbeat, clean maker bed with tactile UI clicks and gentle electronic chimes.
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`
- Music treatment: Starts at 0.0s, steady volume at 0.32, subtle swell into the middle reveal, smooth fade out at 17.5s - 18.0s.
- Music cue guidance: Tempo ~120.19 BPM (~0.50s per beat).
  - Strong cues in window: 16.02s, 17.02s, 17.52s.
  - Beat-grid windows:
    - Hook pain points: 0.8s, 1.3s, 1.8s (beat-grid aligned)
    - Slam reveal at 2.4s
    - Editor reveal at 3.5s
    - Terminal streaming at 9.0s
    - Save to Pico flash payoff at 13.0s
    - Final logo lock at 16.0s
- Audio-reactive treatment: Subtle breathing on the Raspberry Pi brand badge and card shadows matched to the music pulse.
- SFX posture: Moderate, crisp UI clicks and gentle pop/drop accents matched to visual events.
- Audio-coupled moments:
  - Pain point crosses: quick soft thuds (`impactSoft_medium_001.ogg`)
  - "Connect" and "Run" button presses: tactile mouse click (`ui/mouseclick1.ogg`)
  - Terminal stream / flash completion: soft chime (`interface/drop_001.ogg` / `impactBell_heavy_000.ogg`)
- Restraint rule: No harsh buzzes, no frantic cartoon noise. Sounds must feel tactile, physical, and premium.

## Storyboard

### Scene 1 — The Hook — 3.5s (0.0s – 3.5s)
- **Visuals:** Warm paper canvas (`#fdf7ec`). Center headline: "Microcontroller programming used to mean..."
  Three problem cards pop in sequentially:
  1. "❌ C++ toolchains" (enters 0.8s)
  2. "❌ USB driver hell" (enters 1.3s)
  3. "❌ Desktop IDE bloat" (enters 1.8s)
  At 2.4s, they sweep aside as a bold badge slams in: "Not anymore." with the PicoBlocks raspberry icon.
- **Sequential/interaction:** Yes — 3 pain points appear sequentially on the beat grid.
- **Audio intent:** Playful setup with percussive sync.
- **Audio-coupled idea:** Subtle pops on each crossed-out item; cheerful accent on "Not anymore."
- **Music:** Upbeat bed building.
- **Transition mood:** Clean wipe / slide into Scene 2.

### Scene 2 — The Core Revelation: Live Blocks & Code — 4.5s (3.5s – 8.0s)
- **Visuals:** Split-panel editor mockup (white cards, warm shadows).
  Left side: Blockly blocks (`forever`, `turn LED on`, `wait 0.5s`, `turn LED off`).
  Right side: MicroPython generates in real-time in JetBrains Mono syntax highlighting (`from machine import Pin`, `led.value(1)`).
  Top banner callout: "Blocks to MicroPython — live in your browser tab."
  Sub-pill: "Every edit regenerates real code. No preview. The real program."
- **Sequential/interaction:** Blocks slide in and snap together; code typing expands simultaneously.
- **Audio intent:** Product clarity and maker satisfaction.
- **Audio-coupled idea:** Soft snap sound when blocks connect (`interface/switch_001.ogg`).
- **Music:** Rolling groove.
- **Transition mood:** Smooth lateral pan into hardware connection.

### Scene 3 — Direct Hardware Flow & Live Terminal — 4.5s (8.0s – 12.5s)
- **Visuals:** The physical connection flow.
  Cursor clicks the **Connect** button → Web Serial prompt → green badge: `🟢 Connected to Raspberry Pi Pico (RP2040)`.
  Cursor clicks **Run** (`#15803d`).
  xterm.js terminal card animates in with active prompt:
  `>>> Soft reset board`
  `>>> Streaming raw-paste protocol...`
  `>>> [OK] Blinking onboard LED every 0.5s`
  Beside it, the Interactive Wiring diagram pops up with pins GP14 & GP15 highlighted in crisp blue.
- **Sequential/interaction:** Yes — cursor moves, clicks Connect, then Run, then terminal outputs lines sequentially.
- **Audio intent:** High payoff, tangible hardware feedback.
- **Audio-coupled idea:** Click sound on button press (`ui/mouseclick1.ogg`), followed by confirmation tone.
- **Music:** Energetic rhythm.
- **Transition mood:** Quick cut / scale to Scene 4.

### Scene 4 — Standalone Hardware & Outro — 5.5s (12.5s – 18.0s)
- **Visuals:**
  Card 1 (12.5s - 15.0s): "Save to Pico" dialog → "Saved as main.py."
  Callout: "Unplug from your laptop. Plug into a phone charger. It keeps running on its own."
  Card 2 (15.0s - 18.0s): Grand final lockup.
  Center: Large PicoBlocks logo with `#c51a4a` block emblem.
  Tagline: "No IDE. No drivers. No extension. No account."
  Pill CTA: "Open. Connect. Run. 🍓"
- **Sequential/interaction:** Save confirmation leads into final brand lockup with feature pills popping in on strong cues.
- **Audio intent:** Triumphant, resolved, memorable.
- **Audio-coupled idea:** Success bell (`impact/impactBell_heavy_000.ogg`) at 13.0s, strong cue landing at 16.0s.
- **Music:** Hits strong beat at 16.0s and smoothly fades to 18.0s.
- **Transition mood:** Fade out.
