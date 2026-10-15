/**
 * Block definitions for the "Pins & LEDs" category, plus the pin dropdown
 * options shared by every hardware block.
 */
import type { BlockDefinition } from './types';

/**
 * GPIOs that are actually broken out on the Pico / Pico W 40-pin header.
 *
 * GP23, GP24, GP25 and GP29 are deliberately missing: they are not on the
 * header, and on a Pico W they are wired to the CYW43 wireless chip (driving
 * them breaks Wi-Fi and the onboard LED). GP25 is the onboard LED on a
 * classic Pico, which the "onboard LED" block handles for you.
 */
export const HEADER_GPIOS: number[] = [
  ...Array.from({ length: 23 }, (_, i) => i),
  26,
  27,
  28,
];

/** Physical header pin number (1-40) for each broken-out GPIO. */
export const GPIO_TO_HEADER_PIN: Record<number, number> = {
  0: 1,
  1: 2,
  2: 4,
  3: 5,
  4: 6,
  5: 7,
  6: 9,
  7: 10,
  8: 11,
  9: 12,
  10: 14,
  11: 15,
  12: 16,
  13: 17,
  14: 19,
  15: 20,
  16: 21,
  17: 22,
  18: 24,
  19: 25,
  20: 26,
  21: 27,
  22: 29,
  26: 31,
  27: 32,
  28: 34,
};

/** Dropdown options for a general purpose pin: `[label, generator value]`. */
export const PIN_OPTIONS: [string, string][] = HEADER_GPIOS.map((n) => [
  `GP${n}`,
  String(n),
]);

/** The three ADC pins on the header. ADC4 is the internal temperature sensor. */
export const ADC_OPTIONS: [string, string][] = [
  ['ADC0 (GP26)', '26'],
  ['ADC1 (GP27)', '27'],
  ['ADC2 (GP28)', '28'],
];

const ON_OFF: [string, string][] = [
  ['on', '1'],
  ['off', '0'],
];

export const pinBlocks: BlockDefinition[] = [
  {
    type: 'onboard_led',
    message0: 'set onboard LED %1',
    args0: [{ type: 'field_dropdown', name: 'STATE', options: ON_OFF }],
    previousStatement: null,
    nextStatement: null,
    style: 'pin_blocks',
    tooltip:
      'Turns the little green LED on the Pico itself on or off. No wiring needed.',
    helpUrl: '',
  },
  {
    type: 'digital_write',
    message0: 'set pin %1 to %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: PIN_OPTIONS },
      { type: 'field_dropdown', name: 'STATE', options: ON_OFF },
    ],
    previousStatement: null,
    nextStatement: null,
    style: 'pin_blocks',
    tooltip:
      'Drives a pin high (3.3 V) or low (0 V). Use it for an LED, a relay or any on/off output.',
    helpUrl: '',
  },
  {
    type: 'digital_read',
    message0: 'read pin %1',
    args0: [{ type: 'field_dropdown', name: 'PIN', options: PIN_OPTIONS }],
    output: ['Number', 'Boolean'],
    style: 'pin_blocks',
    tooltip:
      'Reads a pin as 1 (high) or 0 (low). The pin has no pull resistor, so wire the sensor so it always drives the pin.',
    helpUrl: '',
  },
  {
    type: 'pwm_write',
    message0: 'set PWM pin %1 duty %2',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: PIN_OPTIONS },
      { type: 'input_value', name: 'DUTY', check: 'Number' },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    style: 'pin_blocks',
    tooltip:
      'Pulses a pin quickly to fade an LED or drive a motor. Duty runs from 0 (off) to 65535 (full on).',
    helpUrl: '',
  },
];
