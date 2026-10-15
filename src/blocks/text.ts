/** Block definitions for the "Text & Debug" category. */
import type { BlockDefinition } from './types';

export const textBlocks: BlockDefinition[] = [
  {
    type: 'debug_print',
    message0: 'print %1',
    args0: [{ type: 'input_value', name: 'TEXT' }],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    style: 'text_blocks',
    tooltip:
      'Sends a value back to the terminal below, so you can watch what your program is doing.',
    helpUrl: '',
  },
];
