// Centre approximatif de chaque commune de Kinshasa (lat, lng) pour la carte du tableau de bord.
// shortcut: un point par commune (pas de GPS par membre) ; ajouter des coordonnées au membre si un suivi plus fin est nécessaire.
export const COMMUNES_GEO: Record<string, [number, number]> = {
  Bandalungwa: [-4.3415, 15.2855], Barumbu: [-4.3175, 15.3265], Bumbu: [-4.3725, 15.2950], Gombe: [-4.3045, 15.3070],
  Kalamu: [-4.3495, 15.3150], "Kasa-Vubu": [-4.3420, 15.3010], Kimbanseke: [-4.4330, 15.4060], Kinshasa: [-4.3280, 15.3060],
  Kintambo: [-4.3290, 15.2700], Kisenso: [-4.4060, 15.3570], Lemba: [-4.3950, 15.3270], Limete: [-4.3580, 15.3420],
  Lingwala: [-4.3300, 15.2960], Makala: [-4.3770, 15.3080], Maluku: [-4.0700, 15.9000], Masina: [-4.3830, 15.4100],
  Matete: [-4.3830, 15.3520], "Mont-Ngafula": [-4.4500, 15.2700], Ndjili: [-4.3930, 15.3950], Ngaba: [-4.3830, 15.3260],
  Ngaliema: [-4.3700, 15.2350], "Ngiri-Ngiri": [-4.3560, 15.2950], Nsele: [-4.3700, 15.5500], Selembao: [-4.3870, 15.2800],
};
