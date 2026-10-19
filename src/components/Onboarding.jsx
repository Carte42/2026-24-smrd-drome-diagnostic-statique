import React, { useState, useEffect } from 'react'

/**
 * Accueil et visite guidée — même machine à états que les démonstrateurs
 * SDE 35, EPTB Vistre Vistrenque et Montpellier : welcome → 1 → … → done.
 *
 * L'écran de bienvenue pose la question du maître d'ouvrage et les trois phases
 * du cahier des charges : un évaluateur qui ne clique rien doit reconnaître son
 * besoin, le territoire et ce que montre l'interface. Les étapes suivantes sont
 * ancrées sur les vrais contrôles via data-ob-anchor, et se repositionnent au
 * redimensionnement. `onEtape` permet à la carte de montrer ce que décrit l'étape.
 */
const ETAPES = [
  {
    ancre: 'demarche',
    emoji: '🧭',
    titre: 'Les trois phases du cahier des charges',
    texte:
      "Phase 1 : les espaces inéligibles à l'infiltration, affichés sur la carte. Phase 2 : les sous-bassins versants classés. Phase 3 : les secteurs agricoles prioritaires. Cliquez une phase pour l'afficher.",
  },
  {
    ancre: 'curseur',
    emoji: '⭐',
    titre: 'Choisissez un niveau de priorité',
    texte:
      "Le curseur ne garde que les sous-bassins où agir en priorité, au moins à ce niveau. À cinq étoiles, ce sont les mieux classés par la grille ; la carte et les compteurs suivent.",
  },
  {
    ancre: 'grille',
    emoji: '⚖',
    titre: 'Consultez la grille de notation',
    texte:
      "Quatre familles d'indicateurs pondérés notent chaque sous-bassin. Ses coefficients, proposés ici à titre d'exemple, sont arrêtés avec le SMRD en comité technique.",
  },
  {
    ancre: 'export',
    emoji: '📥',
    titre: 'Export',
    texte:
      "Les couches se téléchargent en GeoJSON compatible QGIS, la grille en tableur, avec la chaîne de traitement qui produit chaque valeur.",
  },
]

export default function Onboarding({ onDemarrer, onEtape, emprise }) {
  const [etape, setEtape] = useState('accueil')
  const [haut, setHaut] = useState(220)

  useEffect(() => {
    if (typeof etape === 'number') onEtape?.(etape)
  }, [etape, onEtape])

  useEffect(() => {
    if (typeof etape !== 'number') return
    const placer = () => {
      const el = document.querySelector(`[data-ob-anchor="${ETAPES[etape].ancre}"]`)
      if (!el) return
      // La barre latérale défile : le bloc visé est ramené à l'écran avant que
      // la carte d'explication ne se place à sa hauteur.
      el.scrollIntoView({ block: 'center', behavior: 'auto' })
      const r = el.getBoundingClientRect()
      const ideal = Math.round(r.top + r.height / 2 - 70)
      setHaut(Math.max(70, Math.min(ideal, window.innerHeight - 250)))
    }
    placer()
    window.addEventListener('resize', placer)
    return () => window.removeEventListener('resize', placer)
  }, [etape])

  function suivant() {
    if (etape === 'accueil') {
      onDemarrer()
      setEtape(0)
    } else if (etape < ETAPES.length - 1) setEtape(etape + 1)
    else setEtape('fin')
  }

  if (etape === 'fin') return null

  return (
    <div className="ob-overlay">
      {etape === 'accueil' && (
        <div className="ob-welcome-card">
          <div className="ob-glow" />
          <div className="ob-welcome-title">Bienvenue sur votre interface de démonstration</div>
          <div className="ob-welcome-subtitle">
            SMRD · Diagnostic territorial du bassin versant de la Drôme · Carte 42
          </div>
          <div className="ob-welcome-question">
            Où agir en priorité pour infiltrer l'eau dans les sols, au profit des milieux aquatiques&nbsp;?
          </div>
          <div className="ob-welcome-text">
            Cette interface applique la méthode Carte 42 au bassin de la Gervanne (
            {Math.round(emprise.bassin_gervanne_km2)}&nbsp;km²), sur données ouvertes et à titre d'exemple,
            en suivant les trois phases du cahier des charges&nbsp;:
          </div>
          <ol className="ob-welcome-phases">
            <li>écarter les espaces qui ne peuvent pas accueillir d'aménagement d'infiltration&nbsp;;</li>
            <li>classer les sous-bassins versants par une grille multicritères&nbsp;;</li>
            <li>désigner, dans chacun, les secteurs agricoles prioritaires pour des aménagements à engager sous deux ans.</li>
          </ol>
          <button className="ob-start" onClick={suivant}>Commencer →</button>
        </div>
      )}

      {typeof etape === 'number' && (
        <div className="ob-card ob-card--left" style={{ top: haut }}>
          <div className="ob-glow" />
          <div className="ob-arrow--left-ext">◀</div>
          <div className="ob-body">
            <div className="ob-emoji">{ETAPES[etape].emoji}</div>
            <div className="ob-title">{ETAPES[etape].titre}</div>
            <div className="ob-text">{ETAPES[etape].texte}</div>
          </div>
          <button className="ob-ok" onClick={suivant}>
            {etape === ETAPES.length - 1 ? "C'est parti ✓" : 'OK, compris →'}
          </button>
        </div>
      )}
    </div>
  )
}
