"use client";

import Image from "next/image";
import { useActionState } from "react";
import { keepOnSubmit } from "@/lib/use-keep-form";
import { login } from "../../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <main className="grid min-h-screen bg-mist lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy lg:block">
        <Image src="/img/fondateur-assis.webp" alt="" fill sizes="50vw" className="object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="font-slab text-4xl font-bold">Espace de gestion</p>
          <p className="mt-2 text-lg text-white/80">Membres, actualités et contenus de la Fondation Gekoko.</p>
        </div>
        <div className="kuba absolute inset-x-0 bottom-0" />
      </div>
      <div className="grid place-items-center px-4 py-12">
        <form onSubmit={keepOnSubmit(action)} className="w-full max-w-sm">
          <Image src="/img/logo.webp" alt="FOGEKO" width={124} height={96} className="mx-auto h-24 w-auto" loading="eager" />
          <h1 className="font-slab mt-8 text-center text-3xl font-bold text-navy">Connexion</h1>
          <label htmlFor="email" className="mt-8 mb-1.5 block font-semibold text-navy">Email</label>
          <input id="email" name="email" type="email" required autoComplete="username" className="w-full rounded-xl border-2 border-navy/10 bg-white px-4 py-3.5 outline-none focus:border-navy" />
          <label htmlFor="password" className="mt-5 mb-1.5 block font-semibold text-navy">Mot de passe</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="w-full rounded-xl border-2 border-navy/10 bg-white px-4 py-3.5 outline-none focus:border-navy" />
          {state.error && <p className="mt-4 rounded-xl bg-rouge/10 px-4 py-3 font-medium text-rouge-600" role="alert">{state.error}</p>}
          <button disabled={pending} className="mt-6 w-full rounded-full bg-navy py-4 text-lg font-semibold text-white hover:bg-navy-700 disabled:opacity-60">
            {pending ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  );
}
