// ── Services web IGN ─────────────────────────────────────────────────────────
// Gabarit de tuiles de la Géoplateforme. Leaflet substitue {z}/{x}/{y}.
const WMTS =
  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
  '&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'

export const FONDS = {
  plan: {
    libelle: 'Plan IGN',
    url: `${WMTS}&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&FORMAT=image/png`,
    opacite: 0.88,
  },
  ortho: {
    libelle: 'Orthophotographie',
    url: `${WMTS}&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&FORMAT=image/jpeg`,
    opacite: 1,
  },
}

// ── Cadrage ──────────────────────────────────────────────────────────────────
export const MAP_CENTER = [44.65, 5.35]
export const MAP_ZOOM = 9

// ── Palettes ─────────────────────────────────────────────────────────────────
// Cinq classes de priorité, de la plus faible à la plus forte. Une seule
// sémiologie, constante d'un écran à l'autre : le bleu pour les sous-bassins,
// l'ocre pour les secteurs agricoles.
export const PRIORITE_BASSIN = ['#cfe3f5', '#9cc4ea', '#5CA6E0', '#2a6db0', '#123f7a']
export const PRIORITE_SECTEUR = ['#f3e3b5', '#eccb6a', '#e0a82e', '#b87a14', '#7a4a08']
export const NEUTRE = '#7b8aa8'

export const EXCLUSIONS = {
  pente: { couleur: '#6b5a4a', libelle: 'Pente supérieure à 25 %' },
  artificialise: { couleur: '#a04545', libelle: 'Bâti et routes revêtues' },
  eau: { couleur: '#2a6db0', libelle: "Surfaces en eau" },
}

export const ETOILES = (n) => '★'.repeat(n) + '☆'.repeat(5 - n)

const NF = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })
const NF0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
export const nombre = (v, d = 1) =>
  typeof v === 'number' && Number.isFinite(v) ? (d === 0 ? NF0 : NF).format(v) : '—'

// Données servies par la page, dans l'ordre où elles sont chargées.
export const FICHIERS = [
  'grille.json',
  'sous_bassins.geojson',
  'secteurs.geojson',
  'inegibles.geojson',
  'bassin_drome.geojson',
  'bassin_gervanne.geojson',
  'communes_bassin.geojson',
  'reseau_principal.geojson',
  'emprise.json',
  'criteres_agricoles.json',
  'fichiers.json',
]
