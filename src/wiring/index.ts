/** Which blocks have a wiring diagram, and what to say alongside it. */
import type { WiringKind } from './WiringDiagram';

export interface WiringGuide {
  kind: WiringKind;
  title: string;
  steps: string[];
}

export { WiringDiagram } from './WiringDiagram';
export type { WiringKind } from './WiringDiagram';

export function wiringFor(blockType: string): WiringGuide | null {
  switch (blockType) {
    case 'button_pressed':
      return {
        kind: 'button',
        title: 'Wiring a push button',
        steps: [
          'One leg of the button goes to the signal pin, the other to a GND pin.',
          'No resistor needed: this block switches on the Pico’s own pull-up.',
          'Pressed reads as 0, which is why the generated code compares to 0.',
        ],
      };
    case 'buzz':
      return {
        kind: 'buzzer',
        title: 'Wiring a buzzer',
        steps: [
          'The + leg goes to the signal pin, the other leg to GND.',
          'Use a passive buzzer: an active one only ever plays its own note.',
          'No sound? Try swapping the legs, then check the frequency is above 30 Hz.',
        ],
      };
    case 'digital_write':
    case 'pwm_write':
      return {
        kind: 'led',
        title: 'Wiring an LED',
        steps: [
          'Signal pin → 220 Ω resistor → long leg of the LED.',
          'Short leg of the LED → any GND pin.',
          'Without the resistor the LED draws too much current and burns out.',
        ],
      };
    case 'analog_read':
      return {
        kind: 'potentiometer',
        title: 'Wiring an analog sensor',
        steps: [
          'Outer legs go to 3V3 (pin 36) and a GND pin; the middle leg is the signal.',
          'An LDR or any sensor with a voltage output wires the same way.',
          'Readings run from 0 at 0 V to 65535 at 3.3 V.',
        ],
      };
    case 'digital_read':
      return {
        kind: 'sensor-module',
        title: 'Wiring a digital sensor',
        steps: [
          'VCC → 3V3 (pin 36), GND → any GND pin, OUT → the signal pin.',
          'This block adds no pull resistor, so the sensor must drive the pin itself.',
          'For a bare push button use the "button pressed" block instead.',
        ],
      };
    case 'onboard_led':
      return {
        kind: 'onboard-led',
        title: 'The onboard LED',
        steps: [
          'Nothing to wire: this LED is soldered onto the Pico itself.',
          'On a Pico W it hangs off the wireless chip, on a classic Pico off GP25.',
          'Wrong board? Switch it in Settings if the LED never lights.',
        ],
      };
    case 'read_temperature':
      return {
        kind: 'onboard-temperature',
        title: 'The onboard temperature sensor',
        steps: [
          'Nothing to wire: the sensor is inside the RP2040 chip.',
          'It measures the chip, so it reads a few degrees above room temperature.',
          'Pinch the chip between your fingers and watch the number climb.',
        ],
      };
    default:
      return null;
  }
}
