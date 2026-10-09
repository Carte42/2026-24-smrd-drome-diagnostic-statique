// Descriptions en langage courant des sous-bassins et des secteurs agricoles.
//
// Chaque phrase est tirée d'un indicateur, avec un seuil lu dans la répartition
// réelle des 13 sous-bassins et des 328 secteurs. Rien n'est rédigé à la main
// pour une unité : le texte reste cohérent avec la grille si elle change.
// Les seuils et les phrases sont reproduits dans docs/DESCRIPTIONS.md.

import { ETOILES, nombre } from './config.js'

export const MOTS_PRIORITE = { 5: 'très élevée', 4: 'élevée', 3: 'moyenne', 2: 'modérée', 1: 'faible' }

const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1)
const echapper = (t) =>
  String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** Terme d'altitude, d'après l'altitude médiane en mètres. */
function relief(alt) {
  if (alt < 350) return 'fond de vallée'
  if (alt < 600) return 'piémont'
  if (alt < 1200) return 'moyenne montagne'
  return 'haute montagne'
}

// ── Motifs d'un classement ───────────────────────────────────────────────────
//
// Un niveau d'étoiles seul est ambigu : un rang bas peut venir d'un moindre
// besoin d'agir ou d'un terrain moins propice à l'aménagement. La conclusion
// nomme donc les critères qui portent le classement, vers le haut ou vers le bas.
// Une note de critère est sur 100, normalisée dans le secteur : au moins 60 est
// un atout, au plus 40 un retrait.
const ATOUT = 60
const RETRAIT = 40

function motifs(notes, atouts, retraits, plus = 2) {
  const classes = Object.keys(notes)
  const forts = classes.filter((k) => notes[k] >= ATOUT).sort((a, b) => notes[b] - notes[a]).slice(0, plus)
  const faibles = classes.filter((k) => notes[k] <= RETRAIT).sort((a, b) => notes[a] - notes[b]).slice(0, plus)
  return {
    forts: forts.map((k) => atouts[k]),
    faibles: faibles.map((k) => retraits[k]),
  }
}

const liste = (l) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l[l.length - 1]}` : l[0])

// ── Sous-bassin ──────────────────────────────────────────────────────────────

/** Les trois phrases du portrait d'un sous-bassin, puis sa conclusion. */
export function decrireBassin(p) {
  // 1. Qui est ce lieu : relief et occupation du sol.
  const pente = p.pente_med < 20 ? 'au terrain doux' : p.pente_med < 35 ? 'au relief modéré' : 'aux versants raides'
  let occupation
  if (p.D1 < 15) occupation = 'avec peu de terres agricoles'
  else if (p.D1 < 30) occupation = 'avec des terres agricoles par endroits'
  else occupation = 'largement agricole'
  let detail = ''
  if (p.D1 >= 15) {
    if (p.B3 >= 50 && p.B2 >= 10) detail = ' : surtout des terres cultivées, avec des vignes et d\'autres cultures pérennes'
    else if (p.B3 >= 50) detail = ' : surtout des terres cultivées'
    else if (p.B2 >= 10) detail = ' : terres cultivées, vignes et cultures pérennes'
    else if (p.B3 < 25) detail = ' : surtout des prairies'
    else detail = ' : cultures et prairies'
    if (p.D3 >= 2.5) detail += ', aux parcelles assez grandes'
    else if (p.D3 < 1.2) detail += ', aux petites parcelles'
  }
  const s1 = `${majuscule(relief(p.alt))} ${pente}, ${occupation}${detail}.`

  // 2. Ce qui le fragilise : l'eau et la pression agricole.
  const dense = p.A1 >= 2.8 ? ' dense' : p.A1 <= 1.3 ? ' peu dense' : ''
  const interm =
    p.A2 >= 85 ? 'presque entièrement intermittent' : p.A2 >= 65 ? 'en grande partie intermittent' : 'en partie permanent'
  const sources = p.A3 >= 6 ? ', avec de nombreuses sources' : ''
  let pression
  if (p.D1 < 15) pression = 'Peu de pression agricole.'
  else if (p.B3 >= 50) pression = 'Les sols cultivés ruissellent vers les ruisseaux.'
  else if (p.B3 < 25) pression = 'Peu de terres labourées, donc peu de ruissellement à corriger.'
  else pression = 'Pression agricole modérée.'
  const s2 = `Réseau de cours d'eau${dense}, ${interm}${sources}. ${pression}`

  // 3. Ce qui permet d'agir : desserte et pente.
  const desserte =
    p.D2 >= 2.7 ? 'Bien desservi par les chemins et les routes empierrées' : p.D2 >= 1.9 ? 'Accès correct par les pistes' : 'Accès rares'
  const amenager =
    p.C1 >= 35 ? "la pente permet d'aménager" : p.C1 < 12 ? 'la pente limite fortement les aménagements' : 'la pente limite en partie les aménagements'
  const s3 = `${desserte} ; ${amenager}.`

  return [s1, s2, s3, conclusionBassin(p)]
}

const ATOUTS_BASSIN = {
  A: 'des milieux aquatiques nombreux et fragiles',
  B: 'de fortes pressions à corriger',
  C: "un terrain favorable à l'infiltration",
  D: 'une mise en œuvre facile',
}
const RETRAITS_BASSIN = {
  A: 'peu de milieux fragiles à soutenir',
  B: 'peu de pression à corriger',
  C: "un terrain peu favorable à l'infiltration",
  D: 'une mise en œuvre difficile',
}

