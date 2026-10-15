/** The PicoBlocks wordmark: a notched block plugged into a chip. */
export function PicoLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 168 36" className={className} role="img" aria-label="PicoBlocks">
      <g>
        {/* a Blockly-style block with its notch */}
        <path
          d="M2 9a4 4 0 0 1 4-4h5.5a2.6 2.6 0 0 0 5.2 0H22a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4h-5.3a2.6 2.6 0 0 0-5.2 0H6a4 4 0 0 1-4-4z"
          fill="#c51a4a"
        />
        <circle cx="9" cy="16" r="2.1" fill="#fff" opacity="0.9" />
        <circle cx="19" cy="16" r="2.1" fill="#fff" opacity="0.55" />
        {/* chip pins */}
        <g stroke="#22201d" strokeWidth="2" strokeLinecap="round">
          <path d="M30 12h4M30 18h4M30 24h4" />
        </g>
      </g>
      <text
        x="40"
        y="25"
        fontFamily="'Fredoka Variable', ui-rounded, system-ui, sans-serif"
        fontSize="21"
        fontWeight="600"
        fill="#22201d"
      >
        Pico
        <tspan fill="#c51a4a">Blocks</tspan>
      </text>
    </svg>
  );
}
