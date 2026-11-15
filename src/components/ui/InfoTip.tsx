import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface InfoTipProps {
  /** Explicación de 1 o 2 frases. */
  text: string;
  /** Nombre del concepto (para lectores de pantalla). */
  term?: string;
}

/**
 * Ícono (?) con una explicación corta. Se abre al pasar el cursor, al enfocar con
 * teclado o al tocar. El globo se dibuja en un portal con posición fija para que
 * no lo recorten los paneles con scroll.
 */
export default function InfoTip({ text, term }: InfoTipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);

  const open = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 240;
    const x = Math.max(8, Math.min(window.innerWidth - width - 8, r.left + r.width / 2 - width / 2));
    const below = r.bottom + 6;
    const y = below + 90 > window.innerHeight ? Math.max(8, r.top - 96) : below;
    setPos({ x, y });
  }, []);
  const close = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
    };
  }, [pos, close]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={term ? `¿Qué es ${term}?` : 'Explicación'}
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        onClick={(e) => {
          e.stopPropagation();
          if (pos) close();
          else open();
        }}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-cyan-600/70 text-cyan-300 text-[9px] font-bold leading-none cursor-help hover:bg-cyan-900/60 focus:outline-none focus:ring-1 focus:ring-cyan-400 shrink-0 align-middle"
      >
        ?
      </button>
      {pos &&
        createPortal(
          <div
            role="tooltip"
            style={{ left: pos.x, top: pos.y, width: 240 }}
            className="fixed z-[100] bg-[#0b1626] border border-cyan-700/70 rounded-lg px-2.5 py-2 text-[11px] leading-snug text-slate-100 shadow-2xl font-sans normal-case tracking-normal font-normal pointer-events-none"
          >
            {term && <div className="font-bold text-cyan-300 mb-0.5">{term}</div>}
            {text}
          </div>,
          document.body
        )}
    </>
  );
}
