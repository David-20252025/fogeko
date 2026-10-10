import Link from "next/link";

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-slab text-3xl font-bold text-navy md:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-ink/70">{sub}</p>}
      </div>
      {action && <Link href={action.href} className="rounded-full bg-rouge-600 px-5 py-2.5 text-center font-semibold text-white hover:bg-rouge-700">{action.label}</Link>}
    </div>
  );
}
