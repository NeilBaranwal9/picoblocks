/** MicroPython for the "Pins & LEDs" category. */
import { Order } from 'blockly/python';
import { define } from './define';
import { asInt } from './generator';

define('onboard_led', (block, generator) => {
  generator.requireMachine('Pin');
  const led = generator.options.onboardLed === '25' ? '25' : '"LED"';
  const state = block.getFieldValue('STATE');
  return `Pin(${led}, Pin.OUT).value(${state})\n`;
});

define('digital_write', (block, generator) => {
  generator.requireMachine('Pin');
  const pin = block.getFieldValue('PIN');
  const state = block.getFieldValue('STATE');
  return `Pin(${pin}, Pin.OUT).value(${state})\n`;
});

define('digital_read', (block, generator) => {
  generator.requireMachine('Pin');
  const pin = block.getFieldValue('PIN');
  return [`Pin(${pin}, Pin.IN).value()`, Order.FUNCTION_CALL];
});

define('pwm_write', (block, generator) => {
  const pin = block.getFieldValue('PIN');
  const pwm = generator.pwmObject(pin);
  // A fixed 1 kHz carrier: fast enough that an LED looks steady, slow enough
  // for a motor driver. `buzz` overrides it per tone when it shares a pin.
  generator.addSetup(`${pwm}_freq`, `${pwm}.freq(1000)`);
  const duty = generator.valueToCode(block, 'DUTY', Order.NONE) || '0';
  return `${pwm}.duty_u16(${asInt(duty)})\n`;
});
