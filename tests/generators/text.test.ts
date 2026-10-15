import { describe, expect, it } from 'vitest';
import { forever, generate, importsOf, num, str } from '../helpers';

describe('text and math blocks', () => {
  it('prints a string', () => {
    const code = generate([
      forever({ type: 'debug_print', inputs: { TEXT: str('Hello Pico!') } }),
    ]);
    expect(code).toContain("    print('Hello Pico!')");
  });

  it('prints an empty value when the socket is empty', () => {
    expect(generate([forever({ type: 'debug_print' })])).toContain("    print('')");
  });

  it('joins text and numbers', () => {
    const code = generate([
      forever({
        type: 'debug_print',
        inputs: {
          TEXT: {
            block: {
              type: 'text_join',
              extraState: { itemCount: 2 },
              inputs: {
                ADD0: str('temperature: '),
                ADD1: { block: { type: 'read_temperature' } },
              },
            },
          },
        },
      }),
    ]);
    expect(code).toContain("    print('temperature: ' + str(read_temperature()))");
  });

  it('imports random only when the random block is used', () => {
    const withRandom = generate([
      forever({
        type: 'debug_print',
        inputs: {
          TEXT: {
            block: { type: 'math_random_int', inputs: { FROM: num(1), TO: num(6) } },
          },
        },
      }),
    ]);
    expect(importsOf(withRandom)).toEqual(['import random']);
    expect(withRandom).toContain('    print(random.randint(1, 6))');

    const withoutRandom = generate([
      forever({ type: 'debug_print', inputs: { TEXT: str('hi') } }),
    ]);
    expect(importsOf(withoutRandom)).toEqual([]);
  });

  it('combines conditions with and / or / not', () => {
    const code = generate([
      forever({
        type: 'controls_if',
        inputs: {
          IF0: {
            block: {
              type: 'logic_operation',
              fields: { OP: 'AND' },
              inputs: {
                A: { block: { type: 'button_pressed', fields: { PIN: '14' } } },
                B: {
                  block: {
                    type: 'logic_negate',
                    inputs: {
                      BOOL: { block: { type: 'button_pressed', fields: { PIN: '16' } } },
                    },
                  },
                },
              },
            },
          },
          DO0: { block: { type: 'onboard_led', fields: { STATE: '1' } } },
        },
      }),
    ]);
    expect(code).toContain(
      '    if Pin(14, Pin.IN, Pin.PULL_UP).value() == 0 and not Pin(16, Pin.IN, Pin.PULL_UP).value() == 0:',
    );
  });
});
