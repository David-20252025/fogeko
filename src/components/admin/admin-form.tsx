"use client";

import { useActionState, useEffect, useRef } from "react";
import { keepOnSubmit } from "@/lib/use-keep-form";

export type FormState = { ok?: boolean; error?: string; info?: string };

/** Formulaire d'administration : affiche l'erreur ou la confirmation renvoyée par l'action serveur. */
export function AdminForm({ action, children, submit = "Enregistrer", className = "grid gap-4", resetOnSuccess = false, readOnly = false }: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submit?: string;
  className?: string;
  resetOnSuccess?: boolean;
  /** Sans permission « modifier » : champs désactivés, pas de bouton */
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} onSubmit={keepOnSubmit(formAction)} className={className}>
      <fieldset disabled={readOnly} className="contents">{children}</fieldset>
      {!readOnly && <div className="flex flex-wrap items-center gap-4">
        <button disabled={pending} className="rounded-full bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-700 disabled:opacity-60">
          {pending ? "Enregistrement…" : submit}
        </button>
        {state.ok && !pending && <p className="font-semibold text-emerald-700" role="status">Enregistré.</p>}
        {state.error && <p className="font-semibold text-rouge-600" role="alert">{state.error}</p>}
        {state.info && !pending && <p className="w-full rounded-xl bg-ocre/15 px-4 py-2 font-semibold text-ink" role="status">{state.info}</p>}
      </div>}
    </form>
  );
}
