/**
 * The PicoBlocks Blockly theme.
 *
 * Category colours are deliberately darker than Scratch's: white block text on
 * a pastel block fails contrast checks, and this is a tool for classrooms. The
 * one exception is Control, which stays a real yellow and switches to dark
 * text (see `.control_blocks` in index.css).
 */
import * as Blockly from 'blockly';

const COLOURS = {
  control: '#f5b81a',
  pin: '#2563eb',
  sensor: '#15803d',
  sound: '#c2410c',
  text: '#0f766e',
  math: '#6d28d9',
  variable: '#be185d',
} as const;

function blockStyle(colour: string, hat?: 'cap') {
  return {
    colourPrimary: colour,
    colourSecondary: shade(colour, 0.18),
    colourTertiary: shade(colour, -0.22),
    ...(hat ? { hat } : {}),
  };
}

/** Lightens (amount > 0) or darkens (amount < 0) a hex colour. */
function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channels = [value >> 16, (value >> 8) & 0xff, value & 0xff].map((channel) => {
    const target = amount > 0 ? 255 : 0;
    return Math.round(channel + (target - channel) * Math.abs(amount));
  });
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export const picoTheme = Blockly.Theme.defineTheme('picoblocks', {
  name: 'picoblocks',
  base: Blockly.Themes.Zelos,
  blockStyles: {
    control_blocks: blockStyle(COLOURS.control),
    loop_blocks: blockStyle(COLOURS.control),
    logic_blocks: blockStyle(COLOURS.math),
    pin_blocks: blockStyle(COLOURS.pin),
    sensor_blocks: blockStyle(COLOURS.sensor),
    sound_blocks: blockStyle(COLOURS.sound),
    text_blocks: blockStyle(COLOURS.text),
    math_blocks: blockStyle(COLOURS.math),
    variable_blocks: blockStyle(COLOURS.variable),
    variable_dynamic_blocks: blockStyle(COLOURS.variable),
    procedure_blocks: blockStyle(COLOURS.variable),
    list_blocks: blockStyle(COLOURS.sensor),
    colour_blocks: blockStyle(COLOURS.sound),
    hat_blocks: blockStyle(COLOURS.control, 'cap'),
  },
  categoryStyles: {
    control_category: { colour: COLOURS.control },
    pin_category: { colour: COLOURS.pin },
    sensor_category: { colour: COLOURS.sensor },
    sound_category: { colour: COLOURS.sound },
    text_category: { colour: COLOURS.text },
    math_category: { colour: COLOURS.math },
    variable_category: { colour: COLOURS.variable },
  },
  componentStyles: {
    workspaceBackgroundColour: '#fbf3e4',
    toolboxBackgroundColour: '#ffffff',
    toolboxForegroundColour: '#22201d',
    flyoutBackgroundColour: '#f3e9d6',
    flyoutForegroundColour: '#22201d',
    flyoutOpacity: 1,
    scrollbarColour: '#cbbb9c',
    scrollbarOpacity: 0.6,
    insertionMarkerColour: '#22201d',
    insertionMarkerOpacity: 0.3,
    markerColour: '#c51a4a',
    cursorColour: '#c51a4a',
    selectedGlowColour: '#c51a4a',
    selectedGlowOpacity: 0.6,
  },
  fontStyle: {
    family: '"Fredoka Variable", ui-rounded, system-ui, sans-serif',
    weight: '500',
    size: 11,
  },
  startHats: true,
});
