/**
 * Registers every PicoBlocks block with Blockly and builds the toolbox.
 *
 * Import this module once, before injecting a workspace. It is idempotent so
 * React's StrictMode double-mount does not register blocks twice.
 */
import * as Blockly from 'blockly';
import { controlBlocks } from './control';
import { pinBlocks } from './pins';
import { sensorBlocks } from './sensors';
import { soundBlocks } from './sound';
import { textBlocks } from './text';

export { HEADER_GPIOS, GPIO_TO_HEADER_PIN, PIN_OPTIONS, ADC_OPTIONS } from './pins';

/** Blocks that only make sense at the top level of a program. */
export const TOP_LEVEL_BLOCKS = ['on_start', 'forever'] as const;

let registered = false;

export function registerBlocks(): void {
  if (registered) return;
  registered = true;

  Blockly.common.defineBlocksWithJsonArray([
    ...controlBlocks,
    ...pinBlocks,
    ...sensorBlocks,
    ...soundBlocks,
    ...textBlocks,
  ]);

  // `if` and `repeat` live in the Control category here, so they should wear
  // the Control colour rather than Blockly's stock logic/loop colours.
  restyle('controls_if', 'control_blocks');
  restyle('controls_repeat_ext', 'control_blocks');
}

function restyle(blockType: string, style: string): void {
  const definition = Blockly.Blocks[blockType] as
    | { init: (this: Blockly.Block) => void }
    | undefined;
  if (!definition) return;
  const originalInit = definition.init;
  definition.init = function (this: Blockly.Block) {
    originalInit.call(this);
    this.setStyle(style);
  };
}

/** A number input pre-filled with a shadow block, the way MakeCode does it. */
function num(value: number) {
  return { shadow: { type: 'math_number', fields: { NUM: value } } };
}

function text(value: string) {
  return { shadow: { type: 'text', fields: { TEXT: value } } };
}

export const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Control',
      categorystyle: 'control_category',
      contents: [
        { kind: 'block', type: 'on_start' },
        { kind: 'block', type: 'forever' },
        {
          kind: 'block',
          type: 'wait_seconds',
          inputs: { SECONDS: num(1) },
        },
        {
          kind: 'block',
          type: 'wait_milliseconds',
          inputs: { MS: num(500) },
        },
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'controls_if', extraState: { hasElse: true } },
        {
          kind: 'block',
          type: 'controls_repeat_ext',
          inputs: { TIMES: num(10) },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Pins & LEDs',
      categorystyle: 'pin_category',
      contents: [
        { kind: 'block', type: 'onboard_led' },
        { kind: 'block', type: 'digital_write' },
        { kind: 'block', type: 'digital_read' },
        { kind: 'block', type: 'pwm_write', inputs: { DUTY: num(32768) } },
      ],
    },
    {
      kind: 'category',
      name: 'Sensors',
      categorystyle: 'sensor_category',
      contents: [
        { kind: 'block', type: 'button_pressed' },
        { kind: 'block', type: 'analog_read' },
        { kind: 'block', type: 'read_temperature' },
      ],
    },
    {
      kind: 'category',
      name: 'Sound',
      categorystyle: 'sound_category',
      contents: [
        {
          kind: 'block',
          type: 'buzz',
          inputs: { FREQ: num(440), MS: num(200) },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Text',
      categorystyle: 'text_category',
      contents: [
        {
          kind: 'block',
          type: 'debug_print',
          inputs: { TEXT: text('Hello Pico!') },
        },
        { kind: 'block', type: 'text' },
        {
          kind: 'block',
          type: 'text_join',
          extraState: { itemCount: 2 },
          inputs: { ADD0: text('temperature: ') },
        },
      ],
    },
    { kind: 'sep' },
    {
      kind: 'category',
      name: 'Math & Logic',
      categorystyle: 'math_category',
      contents: [
        { kind: 'block', type: 'math_number', fields: { NUM: 0 } },
        {
          kind: 'block',
          type: 'math_arithmetic',
          fields: { OP: 'ADD' },
          inputs: { A: num(1), B: num(1) },
        },
        {
          kind: 'block',
          type: 'math_random_int',
          inputs: { FROM: num(1), TO: num(100) },
        },
        {
          kind: 'block',
          type: 'logic_compare',
          fields: { OP: 'GT' },
          inputs: { B: num(0) },
        },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_negate' },
        { kind: 'block', type: 'logic_boolean' },
      ],
    },
    {
      kind: 'category',
      name: 'Variables',
      categorystyle: 'variable_category',
      custom: 'VARIABLE',
    },
  ],
};
