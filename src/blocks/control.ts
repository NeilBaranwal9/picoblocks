/** Block definitions for the "Control" category. */
import type { BlockDefinition } from './types';

export const controlBlocks: BlockDefinition[] = [
  {
    // Hat block: no previous/next connection, so it can only sit at the top
    // level. `maxInstances` in the injection options keeps it to one.
    type: 'on_start',
    message0: 'on start',
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    style: 'control_blocks',
    tooltip: 'These blocks run once, as soon as the program starts.',
    helpUrl: '',
  },
  {
    type: 'forever',
    message0: 'forever',
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'DO' }],
    style: 'control_blocks',
    tooltip:
      'These blocks run over and over until you press Stop or unplug the Pico.',
    helpUrl: '',
  },
  {
    type: 'wait_seconds',
    message0: 'wait %1 seconds',
    args0: [{ type: 'input_value', name: 'SECONDS', check: 'Number' }],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    style: 'control_blocks',
    tooltip: 'Pauses the program. 0.5 is half a second.',
    helpUrl: '',
  },
  {
    type: 'wait_milliseconds',
    message0: 'wait %1 milliseconds',
    args0: [{ type: 'input_value', name: 'MS', check: 'Number' }],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    style: 'control_blocks',
    tooltip: 'Pauses the program for a number of milliseconds (1000 = 1 second).',
    helpUrl: '',
  },
];
