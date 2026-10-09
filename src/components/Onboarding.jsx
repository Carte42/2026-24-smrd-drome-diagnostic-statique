import React, { useState, useEffect } from 'react'

/**
 * Accueil et visite guidée — même machine à états que les démonstrateurs
 * SDE 35, EPTB Vistre Vistrenque et Montpellier : welcome → 1 → 2 → 3 → done.
 *
 * L'écran de bienvenue présente la consultation et son contexte : un évaluateur
 * qui ne clique rien doit savoir de quoi il s'agit, sur quel territoire et ce
 * que montre l'interface. Les trois étapes suivantes sont ancrées sur les vrais
 * contrôles via data-ob-anchor, et se repositionnent au redimensionnement.
 */
const ETAPES = [
  {
    ancre: 'curseur',
    emoji: '⭐',
    titre: 'Choisissez un niveau de priorité',
    texte:
      "Le curseur ne garde que les sous-bassins classés au moins à ce niveau. À cinq étoiles, ce sont ceux où agir en premier ; la carte et les compteurs suivent.",
  },
  {
    ancre: 'grille',
    emoji: '⚖',
    titre: 'Consultez la grille de notation',
    texte:
      "Quatre familles d'indicateurs pondérés notent chaque sous-bassin. La grille est affichée à côté de son résultat ; ses coefficients sont proposés à titre d'exemple.",
  },
  {
    ancre: 'export',
    emoji: '📥',
    titre: 'Export',
    texte:
      "Les couches se téléchargent en GeoJSON compatible QGIS, la grille en tableur, avec la chaîne de traitement qui produit chaque valeur.",
  },
]

export default function Onboarding({ onDemarrer, emprise }) {
  const [etape, setEtape] = useState('accueil')
  const [haut, setHaut] = useState(220)

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
          <div className="ob-welcome-text">
            Démonstration de la méthode Carte 42 en réponse à la consultation du Syndicat Mixte de la Rivière
            Drôme : diagnostic territorial préalable à la programmation d'actions de résilience du SAGE.
            Cette interface, proposée à titre d'exemple, applique la chaîne complète au bassin de la Gervanne (
            {Math.round(emprise.bassin_gervanne_km2)}&nbsp;km²), sur données ouvertes : sous-bassins, grille
            multicritères, secteurs agricoles prioritaires.
          </div>
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
