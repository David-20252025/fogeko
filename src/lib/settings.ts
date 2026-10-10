import { cache } from "react";
import { db } from "./db";

// Une seule lecture par requête, même si l'en-tête, le pied de page et la page la demandent
export const getSettings = cache(() => db.siteSettings.findUniqueOrThrow({ where: { id: 1 } }));

export const whatsappLink = (num: string, text = "Bonjour FOGEKO") =>
  `https://wa.me/${num.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

// Le champ téléphone peut contenir plusieurs numéros séparés par « / », « , » ou « ; »
export const phoneList = (t: string) =>
  t.split(/[/,;]/).map((n) => n.trim()).filter(Boolean).map((label) => ({ label, href: `tel:${label.replace(/[^\d+]/g, "")}` }));
