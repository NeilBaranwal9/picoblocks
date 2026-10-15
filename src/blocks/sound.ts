/** Block definitions for the "Sound" category. */
import { PIN_OPTIONS } from './pins';
import type { BlockDefinition } from './types';

export const soundBlocks: BlockDefinition[] = [
  {
    type: 'buzz',
    message0: 'buzz pin %1 at %2 Hz for %3 ms',
    args0: [
      { type: 'field_dropdown', name: 'PIN', options: PIN_OPTIONS },
      { type: 'input_value', name: 'FREQ', check: 'Number' },
      { type: 'input_value', name: 'MS', check: 'Number' },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    style: 'sound_blocks',
    tooltip:
      'Plays a tone on a passive buzzer, then stops. 440 Hz is the note A; higher numbers sound higher.',
    helpUrl: '',
  },
];
