/** MicroPython for the "Text & Debug" category. */
import { Order } from 'blockly/python';
import { define } from './define';

define('debug_print', (block, generator) => {
  const value = generator.valueToCode(block, 'TEXT', Order.NONE) || "''";
  return `print(${value})\n`;
});
