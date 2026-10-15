/** MicroPython for the "Control" category. */
import { Order } from 'blockly/python';
import { define } from './define';
import { asInt } from './generator';

// `on start` and `forever` are containers: `assemble.ts` places their bodies in
// the right part of the file. Generating them here keeps the block-to-code
// mapping in one place and means comments on the hat blocks survive.
define('on_start', (block, generator) => {
  const first = block.getInputTargetBlock('DO');
  return first ? (generator.blockToCode(first) as string) : '';
});

define('forever', (block, generator) => {
  const body = generator.statementToCode(block, 'DO') || generator.PASS;
  return `while True:\n${body}`;
});

define('wait_seconds', (block, generator) => {
  generator.requireModule('time');
  const seconds = generator.valueToCode(block, 'SECONDS', Order.NONE) || '0';
  return `time.sleep(${seconds})\n`;
});

define('wait_milliseconds', (block, generator) => {
  generator.requireModule('time');
  const ms = generator.valueToCode(block, 'MS', Order.NONE) || '0';
  return `time.sleep_ms(${asInt(ms)})\n`;
});

// Blockly's stock version names a loop variable it never uses (`count`, then
// `count2`...), which is noise in a beginner's first Python file.
define('controls_repeat_ext', (block, generator) => {
  const times = generator.valueToCode(block, 'TIMES', Order.NONE) || '0';
  const body = generator.statementToCode(block, 'DO') || generator.PASS;
  return `for _ in range(${asInt(times)}):\n${body}`;
});

// Blockly's stock version emits `from numbers import Number`, a CPython module
// that does not exist in MicroPython, so the program would die on import.
define('math_change', (block, generator) => {
  const delta = generator.valueToCode(block, 'DELTA', Order.ADDITIVE) || '0';
  const variable = generator.getVariableName(block.getFieldValue('VAR'));
  return `${variable} += ${delta}\n`;
});
