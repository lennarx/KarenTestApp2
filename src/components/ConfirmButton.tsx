"use client";

import { useState } from "react";

/** Botón de acción destructiva con confirmación en línea (sin diálogos del navegador). */
export function ConfirmButton({
  label,
  confirmLabel = "¿Confirmar?",
  onConfirm,
  testid,
  className = "btn-danger px-2.5 py-1 text-xs",
}: {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  testid: string;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" className={className} onClick={() => setAsking(true)} data-testid={testid}>
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-slate-600">{confirmLabel}</span>
      <button
        type="button"
        className="btn-danger px-2 py-1 text-xs"
        onClick={async () => {
          setAsking(false);
          await onConfirm();
        }}
        data-testid={`${testid}-si`}
      >
        Sí
      </button>
      <button
        type="button"
        className="btn-secondary px-2 py-1 text-xs"
        onClick={() => setAsking(false)}
        data-testid={`${testid}-no`}
      >
        No
      </button>
    </span>
  );
}
