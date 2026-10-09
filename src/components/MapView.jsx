import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import {
  FONDS, MAP_CENTER, MAP_ZOOM, PRIORITE_BASSIN, PRIORITE_SECTEUR, NEUTRE, EXCLUSIONS,
  ETOILES, nombre,
} from '../config.js'
import { bulleBassin, bulleSecteur } from '../description.js'

/**
 * Carte Leaflet : fond IGN, situation dans le bassin de la Drôme, sous-bassins
 * classés, espaces inéligibles et secteurs agricoles.
 *
 * Le fond de plan est clair sur un chrome sombre : c'est lui qui doit ressortir.
 * Les couches vectorielles sont dessinées sur un moteur canvas, qui reste fluide
 * avec les quelques milliers de polygones des espaces inéligibles.
 */
export default function MapView({
  donnees, niveau, seuil, choix, onChoix, secteur, onSecteur, exclusions, fond, cadre,
  onVoirSecteurs, onDetail,
}) {
  const refDiv = useRef(null)
  const refs = useRef({})

  // ── Création de la carte, une seule fois ──────────────────────────────────
  useEffect(() => {
    if (refs.current.carte || !refDiv.current) return
    const carte = L.map(refDiv.current, {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      zoomControl: true,
      attributionControl: true,
      renderer: L.canvas({ padding: 0.4 }),
      fadeAnimation: false,
    })
    for (const [nom, z] of [['communes', 350], ['reseau', 360], ['excl', 420], ['sb', 430], ['sec', 440], ['contour', 450]]) {
      carte.createPane(nom).style.zIndex = z
    }
    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(carte)
    refs.current = { carte, groupes: {} }

    // Une carte créée dans un conteneur encore sans dimension (onglet masqué,
    // mise en page tardive) se cadre sur une taille nulle. À chaque changement
    // de taille, elle se redimensionne et se recadre, tant que personne n'y a
    // touché.
    const toucher = () => { refs.current.touche = true }
    const el = refDiv.current
    ;['mousedown', 'wheel', 'touchstart'].forEach((e) => el.addEventListener(e, toucher, { passive: true }))
    const obs = new ResizeObserver(() => {
      if (!el.clientWidth || !el.clientHeight) return
      carte.invalidateSize(false)
      if (!refs.current.touche && refs.current.recadrer) refs.current.recadrer(false)
    })
    obs.observe(el)
    return () => {
      obs.disconnect()
      ;['mousedown', 'wheel', 'touchstart'].forEach((e) => el.removeEventListener(e, toucher))
      carte.remove()
      refs.current = {}
    }
  }, [])

  // Les fonctions de rappel changent à chaque rendu de la page : la carte garde
  // la dernière, sans recréer ses couches.
  useEffect(() => {
    refs.current.rappels = { onVoirSecteurs, onDetail }
  })

  // La bulle d'un niveau n'a pas de sens sur l'autre.
  useEffect(() => {
    refs.current.carte?.closePopup()
  }, [niveau])

  // Bulle de description, ancrée au point cliqué. Ses deux boutons passent par
  // une délégation d'événement : le contenu est une chaîne HTML.
  const ouvrirBulle = (latlng, html) => {
    const { carte } = refs.current
    const bulle = L.popup({ maxWidth: 310, minWidth: 270, className: 'bulle-hote', autoPanPadding: [30, 30] })
      .setLatLng(latlng).setContent(html).openOn(carte)
    bulle.getElement().addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-act]')
      if (!b) return
      if (b.dataset.act === 'secteurs') {
        carte.closePopup()
        refs.current.rappels.onVoirSecteurs(b.dataset.id)
      } else refs.current.rappels.onDetail()
    })
  }

  // ── Fond de plan ──────────────────────────────────────────────────────────
  useEffect(() => {
    const { carte } = refs.current
    if (!carte) return
    if (refs.current.tuiles) carte.removeLayer(refs.current.tuiles)
    const f = FONDS[fond]
    refs.current.tuiles = L.tileLayer(f.url, {
      attribution: 'Fonds de plan : IGN — Géoplateforme',
      maxZoom: 18,
      minZoom: 6,
      opacity: f.opacite,
    }).addTo(carte)
    refs.current.tuiles.bringToBack()
  }, [fond])

  // ── Situation : bassin de la Drôme, communes, réseau ──────────────────────
  useEffect(() => {
    const { carte } = refs.current
    if (!carte || !donnees || refs.current.situation) return
    const communes = L.geoJSON(donnees.communes, {
      pane: 'communes',
      style: { color: '#5b6b8a', weight: 0.6, fill: false, opacity: 0.7 },
    })
    const reseau = L.geoJSON(donnees.reseau, {
      pane: 'reseau',
      style: (f) => ({ color: '#2a6db0', weight: f.properties.importance <= 4 ? 2.2 : 0.9, opacity: 0.75 }),
    })
    const contour = L.geoJSON(donnees.drome, {
      pane: 'contour',
      interactive: false,
      style: { color: '#0b1224', weight: 2.2, fill: false, dashArray: '6 4' },
    })
    L.layerGroup([communes, reseau, contour]).addTo(carte)
    refs.current.situation = true
  }, [donnees])

  // ── Cadrage : emprise générale, puis secteur de démonstration ─────────────
  useEffect(() => {
    const { carte } = refs.current
    if (!carte || !donnees) return
    const recadrer = (anime = true) => {
      carte.invalidateSize(false)
      const cible = cadre === 'secteur' ? donnees.gervanne : donnees.drome
      const marge = cadre === 'secteur' ? [34, 34] : [14, 14]
      const limites = L.geoJSON(cible).getBounds()
      if (anime) carte.flyToBounds(limites, { padding: marge, duration: 0.9 })
      else carte.fitBounds(limites, { padding: marge, animate: false })
    }
    refs.current.recadrer = recadrer
    refs.current.touche = false
    recadrer(true)
    const t = setTimeout(() => carte.invalidateSize(false), 400)
    return () => clearTimeout(t)
  }, [cadre, donnees])

  // Contour du secteur de démonstration, toujours visible : il situe le travail.
  useEffect(() => {
    const { carte } = refs.current
    if (!carte || !donnees || refs.current.secteurCouche) return
    refs.current.secteurCouche = L.geoJSON(donnees.gervanne, {
      pane: 'contour',
      interactive: false,
      style: { color: '#e4a53a', weight: 2.4, fill: true, fillColor: '#e4a53a', fillOpacity: 0.1 },
    }).addTo(carte)
  }, [donnees])

  // ── Sous-bassins ──────────────────────────────────────────────────────────
  useEffect(() => {
    const { carte } = refs.current
    if (!carte || !donnees) return
    if (refs.current.sb) carte.removeLayer(refs.current.sb)
    const agricole = niveau === 'agricole'
    const couche = L.geoJSON(donnees.sousBassins, {
      pane: 'sb',
      style: (f) => {
        const p = f.properties
        const retenu = p.etoiles >= seuil
        const selection = p.id === choix
        return {
          fillColor: retenu ? PRIORITE_BASSIN[p.etoiles - 1] : NEUTRE,
          fillOpacity: agricole ? (retenu ? 0.16 : 0.04) : retenu ? 0.66 : 0.1,
          color: selection ? '#e4a53a' : '#0b1224',
          weight: selection ? 3 : 1.2,
          dashArray: retenu ? null : '4 3',
        }
      },
      onEachFeature: (f, lc) => {
        const p = f.properties
        lc.bindTooltip(
          `<strong>${p.id} · ${p.nom}</strong><br>${nombre(p.surface_km2)} km² · note ${nombre(p.note)} / 100<br><span class="et">${ETOILES(p.etoiles)}</span>`,
          { sticky: true, className: 'survol' },
        )
        lc.on('click', (e) => {
          onChoix(p.id)
          ouvrirBulle(e.latlng, bulleBassin(p))
        })
      },
    }).addTo(carte)
    refs.current.sb = couche
  }, [donnees, seuil, niveau, choix, onChoix])

  // ── Espaces inéligibles ───────────────────────────────────────────────────
  useEffect(() => {
    const { carte } = refs.current
    if (!carte || !donnees) return
    if (refs.current.excl) {
      carte.removeLayer(refs.current.excl)
      refs.current.excl = null
    }
    if (!exclusions) return
    refs.current.excl = L.geoJSON(donnees.exclusions, {
      pane: 'excl',
      interactive: false,
      style: (f) => ({
        stroke: false,
        fillColor: EXCLUSIONS[f.properties.type].couleur,
        fillOpacity: f.properties.type === 'pente' ? 0.24 : 0.55,
      }),
    }).addTo(carte)
  }, [donnees, exclusions])

  // ── Secteurs agricoles, dans les sous-bassins retenus ─────────────────────
  useEffect(() => {
    const { carte } = refs.current
    if (!carte || !donnees) return
    if (refs.current.sec) {
      carte.removeLayer(refs.current.sec)
      refs.current.sec = null
    }
    if (niveau !== 'agricole') return
    const noms = Object.fromEntries(donnees.sousBassins.features.map((f) => [f.properties.id, f.properties.nom]))
    const retenus = new Set(
      donnees.sousBassins.features.filter((f) => f.properties.etoiles >= seuil).map((f) => f.properties.id),
    )
    const donneesFiltrees = {
      type: 'FeatureCollection',
      features: donnees.secteurs.features.filter((f) => retenus.has(f.properties.sb)),
    }
    refs.current.sec = L.geoJSON(donneesFiltrees, {
      pane: 'sec',
      style: (f) => ({
        fillColor: PRIORITE_SECTEUR[f.properties.etoiles - 1],
        fillOpacity: 0.85,
        color: f.properties.maille === secteur ? '#e4a53a' : '#3b2a06',
        weight: f.properties.maille === secteur ? 2.4 : 0.4,
      }),
      onEachFeature: (f, lc) => {
        const p = f.properties
        lc.bindTooltip(
          `<strong>Secteur agricole</strong> · ${nombre(p.ha)} ha<br>note ${nombre(p.note)} / 100 · <span class="et">${ETOILES(p.etoiles)}</span>`,
          { sticky: true, className: 'survol' },
        )
        lc.on('click', (e) => {
          onSecteur(p.maille)
          ouvrirBulle(e.latlng, bulleSecteur(p, noms[p.sb]))
        })
      },
    }).addTo(carte)
  }, [donnees, niveau, seuil, secteur, onSecteur])

  return <div ref={refDiv} className="leaflet-hote" />
}
