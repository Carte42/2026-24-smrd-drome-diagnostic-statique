import React, { useCallback, useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import Onboarding from './components/Onboarding.jsx'
import Apropos from './components/Apropos.jsx'
import {
  FICHIERS, FONDS, PRIORITE_BASSIN, PRIORITE_SECTEUR, EXCLUSIONS, ETOILES, nombre,
} from './config.js'

const base = import.meta.env.BASE_URL

/** Barre de note de 0 à 100, avec sa valeur. */
function Barre({ valeur }) {
  return (
    <span className="barre" title={`${nombre(valeur)} / 100`}>
      <i style={{ width: `${Math.max(2, Math.min(100, valeur))}%` }} />
    </span>
  )
}

export default function App() {
  const [donnees, setDonnees] = useState(null)
  const [erreur, setErreur] = useState(null)
  const [niveau, setNiveau] = useState('bassin')
  const [seuil, setSeuil] = useState(4)
  const [choix, setChoix] = useState(null)
  const [secteur, setSecteur] = useState(null)
  const [exclusions, setExclusions] = useState(false)
  const [fond, setFond] = useState('plan')
  const [cadre, setCadre] = useState('emprise')
  const [apropos, setApropos] = useState(false)
  const [grilleOuverte, setGrilleOuverte] = useState(false)

  // ── Chargement des données servies ────────────────────────────────────────
  useEffect(() => {
    Promise.all(
      FICHIERS.map((f) =>
        fetch(`${base}data/${f}`).then((r) => {
          if (!r.ok) throw new Error(`${f} : ${r.status}`)
          return r.json()
        }),
      ),
    )
      .then(([grille, sousBassins, secteurs, exclus, drome, gervanne, communes, reseau, emprise, criteres, fichiers]) =>
        setDonnees({ grille, sousBassins, secteurs, exclusions: exclus, drome, gervanne, communes, reseau, emprise, criteres, fichiers }),
      )
      .catch((e) => setErreur(String(e)))
  }, [])

  const unites = useMemo(
    () => (donnees ? donnees.sousBassins.features.map((f) => f.properties).sort((a, b) => a.rang - b.rang) : []),
    [donnees],
  )
  const retenus = useMemo(() => unites.filter((u) => u.etoiles >= seuil), [unites, seuil])
  const surfaceTotale = useMemo(() => unites.reduce((s, u) => s + u.surface_km2, 0), [unites])
  const surfaceRetenue = retenus.reduce((s, u) => s + u.surface_km2, 0)
  const secteursRetenus = useMemo(() => {
    if (!donnees) return []
    const ids = new Set(retenus.map((u) => u.id))
    return donnees.secteurs.features.map((f) => f.properties).filter((p) => ids.has(p.sb))
  }, [donnees, retenus])
  const haSecteurs = secteursRetenus.reduce((s, p) => s + p.ha, 0)

  const unite = unites.find((u) => u.id === choix) || null
  const fiche = donnees && secteur != null
    ? donnees.secteurs.features.map((f) => f.properties).find((p) => p.maille === secteur)
    : null

  // Les couches transmises à la carte. L'objet doit garder la même identité d'un
  // rendu à l'autre : recréé à chaque changement du curseur, il relançait le
  // cadrage de la carte et le redessin des couches en pleine animation.
  const donneesCarte = useMemo(
    () => donnees && {
      sousBassins: donnees.sousBassins, secteurs: donnees.secteurs, exclusions: donnees.exclusions,
      drome: donnees.drome, gervanne: donnees.gervanne, communes: donnees.communes, reseau: donnees.reseau,
    },
    [donnees],
  )

  const surChoix = useCallback((id) => setChoix(id), [])
  const surSecteur = useCallback((m) => setSecteur(m), [])

  if (erreur) return <div className="carte-attente">Les données n'ont pas pu être chargées : {erreur}</div>
  if (!donnees) return <div className="carte-attente">Chargement des données…</div>

  const { grille, emprise, criteres } = donnees
  const classes = niveau === 'bassin' ? PRIORITE_BASSIN : PRIORITE_SECTEUR

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="entete">
          <div className="entete-marche">SMRD · Diagnostic territorial</div>
          <h1>Bassin de la Drôme</h1>
          <div className="entete-territoire">
            Secteur de démonstration : bassin de la Gervanne, {nombre(emprise.bassin_gervanne_km2, 0)} km²,{' '}
            {unites.length} sous-bassins versants
          </div>
        </div>

        {/* ── Question et curseur ── */}
        <div className="bloc" data-ob-anchor="curseur">
          <h2>Degré de priorité</h2>
          <div className="etoiles-grand" aria-hidden="true">{ETOILES(seuil)}</div>
          <input
            type="range" min="1" max="5" step="1" value={seuil}
            onChange={(e) => setSeuil(Number(e.target.value))}
            aria-label="Niveau de priorité minimal"
            className="curseur"
          />
          <div className="curseur-reperes"><span>toutes</span><span>priorité maximale</span></div>
          <div className="compteur">
            <b>{retenus.length}</b> sous-bassin{retenus.length > 1 ? 's' : ''} sur {unites.length}
            <span> · {nombre(surfaceRetenue, 0)} km², soit {nombre((100 * surfaceRetenue) / surfaceTotale, 0)} % du secteur</span>
          </div>
        </div>

        {/* ── Deux échelles de lecture ── */}
        <div className="volets" role="group" aria-label="Échelle de lecture">
          <button className={`volet${niveau === 'bassin' ? ' on' : ''}`} onClick={() => setNiveau('bassin')}>
            <span className="volet-texte">
              <span className="volet-phase">Échelle du bassin</span>
              <span className="volet-titre">Sous-bassins versants</span>
            </span>
          </button>
          <button className={`volet${niveau === 'agricole' ? ' on' : ''}`} onClick={() => setNiveau('agricole')}>
            <span className="volet-texte">
              <span className="volet-phase">Échelle opérationnelle</span>
              <span className="volet-titre">Milieu agricole</span>
            </span>
          </button>
        </div>

        {/* ── Lecture selon l'échelle ── */}
        {niveau === 'bassin' ? (
          <div className="bloc">
            <h2>Classement des sous-bassins</h2>
            <ol className="classement">
              {unites.map((u) => (
                <li
                  key={u.id}
                  className={`${u.etoiles >= seuil ? '' : 'faible'}${u.id === choix ? ' choisi' : ''}`}
                >
                  <button onClick={() => setChoix(u.id === choix ? null : u.id)}>
                    <span className="nom">{u.nom}</span>
                    <span className="et">{ETOILES(u.etoiles)}</span>
                    <b>{nombre(u.note)}</b>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="bloc">
            <h2>Secteurs agricoles prioritaires</h2>
            <p className="aide">
              Dans les {retenus.length} sous-bassins retenus : <b className="mono">{secteursRetenus.length}</b>{' '}
              secteurs de 400 m de côté, classés au sein de chaque sous-bassin ; <b className="mono">{nombre(haSecteurs, 0)}</b> ha de surface agricole
              utile hors espaces inéligibles.
            </p>
            <table className="grille">
              <thead><tr><th>Critère</th><th className="note">Coef.</th></tr></thead>
              <tbody>
                {criteres.map((c) => (
                  <tr key={c.cle} title={c.lecture}>
                    <td>{c.libelle}<div className="petit">{c.lecture}</div></td>
                    <td className="note">{c.poids}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {fiche && (
              <div className="detail">
                <h3>Secteur sélectionné · {fiche.sb}</h3>
                <table className="fiche">
                  <tbody>
                    <tr><th>Surface agricole</th><td><b>{nombre(fiche.ha)}</b> ha</td></tr>
                    <tr><th>Distance au cours d'eau</th><td><b>{nombre(fiche.dist_eau_m, 0)}</b> m</td></tr>
                    <tr><th>Pente inférieure à 10 %</th><td><b>{nombre(fiche.pente10, 0)}</b> %</td></tr>
                    <tr><th>Terres arables</th><td><b>{nombre(fiche.ta, 0)}</b> %</td></tr>
                    <tr><th>Cultures permanentes</th><td><b>{nombre(fiche.cp, 0)}</b> %</td></tr>
                    <tr><th>Note</th><td><b>{nombre(fiche.note)}</b> / 100 · <span className="et">{ETOILES(fiche.etoiles)}</span></td></tr>
                    <tr><th>Rang dans le sous-bassin</th><td><b>{fiche.rang}</b> sur {fiche.n_sb}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Fiche d'un sous-bassin : pourquoi ce classement ── */}
        {unite && (
          <div className="bloc detail">
            <h2>{unite.id} · {unite.nom}</h2>
            <div className="synthese">
              <span><b>{nombre(unite.note)}</b> / 100</span>
              <span>rang {unite.rang} sur {unites.length}</span>
              <span className="et">{ETOILES(unite.etoiles)}</span>
            </div>
            <table className="grille">
              <tbody>
                {grille.familles.map((f) => (
                  <React.Fragment key={f.cle}>
                    <tr className="famille">
                      <td>{f.libelle}<div className="petit">coefficient {f.poids}</div></td>
                      <td className="note"><Barre valeur={unite['f_' + f.cle]} /> {nombre(unite['f_' + f.cle], 0)}</td>
                    </tr>
                    {f.indicateurs.map((i) => (
                      <tr key={i.cle} className="indic" title={i.lecture}>
                        <td className="petit">{i.libelle}</td>
                        <td className="petit valeur">{nombre(unite[i.cle], i.unite.startsWith('indice') ? 1 : 1)} <em>{i.unite}</em></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Grille de notation ── */}
        <div className="bloc" data-ob-anchor="grille">
          <h2>Grille de notation</h2>
          <p className="aide">
            Quatre familles, douze indicateurs. Chaque indicateur est ramené à une note de 0 à 100 entre les valeurs
            extrêmes du secteur ; la note globale pondère les familles.
          </p>
          <button className="lien-bloc" onClick={() => setGrilleOuverte((o) => !o)} aria-expanded={grilleOuverte}>
            {grilleOuverte ? 'Masquer la grille' : 'Consulter la grille'}
          </button>
          {grilleOuverte && (
            <table className="grille grille-detail">
              <thead>
                <tr><th>Famille et indicateur</th><th className="note">Coef.</th></tr>
              </thead>
              <tbody>
                {grille.familles.map((f) => (
                  <React.Fragment key={f.cle}>
                    <tr className="famille">
                      <td>{f.libelle}<div className="petit">{f.question}</div></td>
                      <td className="note">{f.poids}</td>
                    </tr>
                    {f.indicateurs.map((i) => (
                      <tr key={i.cle} className="indic">
                        <td className="petit">
                          <b>{i.libelle}</b> <em>({i.unite})</em>
                          <div>{i.lecture}</div>
                          <div className="source">Source : {i.source}</div>
                        </td>
                        <td />
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Export ── */}
        <div className="bloc" data-ob-anchor="export">
          <h2>Export</h2>
          <div className="exports">
            <a href={`${base}data/sous_bassins.geojson`} download>Sous-bassins classés, GeoJSON pour QGIS</a>
            <a href={`${base}data/sous_bassins.csv`} download>Grille et notes par sous-bassin, tableur</a>
            <a href={`${base}data/secteurs.geojson`} download>Secteurs agricoles notés, GeoJSON</a>
            <a href={`${base}data/inegibles.geojson`} download>Espaces inéligibles, GeoJSON</a>
            <a href={`${base}data/traitements.zip`} download>Chaîne de traitement, scripts versionnés</a>
            <button className="lien" onClick={() => setApropos(true)}>Sources et cadre de la démonstration</button>
          </div>
        </div>

        <div className="mention">
          Démonstration de méthode sur données ouvertes, proposée à titre d'exemple. Les pondérations de la grille
          sont arrêtées avec le maître d'ouvrage.
          <br />Carte 42 · consultation du SMRD
        </div>
      </aside>

      <main className="carte">
        <div className="selecteur-themes" data-ob-anchor="fonds">
          {Object.entries(FONDS).map(([cle, f]) => (
            <button key={cle} className={`theme${fond === cle ? ' on' : ''}`} onClick={() => setFond(cle)}>
              {f.libelle}
            </button>
          ))}
          <button className={`theme${exclusions ? ' on' : ''}`} onClick={() => setExclusions((e) => !e)}>
            Espaces inéligibles
          </button>
        </div>

        <MapView
          donnees={donneesCarte}
          niveau={niveau} seuil={seuil} choix={choix} onChoix={surChoix}
          secteur={secteur} onSecteur={surSecteur} exclusions={exclusions} fond={fond} cadre={cadre}
        />

        <div className="legende">
          <div className="legende-titre">{niveau === 'bassin' ? 'Priorité des sous-bassins' : 'Priorité des secteurs'}</div>
          <div className="legende-bandes">
            {classes.map((c, i) => <span key={i} style={{ background: c }} />)}
          </div>
          <div className="legende-bornes"><span>1 ★</span><span>5 ★</span></div>
          <div className="legende-classes">
            {niveau === 'bassin' ? "Cinq classes d'effectifs voisins" : 'Cinq classes au sein de chaque sous-bassin'}
          </div>
          {exclusions && (
            <ul className="legende-excl">
              {Object.values(EXCLUSIONS).map((e) => (
                <li key={e.libelle}><i style={{ background: e.couleur }} />{e.libelle}</li>
              ))}
            </ul>
          )}
          <div className="legende-trait"><i className="trait-secteur" />Secteur de démonstration</div>
          <div className="legende-trait"><i className="trait-bassin" />Bassin de la Drôme</div>
        </div>
      </main>

      <Onboarding onDemarrer={() => setCadre('secteur')} emprise={emprise} />
      {apropos && <Apropos donnees={donnees} onFermer={() => setApropos(false)} />}
    </div>
  )
}
