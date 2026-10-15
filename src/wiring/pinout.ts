/**
 * The Pico's 40-pin header, as it is physically laid out.
 *
 * Pin 1 is top-left with the USB socket at the top; the left column runs 1-20
 * downwards and the right column runs 40-21 downwards. Everything the wiring
 * diagrams draw is derived from this table, so a diagram can never disagree
 * with the board.
 */
export type PinKind = 'gpio' | 'ground' | 'power' | 'system' | 'adc';

export interface HeaderPin {
  /** Physical pin number, 1-40. */
  number: number;
  label: string;
  kind: PinKind;
  /** GPIO number, for pins that have one. */
  gpio?: number;
  /** ADC channel, for the three analog-capable pins. */
  adc?: number;
  side: 'left' | 'right';
  /** Row 0-19, counted from the USB end. */
  row: number;
}

const LEFT: [string, PinKind, number?][] = [
  ['GP0', 'gpio', 0],
  ['GP1', 'gpio', 1],
  ['GND', 'ground'],
  ['GP2', 'gpio', 2],
  ['GP3', 'gpio', 3],
  ['GP4', 'gpio', 4],
  ['GP5', 'gpio', 5],
  ['GND', 'ground'],
  ['GP6', 'gpio', 6],
  ['GP7', 'gpio', 7],
  ['GP8', 'gpio', 8],
  ['GP9', 'gpio', 9],
  ['GND', 'ground'],
  ['GP10', 'gpio', 10],
  ['GP11', 'gpio', 11],
  ['GP12', 'gpio', 12],
  ['GP13', 'gpio', 13],
  ['GND', 'ground'],
  ['GP14', 'gpio', 14],
  ['GP15', 'gpio', 15],
];

/** Right column, top (pin 40) to bottom (pin 21). */
const RIGHT: [string, PinKind, number?][] = [
  ['VBUS', 'power'],
  ['VSYS', 'power'],
  ['GND', 'ground'],
  ['3V3_EN', 'system'],
  ['3V3', 'power'],
  ['ADC_VREF', 'system'],
  ['GP28', 'adc', 28],
  ['AGND', 'ground'],
  ['GP27', 'adc', 27],
  ['GP26', 'adc', 26],
  ['RUN', 'system'],
  ['GP22', 'gpio', 22],
  ['GND', 'ground'],
  ['GP21', 'gpio', 21],
  ['GP20', 'gpio', 20],
  ['GP19', 'gpio', 19],
  ['GP18', 'gpio', 18],
  ['GND', 'ground'],
  ['GP17', 'gpio', 17],
  ['GP16', 'gpio', 16],
];

export const HEADER: HeaderPin[] = [
  ...LEFT.map(([label, kind, gpio], row) => ({
    number: row + 1,
    label,
    kind,
    gpio,
    side: 'left' as const,
    row,
  })),
  ...RIGHT.map(([label, kind, gpio], row) => ({
    number: 40 - row,
    label,
    kind,
    gpio,
    adc: kind === 'adc' && gpio !== undefined ? gpio - 26 : undefined,
    side: 'right' as const,
    row,
  })),
];

export function pinForGpio(gpio: number): HeaderPin | undefined {
  return HEADER.find((pin) => pin.gpio === gpio);
}

/** The ground pin closest to `pin`, preferring one on the same side. */
export function nearestGround(pin: HeaderPin): HeaderPin {
  const grounds = HEADER.filter((candidate) => candidate.kind === 'ground');
  const sameSide = grounds.filter((candidate) => candidate.side === pin.side);
  const pool = sameSide.length ? sameSide : grounds;
  return pool.reduce((best, candidate) =>
    Math.abs(candidate.row - pin.row) < Math.abs(best.row - pin.row) ? candidate : best,
  );
}

export const PIN_3V3 = HEADER.find((pin) => pin.label === '3V3')!;
