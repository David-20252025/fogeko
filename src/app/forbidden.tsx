import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4 text-center">
      <div>
        <p className="font-slab text-7xl font-bold text-navy">403</p>
        <h1 className="mt-4 text-2xl font-bold text-navy">Accès non autorisé</h1>
        <p className="mt-2 text-ink/70">Votre compte n&apos;a pas la permission d&apos;ouvrir ce module. Adressez-vous au super admin si vous en avez besoin.</p>
        <Link href="/gestion" className="mt-6 inline-block rounded-full bg-navy px-6 py-3 font-semibold text-white">Retour au tableau de bord</Link>
      </div>
    </main>
  );
}
