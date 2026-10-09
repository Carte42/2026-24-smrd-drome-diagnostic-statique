// Descriptions factuelles des sous-bassins et des secteurs agricoles.
//
// Chaque phrase restitue un indicateur calculé sur une donnée ouverte, avec sa
// valeur et sa source. Aucune interprétation n'est ajoutée : pas de recommandation
// d'aménagement, pas de lien de cause supposé entre deux indicateurs. Le seul
// commentaire porte sur le classement lui-même : quelles familles de la grille
// ont les notes les plus hautes et les plus basses. Règles dans docs/DESCRIPTIONS.md.

import { ETOILES, nombre } from './config.js'

export const MOTS_PRIORITE = { 5: 'très élevée', 4: 'élevée', 3: 'moyenne', 2: 'modérée', 1: 'faible' }

const echapper = (t) =>
  String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const pc = (v) => `${nombre(v, 0)} %`
// Distance arrondie à la dizaine de mètres ; en deçà, on ne prétend pas à plus de précision.
const metres = (d) => (d < 10 ? 'moins de 10 m' : `${nombre(Math.round(d / 10) * 10, 0)} m`)

// ── Ce qui porte le classement ───────────────────────────────────────────────
//
// Les notes de famille ou de critère sont sur 100, normalisées dans le secteur
// d'étude. Une note d'au moins 60 est dite élevée, d'au plus 40 basse.
const HAUT = 60
const BAS = 40

function portes(notes, noms) {
  const cles = Object.keys(notes)
  const hautes = cles.filter((k) => notes[k] >= HAUT).sort((a, b) => notes[b] - notes[a]).map((k) => noms[k])
  const basses = cles.filter((k) => notes[k] <= BAS).sort((a, b) => notes[a] - notes[b]).map((k) => noms[k])
  const liste = (l) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}` : l[0])
  const morceaux = []
  if (hautes.length) morceaux.push(`notes les plus élevées : ${liste(hautes)}`)
  if (basses.length) morceaux.push(`notes les plus basses : ${liste(basses)}`)
  return morceaux.length ? `Classement — ${morceaux.join(' ; ')}.` : 'Classement — notes intermédiaires sur l’ensemble des critères.'
}

// ── Sous-bassin ──────────────────────────────────────────────────────────────

export function decrireBassin(p) {
  const prairies = Math.max(0, 100 - p.B3 - p.B2)
  return [
    `Altitude médiane : ${nombre(p.alt, 0)} m. Pente médiane : ${pc(p.pente_med)}. ` +
      `Surface en pente inférieure à 15 % : ${pc(p.C1)}.`,
    `Surface agricole : ${pc(p.D1)} du sous-bassin, dont ${pc(p.B3)} de terres arables, ` +
      `${pc(p.B2)} de cultures permanentes et ${pc(prairies)} de prairies permanentes.`,
    `Cours d’eau : ${nombre(p.A1)} km par km², dont ${pc(p.A2)} du linéaire classé intermittent. ` +
      `Sources et résurgences : ${nombre(p.A3)} pour 10 km².`,
    `Bâti et routes revêtues : ${nombre(p.B1)} % de la surface. ` +
      `Chemins et routes empierrées : ${nombre(p.D2)} km par km².`,
    portes(
      { A: p.f_A, B: p.f_B, C: p.f_C, D: p.f_D },
      { A: 'vulnérabilité des milieux', B: 'pressions', C: 'potentiel d’infiltration', D: 'faisabilité' },
    ),
  ]
}

// ── Secteur agricole ─────────────────────────────────────────────────────────

export function decrireSecteur(p) {
  const prairies = Math.max(0, 100 - p.ta - p.cp)
  return [
    `Altitude : ${nombre(p.alt, 0)} m. Pente inférieure à 10 % sur ${pc(p.pente10)} de la surface agricole du secteur.`,
    `Distance au plus proche cours d’eau ou à la plus proche source : ${metres(p.dist_eau_m)}. ` +
      `Distance au plus proche chemin ou à la plus proche route : ${metres(p.dist_acces_m)}.`,
    `Surface agricole du secteur : ${pc(p.ta)} de terres arables, ${pc(p.cp)} de cultures permanentes, ${pc(prairies)} de prairies permanentes.`,
    portes(
      { P: p.n_P, I: p.n_I, S: p.n_S },
      { P: 'proximité des milieux aquatiques', I: 'potentiel d’infiltration', S: 'pression sur les milieux et les sols' },
    ),
  ]
}

// ── Bulles ───────────────────────────────────────────────────────────────────

function corps(phrases) {
  const dernier = phrases.length - 1
  return phrases.map((t, i) => `<p${i === dernier ? ' class="conclusion"' : ''}>${echapper(t)}</p>`).join('')
}

const SOURCES = '<div class="bulle-source">Sources : BD TOPO, registre parcellaire graphique 2024, RGE ALTI, IGN. Indicateurs calculés pour la démonstration.</div>'

export function bulleBassin(p) {
  return `<div class="bulle">
    <div class="bulle-tete"><strong>${echapper(p.nom)}</strong><span class="et">${ETOILES(p.etoiles)}</span></div>
    <div class="bulle-prio">Priorité ${MOTS_PRIORITE[p.etoiles]}</div>
    ${corps(decrireBassin(p))}${SOURCES}
    <div class="bulle-actions">
      <button data-act="secteurs" data-id="${echapper(p.id)}">Voir les secteurs agricoles</button>
      <button data-act="detail">Détail des indicateurs</button>
    </div></div>`
}

export function bulleSecteur(p, nomBassin) {
  return `<div class="bulle">
    <div class="bulle-tete"><strong>Secteur agricole</strong><span class="et">${ETOILES(p.etoiles)}</span></div>
    <div class="bulle-prio">Priorité ${MOTS_PRIORITE[p.etoiles]}${p.n_sb >= 5 ? ' dans son sous-bassin' : ''}, ${echapper(nomBassin)}</div>
    ${corps(decrireSecteur(p))}${SOURCES}
    <div class="bulle-actions"><button data-act="detail">Détail des critères</button></div></div>`
}
