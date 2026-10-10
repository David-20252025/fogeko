"use client";

import { useActionState } from "react";
import { keepOnSubmit } from "@/lib/use-keep-form";
import { sendContact, type ContactState } from "@/app/(site)/contact/actions";

export const inputCls =
  "w-full rounded-xl border-2 border-navy/10 bg-white px-4 py-3.5 text-base text-ink outline-none transition placeholder:text-ink/65 focus:border-navy";
export const labelCls = "mb-1.5 block font-semibold text-navy";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, {});

  if (state.ok)
    return (
      <div className="rounded-3xl bg-navy p-10 text-center text-white" role="status">
        <p className="font-slab text-3xl font-bold">Merci !</p>
        <p className="mt-3 text-lg text-white/85">Votre message a bien été envoyé. Nous vous répondrons rapidement.</p>
      </div>
    );

  return (
    <form onSubmit={keepOnSubmit(action)} className="grid content-start self-start gap-5 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-navy/5 md:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="nom" className={labelCls}>Nom complet</label>
          <input id="nom" name="nom" required autoComplete="name" className={inputCls} />
        </div>
        <div>
          <label htmlFor="telephone" className={labelCls}>Téléphone</label>
          <input id="telephone" name="telephone" type="tel" autoComplete="tel" placeholder="+243 …" className={inputCls} />
        </div>
        <div>
          <label htmlFor="email" className={labelCls}>Email</label>
          <input id="email" name="email" type="email" autoComplete="email" className={inputCls} />
        </div>
      </div>
      <div>
        <label htmlFor="message" className={labelCls}>Message</label>
        <textarea id="message" name="message" required rows={5} className={inputCls} />
      </div>
      <input type="text" name="site_web" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state.error && <p className="rounded-xl bg-rouge/10 px-4 py-3 font-medium text-rouge-600" role="alert">{state.error}</p>}
      <button disabled={pending} className="rounded-full bg-rouge-600 px-7 py-4 text-lg font-semibold text-white shadow-lg shadow-rouge/25 transition hover:bg-rouge-700 disabled:opacity-60">
        {pending ? "Envoi…" : "Envoyer le message"}
      </button>
    </form>
  );
}
