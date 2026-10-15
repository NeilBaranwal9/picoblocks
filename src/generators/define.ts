/** Typed helper for registering a block generator on the PicoBlocks generator. */
import type * as Blockly from 'blockly';
import type { Order } from 'blockly/python';
import { picoGenerator, type PicoGenerator } from './generator';

export type BlockGenerator = (
  block: Blockly.Block,
  generator: PicoGenerator,
) => string | [string, Order] | null;

export function define(blockType: string, fn: BlockGenerator): void {
  picoGenerator.forBlock[blockType] =
    fn as unknown as (typeof picoGenerator.forBlock)[string];
}
