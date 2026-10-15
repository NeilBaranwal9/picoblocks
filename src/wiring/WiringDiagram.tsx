/**
 * A wiring diagram drawn from the pin the block actually uses.
 *
 * Knowing which block to drag does not tell a beginner which holes the legs go
 * in. Every hardware block therefore gets a picture of a Pico with the exact
 * header pins highlighted and the part drawn beside them.
 */
import { HEADER, nearestGround, PIN_3V3, pinForGpio, type HeaderPin } from './pinout';

export type WiringKind =
  | 'button'
  | 'led'
  | 'buzzer'
  | 'potentiometer'
  | 'sensor-module'
  | 'onboard-led'
  | 'onboard-temperature';

interface Props {
  kind: WiringKind;
  /** GPIO the block is set to, when it has a pin field. */
  gpio?: number;
  className?: string;
}

// Board geometry, in the SVG's own units.
const BOARD = { x: 118, y: 16, w: 104, h: 292, r: 8 };
const FIRST_ROW_Y = 44;
const ROW_GAP = 13;
const PAD_INSET = 8;

const COLOURS = {
  pcb: '#10512f',
  pcbEdge: '#0a3a22',
  pad: '#e6bb62',
  padHole: '#10512f',
  label: '#dff0e4',
  signal: '#2f80ed',
  ground: '#1c1917',
  power: '#d62246',
  highlight: '#ffd166',
  part: '#f7efe1',
  partEdge: '#4a4239',
};

function padPosition(pin: HeaderPin): { x: number; y: number } {
  return {
    x: pin.side === 'left' ? BOARD.x + PAD_INSET : BOARD.x + BOARD.w - PAD_INSET,
    y: FIRST_ROW_Y + pin.row * ROW_GAP,
  };
}

/** Orthogonal wire: out of the board, along a lane, then into the part. */
function wirePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  laneX: number,
): string {
  return `M ${from.x} ${from.y} H ${laneX} V ${to.y} H ${to.x}`;
}

export function WiringDiagram({ kind, gpio, className }: Props) {
  const signalPin =
    gpio !== undefined ? pinForGpio(gpio) : undefined;
  const groundPin = signalPin ? nearestGround(signalPin) : undefined;
  const needsPower = kind === 'potentiometer' || kind === 'sensor-module';
  const highlighted = new Set<number>();
  if (signalPin) highlighted.add(signalPin.number);
  if (groundPin) highlighted.add(groundPin.number);
  if (needsPower) highlighted.add(PIN_3V3.number);

  const side = signalPin?.side ?? 'left';
  const partX = side === 'left' ? 22 : BOARD.x + BOARD.w + 22;
  const centreY = signalPin
    ? Math.min(250, Math.max(70, padPosition(signalPin).y))
    : 160;
  const lanes =
    side === 'left'
      ? { signal: BOARD.x - 6, ground: BOARD.x - 13, power: BOARD.x - 20 }
      : {
          signal: BOARD.x + BOARD.w + 6,
          ground: BOARD.x + BOARD.w + 13,
          power: BOARD.x + BOARD.w + 20,
        };

  // Crop to the half of the canvas actually in use, so the board fills the
  // card instead of floating in empty space.
  const onboardOnly = kind === 'onboard-led' || kind === 'onboard-temperature';
  const viewBox = onboardOnly
    ? '98 0 144 324'
    : side === 'left'
      ? '8 0 228 324'
      : '104 0 228 324';

  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label={describe(kind, gpio)}>
      <Board highlighted={highlighted} kind={kind} />

      {signalPin && groundPin && kind !== 'onboard-led' && kind !== 'onboard-temperature' && (
        <Part
          kind={kind}
          x={partX}
          y={centreY}
          side={side}
          signalFrom={padPosition(signalPin)}
          groundFrom={padPosition(groundPin)}
          powerFrom={needsPower ? padPosition(PIN_3V3) : undefined}
          lanes={lanes}
        />
      )}
    </svg>
  );
}

function describe(kind: WiringKind, gpio?: number): string {
  const pin = gpio !== undefined ? ` on GP${gpio}` : '';
  const names: Record<WiringKind, string> = {
    button: 'push button',
    led: 'LED with resistor',
    buzzer: 'passive buzzer',
    potentiometer: 'potentiometer',
    'sensor-module': 'three-pin sensor module',
    'onboard-led': 'onboard LED',
    'onboard-temperature': 'onboard temperature sensor',
  };
  return `Wiring diagram: ${names[kind]}${pin} on a Raspberry Pi Pico`;
}

