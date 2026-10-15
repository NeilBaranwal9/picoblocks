/**
 * Minimal structural type for the JSON block definitions we hand to
 * `Blockly.common.defineBlocksWithJsonArray`. Blockly types this argument as
 * `any[]`; spelling it out here keeps the definitions honest.
 */
export interface BlockDefinition {
  type: string;
  message0: string;
  args0?: unknown[];
  message1?: string;
  args1?: unknown[];
  inputsInline?: boolean;
  previousStatement?: null | string | string[];
  nextStatement?: null | string | string[];
  output?: null | string | string[];
  style?: string;
  colour?: string | number;
  tooltip?: string;
  helpUrl?: string;
  extensions?: string[];
}
