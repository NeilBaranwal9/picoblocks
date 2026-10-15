/** MicroPython for the "Sound" category. */
import { Order } from 'blockly/python';
import { define } from './define';
import { asInt } from './generator';

define('buzz', (block, generator) => {
  const pin = block.getFieldValue('PIN');
  const pwm = generator.pwmObject(pin);
  generator.requireModule('time');
  const freq = generator.valueToCode(block, 'FREQ', Order.NONE) || '440';
  const ms = generator.valueToCode(block, 'MS', Order.NONE) || '0';
  // 32768 is a 50% duty cycle: the loudest, cleanest square wave a passive
  // buzzer can make. Dropping to 0 afterwards silences it.
  return (
    `${pwm}.freq(${asInt(freq)})\n` +
    `${pwm}.duty_u16(32768)\n` +
    `time.sleep_ms(${asInt(ms)})\n` +
    `${pwm}.duty_u16(0)\n`
  );
});