function Board({ highlighted, kind }: { highlighted: Set<number>; kind: WiringKind }) {
  return (
    <g>
      {/* USB socket */}
      <rect x={BOARD.x + 28} y={4} width={48} height={16} rx={3} fill="#c9ccd1" />
      <rect x={BOARD.x + 33} y={8} width={38} height={8} rx={2} fill="#8a8f96" />

      <rect
        x={BOARD.x}
        y={BOARD.y}
        width={BOARD.w}
        height={BOARD.h}
        rx={BOARD.r}
        fill={COLOURS.pcb}
        stroke={COLOURS.pcbEdge}
        strokeWidth={1.5}
      />

      {/* onboard LED, highlighted for the onboard LED block */}
      <rect
        x={BOARD.x + 14}
        y={30}
        width={9}
        height={6}
        rx={1.5}
        fill={kind === 'onboard-led' ? COLOURS.highlight : '#5b6b5f'}
        stroke={kind === 'onboard-led' ? '#fff' : 'none'}
        strokeWidth={1}
      />
      {kind === 'onboard-led' && (
        <circle cx={BOARD.x + 18.5} cy={33} r={11} fill={COLOURS.highlight} opacity={0.28} />
      )}

      {/* BOOTSEL button */}
      <rect x={BOARD.x + BOARD.w - 26} y={28} width={16} height={10} rx={2} fill="#e7e2d8" />

      {/* RP2040, highlighted for the temperature sensor block */}
      <rect
        x={BOARD.x + 30}
        y={150}
        width={44}
        height={44}
        rx={4}
        fill="#1b1b1b"
        stroke={kind === 'onboard-temperature' ? COLOURS.highlight : '#000'}
        strokeWidth={kind === 'onboard-temperature' ? 2.5 : 1}
      />
      <text
        x={BOARD.x + 52}
        y={176}
        textAnchor="middle"
        fontSize={7}
        fill="#8e8e8e"
        fontFamily="'JetBrains Mono', monospace"
      >
        RP2040
      </text>
      {kind === 'onboard-temperature' && (
        <text
          x={BOARD.x + 52}
          y={208}
          textAnchor="middle"
          fontSize={8}
          fill={COLOURS.highlight}
          fontFamily="'Fredoka Variable', sans-serif"
        >
          sensor inside
        </text>
      )}

      {HEADER.map((pin) => {
        const { x, y } = padPosition(pin);
        const isHot = highlighted.has(pin.number);
        const labelX = pin.side === 'left' ? x + 10 : x - 10;
        return (
          <g key={pin.number}>
            {isHot && <circle cx={x} cy={y} r={7} fill={COLOURS.highlight} opacity={0.35} />}
            <circle
              cx={x}
              cy={y}
              r={4}
              fill={COLOURS.pad}
              stroke={isHot ? '#fff' : 'none'}
              strokeWidth={1.2}
            />
            <circle cx={x} cy={y} r={1.7} fill={COLOURS.padHole} />
            {isHot && (
              <text
                x={labelX}
                y={y + 3}
                textAnchor={pin.side === 'left' ? 'start' : 'end'}
                fontSize={9.5}
                fontWeight={600}
                fill={COLOURS.label}
                fontFamily="'Fredoka Variable', sans-serif"
              >
                {pin.label} · pin {pin.number}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

interface PartProps {
  kind: WiringKind;
  x: number;
  y: number;
  side: 'left' | 'right';
  signalFrom: { x: number; y: number };
  groundFrom: { x: number; y: number };
  powerFrom?: { x: number; y: number };
  lanes: { signal: number; ground: number; power: number };
}

function Part(props: PartProps) {
  const { kind } = props;
  if (kind === 'button') return <ButtonPart {...props} />;
  if (kind === 'led') return <LedPart {...props} />;
  if (kind === 'buzzer') return <BuzzerPart {...props} />;
  if (kind === 'potentiometer') return <PotPart {...props} />;
  return <SensorModulePart {...props} />;
}

function Wires({
  signalFrom,
  signalTo,
  groundFrom,
  groundTo,
  powerFrom,
  powerTo,
  lanes,
}: {
  signalFrom: { x: number; y: number };
  signalTo: { x: number; y: number };
  groundFrom: { x: number; y: number };
  groundTo: { x: number; y: number };
  powerFrom?: { x: number; y: number };
  powerTo?: { x: number; y: number };
  lanes: { signal: number; ground: number; power: number };
}) {
  return (
    <g fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d={wirePath(signalFrom, signalTo, lanes.signal)} stroke={COLOURS.signal} />
      <path d={wirePath(groundFrom, groundTo, lanes.ground)} stroke={COLOURS.ground} />
      {powerFrom && powerTo && (
        <path d={wirePath(powerFrom, powerTo, lanes.power)} stroke={COLOURS.power} />
      )}
    </g>
  );
}

function Caption({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={10.5}
      fill="#6f665b"
      fontFamily="'Fredoka Variable', sans-serif"
    >
      {children}
    </text>
  );
}

function ButtonPart({ x, y, signalFrom, groundFrom, lanes }: PartProps) {
  const bodyX = x + 14;
  const signalTo = { x: bodyX + 14, y: y - 18 };
  const groundTo = { x: bodyX + 14, y: y + 18 };
  return (
    <g>
      <Wires
        signalFrom={signalFrom}
        signalTo={signalTo}
        groundFrom={groundFrom}
        groundTo={groundTo}
        lanes={lanes}
      />
      <rect
        x={bodyX}
        y={y - 14}
        width={28}
        height={28}
        rx={4}
        fill={COLOURS.part}
        stroke={COLOURS.partEdge}
        strokeWidth={1.6}
      />
      <circle cx={bodyX + 14} cy={y} r={7} fill="#c8c2b6" stroke={COLOURS.partEdge} />
      <path
        d={`M ${bodyX + 14} ${y - 14} V ${y - 18} M ${bodyX + 14} ${y + 14} V ${y + 18}`}
        stroke={COLOURS.partEdge}
        strokeWidth={2}
      />
      <Caption x={bodyX + 14} y={y + 38}>
        push button
      </Caption>
    </g>
  );
}

function LedPart({ x, y, signalFrom, groundFrom, lanes }: PartProps) {
  const startX = x + 6;
  const signalTo = { x: startX, y };
  const groundTo = { x: startX + 64, y };
  return (
    <g>
      <Wires
        signalFrom={signalFrom}
        signalTo={signalTo}
        groundFrom={groundFrom}
        groundTo={groundTo}
        lanes={lanes}
      />
      {/* resistor */}
      <rect
        x={startX}
        y={y - 6}
        width={26}
        height={12}
        rx={2}
        fill="#d8c39a"
        stroke={COLOURS.partEdge}
        strokeWidth={1.4}
      />
      <path
        d={`M ${startX + 6} ${y - 6} v12 M ${startX + 12} ${y - 6} v12 M ${startX + 18} ${y - 6} v12`}
        stroke="#8a5a2b"
        strokeWidth={2}
      />
      <path d={`M ${startX + 26} ${y} H ${startX + 36}`} stroke={COLOURS.partEdge} strokeWidth={2} />
      {/* LED */}
      <path
        d={`M ${startX + 36} ${y - 9} L ${startX + 52} ${y} L ${startX + 36} ${y + 9} Z`}
        fill="#ff6b6b"
        stroke={COLOURS.partEdge}
        strokeWidth={1.4}
      />
      <path
        d={`M ${startX + 52} ${y - 9} V ${y + 9}`}
        stroke={COLOURS.partEdge}
        strokeWidth={2.4}
      />
      <path d={`M ${startX + 52} ${y} H ${startX + 64}`} stroke={COLOURS.partEdge} strokeWidth={2} />
      <Caption x={startX + 32} y={y + 30}>
        LED + 220 Ω resistor
      </Caption>
      <Caption x={startX + 32} y={y + 43}>
        long leg towards the resistor
      </Caption>
    </g>
  );
}

function BuzzerPart({ x, y, signalFrom, groundFrom, lanes }: PartProps) {
  const cx = x + 30;
  const signalTo = { x: cx - 8, y: y + 20 };
  const groundTo = { x: cx + 8, y: y + 20 };
  return (
    <g>
      <Wires
        signalFrom={signalFrom}
        signalTo={signalTo}
        groundFrom={groundFrom}
        groundTo={groundTo}
        lanes={lanes}
      />
      <circle
        cx={cx}
        cy={y}
        r={20}
        fill="#2c2c2c"
        stroke={COLOURS.partEdge}
        strokeWidth={1.6}
      />
      <circle cx={cx} cy={y} r={4} fill="#5a5a5a" />
      <text
        x={cx - 9}
        y={y - 8}
        fontSize={11}
        fill="#f7efe1"
        fontFamily="'Fredoka Variable', sans-serif"
      >
        +
      </text>
      <path
        d={`M ${cx - 8} ${y + 19} v6 M ${cx + 8} ${y + 19} v6`}
        stroke={COLOURS.partEdge}
        strokeWidth={2}
      />
      <Caption x={cx} y={y + 44}>
        passive buzzer
      </Caption>
      <Caption x={cx} y={y + 57}>
        + leg to the signal pin
      </Caption>
    </g>
  );
}

function PotPart({ x, y, signalFrom, groundFrom, powerFrom, lanes }: PartProps) {
  const bodyX = x + 8;
  const bodyW = 56;
  const powerTo = { x: bodyX + 6, y: y + 22 };
  const signalTo = { x: bodyX + bodyW / 2, y: y + 22 };
  const groundTo = { x: bodyX + bodyW - 6, y: y + 22 };
  return (
    <g>
      <Wires
        signalFrom={signalFrom}
        signalTo={signalTo}
        groundFrom={groundFrom}
        groundTo={groundTo}
        powerFrom={powerFrom}
        powerTo={powerTo}
        lanes={lanes}
      />
      <rect
        x={bodyX}
        y={y - 16}
        width={bodyW}
        height={34}
        rx={4}
        fill="#4f6fa8"
        stroke={COLOURS.partEdge}
        strokeWidth={1.6}
      />
      <circle cx={bodyX + bodyW / 2} cy={y} r={11} fill="#e7e2d8" stroke={COLOURS.partEdge} />
      <path
        d={`M ${bodyX + bodyW / 2} ${y} L ${bodyX + bodyW / 2 + 7} ${y - 8}`}
        stroke={COLOURS.partEdge}
        strokeWidth={2}
      />
      <path
        d={`M ${powerTo.x} ${y + 18} v4 M ${signalTo.x} ${y + 18} v4 M ${groundTo.x} ${y + 18} v4`}
        stroke={COLOURS.partEdge}
        strokeWidth={2}
      />
      <Caption x={bodyX + bodyW / 2} y={y + 40}>
        potentiometer
      </Caption>
      <Caption x={bodyX + bodyW / 2} y={y + 53}>
        middle leg is the signal
      </Caption>
    </g>
  );
}

function SensorModulePart({ x, y, signalFrom, groundFrom, powerFrom, lanes }: PartProps) {
  const bodyX = x + 8;
  const bodyW = 58;
  const powerTo = { x: bodyX + 10, y: y + 20 };
  const signalTo = { x: bodyX + bodyW / 2, y: y + 20 };
  const groundTo = { x: bodyX + bodyW - 10, y: y + 20 };
  return (
    <g>
      <Wires
        signalFrom={signalFrom}
        signalTo={signalTo}
        groundFrom={groundFrom}
        groundTo={groundTo}
        powerFrom={powerFrom}
        powerTo={powerTo}
        lanes={lanes}
      />
      <rect
        x={bodyX}
        y={y - 18}
        width={bodyW}
        height={36}
        rx={3}
        fill="#2f6f4f"
        stroke={COLOURS.partEdge}
        strokeWidth={1.6}
      />
      <circle cx={bodyX + bodyW / 2} cy={y - 4} r={8} fill="#1b1b1b" />
      <text
        x={powerTo.x}
        y={y + 15}
        textAnchor="middle"
        fontSize={6.5}
        fill="#dff0e4"
        fontFamily="'JetBrains Mono', monospace"
      >
        VCC
      </text>
      <text
        x={signalTo.x}
        y={y + 15}
        textAnchor="middle"
        fontSize={6.5}
        fill="#dff0e4"
        fontFamily="'JetBrains Mono', monospace"
      >
        OUT
      </text>
      <text
        x={groundTo.x}
        y={y + 15}
        textAnchor="middle"
        fontSize={6.5}
        fill="#dff0e4"
        fontFamily="'JetBrains Mono', monospace"
      >
        GND
      </text>
      <Caption x={bodyX + bodyW / 2} y={y + 40}>
        3-pin sensor module
      </Caption>
    </g>
  );
}
