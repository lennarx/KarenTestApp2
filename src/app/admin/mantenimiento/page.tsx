"use client";

import { useState } from "react";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageTitle } from "@/components/ui";
import { api } from "@/lib/client";

export default function AdminMantenimientoPage() {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await api<{ fechaReferencia: string; turnos: number; usuarios: number }>("/api/admin/reset", {
        method: "POST",
      });
      setResult(`Datos restablecidos: ${r.usuarios} usuarios y ${r.turnos} turnos (referencia ${r.fechaReferencia}).`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageTitle title="Mantenimiento" />
      <div className="card space-y-4">
        <div>
          <h2 className="font-semibold">Restablecer datos de prueba</h2>
          <p className="mt-1 text-sm text-slate-500">
            Borra todos los datos (incluidos los usuarios registrados) y vuelve a cargar el set inicial con fechas
            relativas al día de hoy. También disponible como <code>POST /api/admin/reset</code>.
          </p>
        </div>
        {result && <p className="alert-success" data-testid="reset-resultado">{result}</p>}
        {error && <p className="alert-error" data-testid="reset-error">{error}</p>}
        {busy ? (
          <p className="text-sm text-slate-500">Restableciendo…</p>
        ) : (
          <ConfirmButton
            label="Restablecer datos"
            confirmLabel="Se perderán todos los cambios. ¿Continuar?"
            className="btn-danger"
            testid="reset-datos"
            onConfirm={reset}
          />
        )}
      </div>
    </div>
  );
}
