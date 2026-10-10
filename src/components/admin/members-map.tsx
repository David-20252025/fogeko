"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export type MapPoint = { communeId: number; nom: string; lat: number; lng: number; count: number; quartiers: { nom: string; count: number }[] };

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Carte des membres par commune : un cercle par commune, taille proportionnelle au nombre de membres
export function MembersMap({ points }: { points: MapPoint[] }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false });
      // Cadre la ville (communes urbaines) : Nsele et Maluku, très à l'est, restent visibles en dézoomant
      const urbains = points.filter((p) => p.lng < 15.5);
      map.fitBounds(L.latLngBounds((urbains.length ? urbains : points).map((p) => [p.lat, p.lng] as [number, number])), { padding: [30, 30], maxZoom: 13 });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 16,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const max = Math.max(1, ...points.map((p) => p.count));
      for (const p of points) {
        const quartiers = p.quartiers.map((q) => `${esc(q.nom)} : ${q.count}`).join("<br>");
        L.circleMarker([p.lat, p.lng], { radius: 6 + 18 * Math.sqrt(p.count / max), color: "#ffffff", weight: 2, fillColor: "#0A1360", fillOpacity: 0.85 })
          .bindTooltip(`${esc(p.nom)} : ${p.count} membre${p.count > 1 ? "s" : ""}`)
          .bindPopup(`<strong>${esc(p.nom)}</strong> — ${p.count} membre${p.count > 1 ? "s" : ""}<br>${quartiers}<br><a href="/gestion/membres?communeId=${p.communeId}">Voir la liste →</a>`)
          .addTo(map);
      }
    });
    return () => { cancelled = true; map?.remove(); };
  }, [points]);

  return <div ref={el} className="z-0 h-80 w-full overflow-hidden rounded-2xl bg-mist" role="img" aria-label={`Carte des membres : ${points.map((p) => `${p.nom} ${p.count}`).join(", ")}`} />;
}
