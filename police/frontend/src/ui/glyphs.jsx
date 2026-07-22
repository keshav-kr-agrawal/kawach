/**
 * Bespoke KAWACH glyph set — geometric line marks drawn on a shared 24×24
 * grid (1.6 stroke, square caps), all derived from the shield/chevron brand
 * motif. No third-party icon pack anywhere in the console.
 */

function G({ children, className = '', box = '0 0 24 24' }) {
  return (
    <svg
      viewBox={box}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const ShieldMark = ({ className }) => (
  <G className={className} box="0 0 24 28">
    <path d="M12 2 L22 6 V14 C22 21 17.5 25 12 27 C6.5 25 2 21 2 14 V6 Z" />
    <path d="M7 12 L12 17 L17 12" />
    <path d="M7 8.5 L12 13.5 L17 8.5" opacity="0.45" />
  </G>
);

export const DeckGlyph = ({ className }) => (
  <G className={className}>
    <path d="M3 3 H21 V21 H3 Z" />
    <path d="M3 9 H21 M9 9 V21" />
    <path d="M12.5 15 H17.5 M12.5 18 H15.5" opacity="0.45" />
  </G>
);

export const MapGlyph = ({ className }) => (
  <G className={className}>
    <path d="M12 21 C12 21 19 14.5 19 9.5 A7 7 0 0 0 5 9.5 C5 14.5 12 21 12 21 Z" />
    <circle cx="12" cy="9.5" r="2.4" />
  </G>
);

export const TraceGlyph = ({ className }) => (
  <G className={className}>
    <circle cx="12" cy="12" r="7.5" />
    <circle cx="12" cy="12" r="1.4" />
    <path d="M12 1.5 V5.5 M12 18.5 V22.5 M1.5 12 H5.5 M18.5 12 H22.5" />
  </G>
);

export const GraphGlyph = ({ className }) => (
  <G className={className}>
    <circle cx="6" cy="6" r="2.4" />
    <circle cx="18" cy="8" r="2.4" />
    <circle cx="12" cy="18" r="2.4" />
    <path d="M8 7 L15.5 7.8 M7 8 L10.8 16 M16.8 10 L13 16" />
  </G>
);

export const SirenGlyph = ({ className }) => (
  <G className={className}>
    <path d="M6 18 V12 A6 6 0 0 1 18 12 V18" />
    <path d="M3 21 H21 M3 18 H21" />
    <path d="M12 2 V4.5 M4.5 5 L6.2 6.7 M19.5 5 L17.8 6.7" opacity="0.45" />
  </G>
);

export const CaseGlyph = ({ className }) => (
  <G className={className}>
    <path d="M5 3 H15 L19 7 V21 H5 Z" />
    <path d="M15 3 V7 H19" />
    <path d="M8.5 12 H15.5 M8.5 15.5 H13.5" opacity="0.45" />
  </G>
);

export const ProfileGlyph = ({ className }) => (
  <G className={className}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 21 C5.5 16.5 8.5 14.5 12 14.5 C15.5 14.5 18.5 16.5 19.5 21" />
  </G>
);

export const RadarGlyph = ({ className }) => (
  <G className={className}>
    <circle cx="12" cy="12" r="9" opacity="0.45" />
    <circle cx="12" cy="12" r="5" />
    <path d="M12 12 L18.5 5.5" />
    <circle cx="15" cy="9" r="0.9" fill="currentColor" stroke="none" />
  </G>
);

export const RupeeGlyph = ({ className }) => (
  <G className={className}>
    <path d="M6 4 H18 M6 8.5 H18 M6 4 C13 4 14.5 6 14.5 8.5 C14.5 11 13 13 9.5 13 H7.5 L14.5 20.5" />
  </G>
);

export const SealGlyph = ({ className }) => (
  <G className={className}>
    <path d="M12 2 L14.4 4.2 L17.5 3.6 L18.4 6.6 L21.4 7.8 L20.4 10.8 L22 13.5 L19.6 15.4 L19.8 18.6 L16.7 19 L15 21.7 L12 20.4 L9 21.7 L7.3 19 L4.2 18.6 L4.4 15.4 L2 13.5 L3.6 10.8 L2.6 7.8 L5.6 6.6 L6.5 3.6 L9.6 4.2 Z" />
    <path d="M8.5 12 L11 14.5 L15.5 9.5" />
  </G>
);

export const TerminalGlyph = ({ className }) => (
  <G className={className}>
    <path d="M3 4 H21 V20 H3 Z" />
    <path d="M6.5 9 L10 12 L6.5 15" />
    <path d="M12.5 15.5 H17.5" opacity="0.45" />
  </G>
);

export const WaveGlyph = ({ className }) => (
  <G className={className}>
    <path d="M3 12 H6 L8.5 6.5 L12 17.5 L15.5 9 L17 12 H21" />
  </G>
);

export const ArrowRight = ({ className }) => (
  <G className={className}>
    <path d="M3 12 H20 M14 6 L20 12 L14 18" />
  </G>
);

export const EscalateGlyph = ({ className }) => (
  <G className={className}>
    <path d="M12 20 V5 M6 11 L12 5 L18 11" />
  </G>
);

export const CheckGlyph = ({ className }) => (
  <G className={className}>
    <path d="M4 12.5 L10 18.5 L20 6" />
  </G>
);

export const LockGlyph = ({ className }) => (
  <G className={className}>
    <path d="M6 11 H18 V21 H6 Z" />
    <path d="M8.5 11 V7.5 A3.5 3.5 0 0 1 15.5 7.5 V11" />
    <path d="M12 15 V17.5" opacity="0.45" />
  </G>
);

export const MenuGlyph = ({ className }) => (
  <G className={className}>
    <path d="M4 7 H20 M4 12 H20 M4 17 H14" />
  </G>
);

export const CloseGlyph = ({ className }) => (
  <G className={className}>
    <path d="M6 6 L18 18 M18 6 L6 18" />
  </G>
);
