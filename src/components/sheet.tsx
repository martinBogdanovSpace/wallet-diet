"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A bottom drawer built on <dialog>, so focus, Escape and the backdrop come from the browser.
 * Drag the handle down (or tap outside) to close it.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ startY: number } | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Focus the drawer itself rather than ringing its first button.
      dialog.focus();
    }
    if (!open && dialog.open) dialog.close();
    // The page behind must not scroll while the drawer is up.
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { startY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (drag.current) setOffset(Math.max(0, e.clientY - drag.current.startY));
  }
  function onPointerUp() {
    if (!drag.current) return;
    drag.current = null;
    if (offset > 90) onClose();
    setOffset(0);
  }

  return (
    <dialog
      ref={ref}
      aria-label={label}
      tabIndex={-1}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // A click that lands on the dialog itself (not its content) is a click on the backdrop.
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="sheet fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[94dvh] w-full max-w-lg overflow-hidden rounded-t-[30px] bg-cream p-0 text-ink outline-none shadow-[0_-12px_40px_rgba(35,29,23,0.18)] backdrop:bg-ink/40 md:bottom-6 md:rounded-[30px]"
      style={offset ? { transform: `translateY(${offset}px)`, transition: "none" } : undefined}
    >
      <div className="pb-safe flex max-h-[94dvh] flex-col">
        <div
          className="flex shrink-0 cursor-grab touch-none justify-center pb-3 pt-2.5 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="h-[5px] w-10 rounded-full bg-line-strong" />
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </dialog>
  );
}
