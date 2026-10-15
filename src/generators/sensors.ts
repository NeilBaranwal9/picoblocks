/** MicroPython for the "Sensors & Input" category. */
import { Order } from 'blockly/python';
import { define } from './define';

define('analog_read', (block, generator) => {
  generator.requireMachine('ADC', 'Pin');
  const pin = block.getFieldValue('PIN');
  return [`ADC(Pin(${pin})).read_u16()`, Order.FUNCTION_CALL];
});

define('button_pressed', (block, generator) => {
  generator.requireMachine('Pin');
  const pin = block.getFieldValue('PIN');
  // Active low: the internal pull-up holds the pin at 3.3 V until the button
  // shorts it to ground, so "pressed" reads as 0.
  return [`Pin(${pin}, Pin.IN, Pin.PULL_UP).value() == 0`, Order.RELATIONAL];
});

define('read_temperature', (_block, generator) => {
  generator.requireMachine('ADC');
  generator.addSetup('temp_sensor', 'temp_sensor = ADC(4)');
  generator.addHelper(
    'read_temperature',
    [
      'def read_temperature():',
      '    # The RP2040 sensor reads 0.706 V at 27 C,',
      '    # and drops by 1.721 mV for every degree above that.',
      '    volts = temp_sensor.read_u16() * 3.3 / 65535',
      '    return round(27 - (volts - 0.706) / 0.001721, 1)',
    ].join('\n'),
  );
  return ['read_temperature()', Order.FUNCTION_CALL];
});
