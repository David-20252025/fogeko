// Transforme un lien YouTube/Facebook collé dans l'admin en URL d'intégration (rien n'est hébergé chez nous)
export function videoEmbed(url: string): { embed: string; thumb?: string } | null {
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1);
  else if (host === "youtube.com") id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1] ?? null;
  if (id && /^[\w-]{11}$/.test(id))
    return { embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`, thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  if (host === "facebook.com" || host === "fb.watch")
    return { embed: `https://www.facebook.com/plugins/video.php?autoplay=1&href=${encodeURIComponent(u.toString())}` };
  return null;
}
