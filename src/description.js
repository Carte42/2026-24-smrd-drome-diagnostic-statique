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

  return [s1, s2, s3, conclusionBassin(p.etoiles)]
}

function conclusionBassin(e) {
  if (e === 5) return "Une action d'infiltration y aurait un effet important et serait relativement simple à mettre en œuvre."
  if (e === 4) return "Une action d'infiltration y serait pertinente et réalisable."
  if (e === 3) return "L'intérêt d'agir y est moyen : l'effet attendu et la faisabilité sont partagés."
  return "Ce sous-bassin joue surtout un rôle de zone d'alimentation des cours d'eau en aval."
}

// ── Secteur agricole ─────────────────────────────────────────────────────────

const arrondi50 = (m) => Math.max(50, Math.round(m / 50) * 50)

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

  let conclusion
  if (p.etoiles >= 4) conclusion = "Un aménagement d'infiltration y serait bien placé et réalisable."
  else if (p.etoiles === 3) conclusion = "Un aménagement d'infiltration y est envisageable."
  else conclusion = 'Ce secteur est moins bien placé que les autres du même sous-bassin.'
  return [eau, s2, acces, conclusion]
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
