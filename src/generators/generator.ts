/**
 * The PicoBlocks MicroPython generator.
 *
 * It is Blockly's stock `PythonGenerator` (so all the built-in logic, math,
 * text and variable blocks keep working) plus bookkeeping for the three things
 * a MicroPython program needs that a block on its own cannot express:
 *
 *   - which names to import from `machine`, and which modules to import;
 *   - one-time setup lines, such as a `PWM` object per pin, deduplicated;
 *   - helper functions, such as the onboard temperature conversion.
 *
 * `assemble.ts` consumes all three when it stitches the final file together.
 */
import type * as Blockly from 'blockly';
import { PythonGenerator, pythonGenerator } from 'blockly/python';
import { HEADER_GPIOS } from '../blocks/pins';

/** Names importable from the `machine` module, in the order we emit them. */
export const MACHINE_NAMES = ['Pin', 'PWM', 'ADC'] as const;
export type MachineName = (typeof MACHINE_NAMES)[number];

export interface GeneratorOptions {
  /**
   * How the onboard LED is reached. `"LED"` works on the Pico W, Pico 2 W and
   * on a classic Pico running MicroPython 1.20 or newer; `25` is the GPIO the
   * LED hangs off on a classic Pico and works on every firmware version.
   */
  onboardLed: 'LED' | '25';
}

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = { onboardLed: 'LED' };

export class PicoGenerator extends PythonGenerator {
  options: GeneratorOptions = { ...DEFAULT_GENERATOR_OPTIONS };

  /** Names needed from `machine`, e.g. `Pin`. */
  readonly machineNames = new Set<MachineName>();
  /** Plain module imports, e.g. `time`. */
  readonly modules = new Set<string>();
  /** One-time setup statements, keyed so repeated blocks share one line. */
  readonly setup = new Map<string, string>();
  /** Helper function definitions, keyed by function name. */
  readonly helpers = new Map<string, string>();
  /** Pins driven by PWM, so the UI can quieten them when you press Stop. */
  readonly pwmPins = new Set<number>();

  constructor() {
    super('PicoPython');
    this.INDENT = '    ';
    // Inherit every stock block generator (logic, math, text, variables...).
    Object.assign(this.forBlock, pythonGenerator.forBlock);
    this.addReservedWords(
      [
        'machine',
        'time',
        'Pin',
        'PWM',
        'ADC',
        'read_temperature',
        'temp_sensor',
        ...HEADER_GPIOS.map((pin) => `pwm_${pin}`),
      ].join(','),
    );
  }

  override init(workspace: Blockly.Workspace): void {
    super.init(workspace);
    this.machineNames.clear();
    this.modules.clear();
    this.setup.clear();
    this.helpers.clear();
    this.pwmPins.clear();
    // Blockly declares unset variables as `None`. Zero is friendlier for
    // beginners: `count += 1` works before anything has been stored in it.
    const variables = this.definitions_['variables'];
    if (variables) {
      this.definitions_['variables'] = variables.replace(/ = None$/gm, ' = 0');
    }
  }

  /** Records that the program needs `from machine import ...`. */
  requireMachine(...names: MachineName[]): void {
    for (const name of names) this.machineNames.add(name);
  }

  /** Records that the program needs `import <module>`. */
  requireModule(module: string): void {
    this.modules.add(module);
  }

  /** Adds a one-time setup statement. Repeat calls with the same key are free. */
  addSetup(key: string, code: string): void {
    if (!this.setup.has(key)) this.setup.set(key, code);
  }

  /** Adds a helper function definition, deduplicated by name. */
  addHelper(name: string, code: string): void {
    if (!this.helpers.has(name)) this.helpers.set(name, code);
  }

  /**
   * Definitions the stock Blockly generators registered while walking the
   * blocks: imports such as `import random`, and statements such as the
   * `count = 0` defaults for user variables. `definitions_` is protected, so
   * the assembler reaches them through here.
   */
  takeDefinitions(): { imports: string[]; statements: string[] } {
    const imports: string[] = [];
    const statements: string[] = [];
    for (const key of Object.keys(this.definitions_)) {
      const definition = this.definitions_[key];
      if (!definition) continue;
      if (/^(from\s+\S+\s+)?import\s+\S+/.test(definition)) imports.push(definition);
      else statements.push(definition);
    }
    return { imports, statements };
  }

  /** Clears per-run state once the assembler has read everything it needs. */
  finishGeneration(): void {
    this.finish('');
  }

  /**
   * Returns the name of the cached `PWM` object for a pin, creating its setup
   * line if this is the first block to ask for it. Re-creating a `PWM` object
   * inside a loop glitches the output, so the object lives at the top of the
   * file and the blocks only change its frequency and duty cycle.
   */
  pwmObject(pin: string): string {
    this.requireMachine('Pin', 'PWM');
    const name = `pwm_${pin}`;
    this.addSetup(name, `${name} = PWM(Pin(${pin}))`);
    this.pwmPins.add(Number(pin));
    return name;
  }
}

/** The shared generator instance. Blocks register themselves onto it. */
export const picoGenerator = new PicoGenerator();

/**
 * Expressions we know evaluate to a whole number: integer literals, the
 * sensor reads that MicroPython documents as returning an `int`, and anything
 * already wrapped in `int()`.
 */
const INT_EXPRESSION =
  /^(-?\d+|int\(.*\)|random\.randint\(.*\)|.*\.read_u16\(\)|.*\.value\(\))$/;

/**
 * MicroPython's `sleep_ms`, `freq` and `duty_u16` all want an `int` and raise a
 * `TypeError` on a float, so wrap anything that might not be a whole number.
 */
export function asInt(code: string): string {
  const trimmed = code.trim();
  return INT_EXPRESSION.test(trimmed) ? trimmed : `int(${trimmed})`;
}
