import Image from "next/image";

export const admInput = "w-full rounded-xl border-2 border-navy/10 bg-white px-3.5 py-2.5 outline-none focus:border-navy";
export const admLabel = "mb-1 block text-sm font-semibold text-ink/70";

type Base = { name: string; label: string; hint?: string; className?: string; id?: string };

export function Text({ name, label, hint, className, id = name, ...rest }: Base & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={id} className={admLabel}>{label}</label>
      <input id={id} name={name} className={admInput} {...rest} />
      {hint && <p className="mt-1 text-xs text-ink/65">{hint}</p>}
    </div>
  );
}

export function Area({ name, label, hint, className, id = name, ...rest }: Base & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={className}>
      <label htmlFor={id} className={admLabel}>{label}</label>
      <textarea id={id} name={name} rows={4} className={admInput} {...rest} />
      {hint && <p className="mt-1 text-xs text-ink/65">{hint}</p>}
    </div>
  );
}

export function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 font-semibold text-navy">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-5 accent-navy" /> {label}
    </label>
  );
}

export function ImageField({ name = "image", label = "Image", current, required }: { name?: string; label?: string; current?: string | null; required?: boolean }) {
  return (
    <div>
      <span className={admLabel}>{label}</span>
      <div className="flex flex-wrap items-center gap-4">
        {current && (current.startsWith("/gestion/")
          // eslint-disable-next-line @next/next/no-img-element -- photo protégée : l'optimiseur d'images n'a pas la session
          ? <img src={current} alt="" className="size-20 rounded-full object-cover" />
          : <Image src={current} alt="" width={160} height={120} className="h-20 w-28 rounded-xl object-cover" />)}
        <input type="file" name={name} accept="image/jpeg,image/png,image/webp" required={required && !current}
          className="w-full min-w-0 text-sm sm:w-auto file:mr-3 file:rounded-full file:border-0 file:bg-mist file:px-4 file:py-2 file:font-semibold file:text-navy" />
      </div>
      <p className="mt-1 text-xs text-ink/65">{current ? "Laisser vide pour garder l'image actuelle. " : ""}JPG, PNG ou WebP, convertie automatiquement en WebP.</p>
    </div>
  );
}
