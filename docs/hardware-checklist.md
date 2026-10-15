# Hardware checklist

The automated tests cover code generation and the REPL protocol against a
simulated board. Everything below needs a real Pico and a pair of eyes, and
should be worked through before calling the project done.

Bring: a Pico or Pico W with MicroPython installed, a USB data cable (charge-only
cables are the classic wasted afternoon), a push button, a passive buzzer, an
LED, a 220 Ω resistor, and jumper wires.

## Connecting

- [ ] **Connect** opens the browser's port picker and the Pico is in the list.
      (If it is not, turn on *Show every serial device* in Settings — some
      clone boards use another USB vendor id.)
- [ ] After connecting, the status pill turns green and the terminal shows a
      `>>>` prompt. Typing `print(1 + 1)` there answers `2`.
- [ ] **Disconnect** returns the pill to grey, and connecting again works
      without reloading the page.
- [ ] Connecting while Thonny (or another tab) holds the port fails with a
      readable message rather than a stuck spinner.

## Run and Stop

- [ ] Load **Examples → Blink**, press **Run**: the onboard LED starts blinking
      within about a second.
- [ ] On a classic (non-W) Pico whose LED stays dark, switching
      **Settings → Board** to *Classic Pico (LED on GP25)* fixes it, and the
      code panel changes to `Pin(25, ...)`.
- [ ] **Stop** halts the blinking every time — try it ten times in a row,
      including while the program sits in a `wait`.
- [ ] Stop does not leave a scary traceback in the terminal, just `-- stopped --`.
- [ ] Add a `print` block inside `forever` and confirm output appears in the
      terminal *as it runs*, not in a lump at the end.
- [ ] Make a program fail on purpose (for example `buzz` with frequency 0) and
      confirm the traceback appears in red and the app stays usable.

## Wiring demos

- [ ] **Button, LED and buzzer** (button GP14 → GND, passive buzzer GP15 → GND):
      holding the button lights the onboard LED and sounds the buzzer; letting
      go stops both.
- [ ] Pressing **Stop** in the middle of a beep leaves the buzzer *silent*
      (this is what the pin-quietening step after Stop is for).
- [ ] **Temperature alert**: the terminal prints a temperature about once a
      second; pinching the RP2040 chip raises it past the threshold and trips
      the alarm.
- [ ] An LED with a 220 Ω resistor on a `set PWM pin` block fades smoothly when
      the duty cycle is changed, with no flicker or buzz.
- [ ] A potentiometer on GP26 driving a PWM duty cycle changes the LED
      brightness smoothly across the whole travel.
- [ ] For each of the above, the wiring diagram in the app matches what you
      actually plugged in, including the physical pin numbers.

## Save to Pico (the convincing one)

- [ ] **Save to Pico** reports success and the Files tab shows `main.py` with a
      sensible size.
- [ ] Unplug the board from the computer and power it from a phone charger or
      power bank: the program runs on its own, with no browser anywhere.
- [ ] Plug it back into the computer, press **Connect**, then **Ctrl-C** in the
      terminal: the running `main.py` is interrupted and a `>>>` prompt appears.
- [ ] **Reset board** re-runs `main.py` and its output appears in the terminal.
- [ ] Press **Run** while `main.py` is running: the uploaded program takes over
      cleanly.

## Files

- [ ] The file list shows the sizes and free space of a real board.
- [ ] Upload a file from the computer, then download it again and confirm the
      two are byte-for-byte identical (a binary file, not just text).
- [ ] Rename and delete work, and deleting asks first.
- [ ] Walking into a folder such as `lib/` and back out works.
- [ ] Upload something large (50 kB or more) and watch the progress percentage
      move rather than the app freezing.

## Failure modes

- [ ] Pull the USB cable while a program is running: the app reports the lost
      connection and returns to the disconnected state instead of hanging.
- [ ] Pull the cable in the middle of a **Save to Pico**: the app reports the
      failure, and the previous `main.py` on the board is still intact and
      still runs.
- [ ] Reload the page mid-session: the workspace comes back exactly as it was.
- [ ] Press **Connect** and dismiss the picker: nothing happens, no error.
- [ ] Open the page in Firefox or Safari: the unsupported-browser notice
      appears instead of a broken editor.
