/** Block definitions for the "Sensors & Input" category. */
import { ADC_OPTIONS, PIN_OPTIONS } from './pins';
import type { BlockDefinition } from './types';

export const sensorBlocks: BlockDefinition[] = [
  {
    type: 'analog_read',
    message0: 'read analog pin %1',
    args0: [{ type: 'field_dropdown', name: 'PIN', options: ADC_OPTIONS }],
    output: 'Number',
    style: 'sensor_blocks',
    tooltip:
      'Reads a voltage as a number from 0 (0 V) to 65535 (3.3 V). Use it with a potentiometer, an LDR or any analog sensor.',
    helpUrl: '',
  },
  {
    type: 'button_pressed',
    message0: 'button on pin %1 pressed?',
    args0: [{ type: 'field_dropdown', name: 'PIN', options: PIN_OPTIONS }],
    output: 'Boolean',
    style: 'sensor_blocks',
    tooltip:
      'True while a button is held down. Wire the button between this pin and any GND pin — the Pico supplies the pull-up resistor.',
    helpUrl: '',
  },
  {
    type: 'read_temperature',
    message0: 'temperature in °C',
    output: 'Number',
    style: 'sensor_blocks',
    tooltip:
      'Reads the temperature sensor built into the RP2040 chip. No wiring needed, but it reads the chip, so it runs a few degrees warm.',
    helpUrl: '',
  },
];
