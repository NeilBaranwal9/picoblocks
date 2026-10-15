/** Shared helpers for the generator tests: build a workspace from JSON. */
import * as Blockly from 'blockly';
import { registerBlocks } from '../src/blocks';
import { generateProgram } from '../src/generators/assemble';
import type { GeneratorOptions } from '../src/generators/generator';

registerBlocks();

type BlockState = Record<string, unknown>;

/** Creates a headless workspace containing the given serialized blocks. */
export function workspaceWith(
  blocks: BlockState[],
  variables: { name: string; id: string }[] = [],
): Blockly.Workspace {
  const workspace = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(
    { blocks: { languageVersion: 0, blocks }, variables },
    workspace,
  );
  return workspace;
}

/** Generates a program from serialized blocks in one step. */
export function generate(
  blocks: BlockState[],
  options?: Partial<GeneratorOptions>,
  variables?: { name: string; id: string }[],
): string {
  return generateProgram(workspaceWith(blocks, variables), options).code;
}

/** Wraps statement blocks in a `forever` loop. */
export function forever(...statements: BlockState[]): BlockState {
  return { type: 'forever', inputs: { DO: { block: chain(statements) } } };
}

/** Wraps statement blocks in an `on start` block. */
export function onStart(...statements: BlockState[]): BlockState {
  return { type: 'on_start', inputs: { DO: { block: chain(statements) } } };
}

/** Links statement blocks together through their `next` connections. */
export function chain(statements: BlockState[]): BlockState {
  const [first, ...rest] = statements;
  if (!rest.length) return first;
  return { ...first, next: { block: chain(rest) } };
}

/** A `math_number` shadow, as the toolbox attaches to number inputs. */
export function num(value: number): BlockState {
  return { shadow: { type: 'math_number', fields: { NUM: value } } };
}

/** A `text` shadow block. */
export function str(value: string): BlockState {
  return { shadow: { type: 'text', fields: { TEXT: value } } };
}

/** The `from machine import ...` / `import ...` lines of a program. */
export function importsOf(code: string): string[] {
  return code
    .split('\n')
    .filter((line) => /^(from |import )/.test(line));
}