function conclusionBassin(p) {
  const { forts, faibles } = motifs({ A: p.f_A, B: p.f_B, C: p.f_C, D: p.f_D }, ATOUTS_BASSIN, RETRAITS_BASSIN, 3)
  if (p.etoiles >= 4) {
    const tempere = faibles.length ? `, mais ${faibles[0]}` : ''
    return forts.length
      ? `Une action d'infiltration y est pertinente : ${liste(forts)}${tempere}.`
      : "Une action d'infiltration y est pertinente, sans atout isolé mais avec un ensemble favorable."
  }
  if (p.etoiles === 3) {
    if (forts.length && faibles.length) return `Intérêt moyen : ${liste(forts.slice(0, 1))}, mais ${liste(faibles.slice(0, 1))}.`
    if (forts.length) return `Intérêt moyen : ${liste(forts.slice(0, 1))}.`
    if (faibles.length) return `Intérêt moyen : ${liste(faibles.slice(0, 1))}.`
    return "Intérêt moyen : les critères sont partagés, sans atout ni retrait marqué."
  }
  return faibles.length
    ? `Priorité plus faible : ${liste(faibles.slice(0, 2))}.`
    : "Priorité plus faible : aucun critère ne ressort, l'ensemble reste en retrait."
}

// ── Secteur agricole ─────────────────────────────────────────────────────────

const arrondi50 = (m) => Math.max(50, Math.round(m / 50) * 50)

const ATOUTS_SECTEUR = {
  P: 'proche du milieu à soutenir',
  I: "terrain favorable à l'infiltration",
  S: 'sol cultivé, qui ruisselle',
}
const RETRAITS_SECTEUR = {
  P: 'éloigné du milieu à soutenir, effet attendu limité',
  I: "terrain moins propice à l'aménagement",
  S: 'peu de pression à corriger',
}

function conclusionSecteur(p) {
  const { forts, faibles } = motifs({ P: p.n_P, I: p.n_I, S: p.n_S }, ATOUTS_SECTEUR, RETRAITS_SECTEUR, 2)
  const portee = p.n_sb >= 5 ? ' dans son sous-bassin' : ''
  if (p.etoiles >= 4) {
    const tempere = faibles.length ? `, mais ${faibles[0]}` : ''
    return forts.length
      ? `Un aménagement d'infiltration y serait bien placé : ${liste(forts)}${tempere}.`
      : "Un aménagement d'infiltration y serait bien placé, sans atout isolé mais avec un ensemble favorable."
  }
  if (p.etoiles === 3) {
    if (forts.length && faibles.length) return `Intérêt moyen : ${forts[0]}, mais ${faibles[0]}.`
    return "Intérêt moyen : les critères sont partagés, sans atout ni retrait marqué."
  }
  return faibles.length
    ? `Priorité plus faible${portee} : ${liste(faibles)}.`
    : `Priorité plus faible${portee} : sans retrait marqué, mais moins bien classé que ses voisins sur l'ensemble des critères.`
}

export function decrireSecteur(p) {
  // Position par rapport à l'eau.
  let eau
  if (p.dist_eau_m < 50) eau = `${majuscule(relief(p.alt))}, au bord d'un cours d'eau ou d'une source.`
  else if (p.dist_eau_m < 700) eau = `${majuscule(relief(p.alt))}, à environ ${nombre(arrondi50(p.dist_eau_m), 0)} m d'un cours d'eau ou d'une source.`
  else eau = `${majuscule(relief(p.alt))}, éloigné des cours d'eau : environ ${nombre(arrondi50(p.dist_eau_m), 0)} m.`

  // Terrain et occupation.
  const terrain = p.pente10 >= 60 ? 'Terrain plat' : p.pente10 >= 30 ? 'Pente modérée' : 'Terrain en pente'
  let sol
  if (p.ta >= 60) {
    sol = `cultivé en terres arables${p.dist_eau_m < 300 ? " : l'eau de pluie ruisselle vers le cours d'eau voisin" : ''}`
  } else if (p.cp >= 30) sol = 'planté en vignes ou en cultures pérennes'
  else if (p.ta < 20 && p.cp < 20) sol = 'en prairie : sol enherbé, peu de ruissellement à corriger'
  else sol = 'en partie cultivé'
  const s2 = `${terrain}, ${sol}.`

  // Accès.
  const acces = p.dist_acces_m < 60 ? "En bordure d'un chemin." : p.dist_acces_m < 200 ? 'Accessible par un chemin proche.' : "À l'écart des chemins."

  return [eau, s2, acces, conclusionSecteur(p)]
}

// ── Bulles ───────────────────────────────────────────────────────────────────

function corps(phrases) {
  const dernier = phrases.length - 1
  return phrases.map((t, i) => `<p${i === dernier ? ' class="conclusion"' : ''}>${echapper(t)}</p>`).join('')
}

export function bulleBassin(p) {
  return `<div class="bulle">
    <div class="bulle-tete"><strong>${echapper(p.nom)}</strong><span class="et">${ETOILES(p.etoiles)}</span></div>
    <div class="bulle-prio">Priorité ${MOTS_PRIORITE[p.etoiles]}</div>
    ${corps(decrireBassin(p))}
    <div class="bulle-actions">
      <button data-act="secteurs" data-id="${echapper(p.id)}">Voir les secteurs agricoles</button>
      <button data-act="detail">Détail des indicateurs</button>
    </div></div>`
}

export function bulleSecteur(p, nomBassin) {
  return `<div class="bulle">
    <div class="bulle-tete"><strong>Secteur agricole</strong><span class="et">${ETOILES(p.etoiles)}</span></div>
    <div class="bulle-prio">Priorité ${MOTS_PRIORITE[p.etoiles]}${p.n_sb >= 5 ? ' dans son sous-bassin' : ''}, ${echapper(nomBassin)}</div>
    ${corps(decrireSecteur(p))}
    <div class="bulle-actions"><button data-act="detail">Détail des critères</button></div></div>`
}
