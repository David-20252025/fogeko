import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-navy px-4 text-center text-white">
      <div>
        <Image src="/img/colombe.png" alt="" width={264} height={293} className="anim-fly mx-auto w-28 brightness-0 invert" />
        <h1 className="mt-8 text-5xl font-bold">Page introuvable</h1>
        <p className="mt-4 text-lg text-white/80">Cette page n&apos;existe pas ou a été déplacée.</p>
        <Link href="/" className="mt-8 inline-block rounded-full bg-rouge-600 px-7 py-4 font-semibold hover:bg-rouge-700">Retour à l&apos;accueil</Link>
      </div>
    </main>
  );
}
