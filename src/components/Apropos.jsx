import React, { useEffect } from 'react'
import { nombre } from '../config.js'

const base = import.meta.env.BASE_URL

const SOURCES = [
  ['BD TOPO — tronçons hydrographiques, détails hydrographiques, bâtiments, routes, communes', 'IGN, Géoplateforme', 'Indicateurs A1 à A3, B1, D2 ; espaces inéligibles'],
  ['Registre parcellaire graphique 2024, parcelles agricoles catégorisées', 'IGN, Géoplateforme', 'Indicateurs B2, B3, C3, D1, D3 ; secteurs agricoles'],
  ['RGE ALTI, rééchantillonné à 25 m', 'IGN, Géoplateforme (service WMS)', 'Sous-bassins, pente, indice d\'humidité topographique'],
  ['Plan IGN et orthophotographies', 'IGN, Géoplateforme (service WMTS)', 'Fonds de plan'],
]

export default function Apropos({ donnees, onFermer }) {
  const { emprise, fichiers } = donnees

  useEffect(() => {
    const touche = (e) => e.key === 'Escape' && onFermer()
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [onFermer])

  const octets = (n) => (n > 1024 * 1024 ? `${nombre(n / 1048576)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`)

  return (
    <div className="voile" onClick={onFermer}>
      <div className="panneau-sources" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Sources et cadre de la démonstration">
        <div className="panneau-tete">
          <h2>Sources et cadre de la démonstration</h2>
          <button className="fermer" onClick={onFermer} aria-label="Fermer">×</button>
        </div>
        <div className="panneau-corps">
          <section>
            <h3>But de la démonstration</h3>
            <p className="aide">
              Montrer la méthode de Carte 42 et un exemple des résultats qu'elle permet d'obtenir. Cette interface n'est
              pas un résultat du marché : elle illustre, sur un seul secteur, ce que produisent les trois phases du cahier
              des clauses techniques, de la définition du cadre de travail jusqu'au diagnostic du milieu agricole.
            </p>
          </section>

          <section>
            <h3>Secteur et emprise</h3>
            <p className="aide">
              Le secteur traité est le bassin de la Gervanne, affluent de la Drôme : {nombre(emprise.bassin_gervanne_km2, 0)} km²,
              {donnees.sousBassins.features.length} sous-bassins versants, {emprise.communes_gervanne} communes concernées. Le contour en pointillés situe le
              bassin versant de la Drôme, délimité sur le modèle numérique de terrain depuis la confluence avec le Rhône :
              {' '}{nombre(emprise.bassin_drome_km2, 0)} km², contre {nombre(emprise.bassin_drome_km2_cctp, 0)} km² au cahier
              des clauses techniques, soit un écart de {nombre(100 * (emprise.bassin_drome_km2 / emprise.bassin_drome_km2_cctp - 1) * -1)} %.
              Le bassin de la Gervanne est délimité par la même méthode, depuis sa confluence avec la Drôme.
            </p>
          </section>

          <section>
            <h3>Ce que la démonstration reproduit</h3>
            <dl>
              <dt>Découpage</dt><dd>Le bassin est divisé en unités hydrographiques contiguës, à partir du modèle numérique de terrain.</dd>
              <dt>Espaces inéligibles</dt><dd>Pente supérieure à 25 %, bâti et routes revêtues, surfaces en eau : cartographiés avant tout classement.</dd>
              <dt>Grille multicritères</dt><dd>Quatre familles, douze indicateurs, une note globale et un niveau de priorité de une à cinq étoiles par sous-bassin.</dd>
              <dt>Milieu agricole</dt><dd>Surface agricole utile hors espaces inéligibles, découpée en secteurs de 400 m et notée sur trois critères.</dd>
              <dt>Restitution</dt><dd>Couches SIG, grille en tableur et chaîne de traitement, partageables entre partenaires.</dd>
            </dl>
          </section>

          <section>
            <h3>Cadre de la démonstration</h3>
            <dl>
              <dt>Pondérations</dt><dd>Les coefficients de la grille et les seuils de pente et de distance sont proposés à titre d'exemple. Ils sont arrêtés avec le maître d'ouvrage en comité technique, comme le prévoit le cahier des clauses techniques.</dd>
              <dt>Données</dt><dd>Données ouvertes uniquement. Les couches du maître d'ouvrage (irrigation, drainage, canaux, périmètres de captage) sont mobilisées dans le marché, non ici.</dd>
              <dt>Modélisation</dt><dd>Aucune modélisation hydraulique : le diagnostic repose sur des traitements simples de données SIG, comme le demande le cahier des clauses techniques.</dd>
              <dt>Relief</dt><dd>Modèle numérique de terrain au pas de 25 m.</dd>
            </dl>
          </section>

          <section>
            <h3>Sources, téléchargées le 9 octobre 2026</h3>
            <dl>
              {SOURCES.map(([couche, producteur, usage]) => (
                <React.Fragment key={couche}>
                  <dt>{producteur}</dt>
                  <dd>{couche}<br /><span className="petit">{usage}</span></dd>
                </React.Fragment>
              ))}
            </dl>
          </section>

          {fichiers && (
            <section className="inventaire">
              <h3>Fichiers servis</h3>
              {Object.entries(fichiers.familles).map(([cle, titre]) => (
                <div key={cle}>
                  <h4>{titre}</h4>
                  <ul>
                    {fichiers.fichiers.filter((f) => f.famille === cle).map((f) => (
                      <li key={f.chemin}>
                        <a href={`${base}${f.chemin}`} download>{f.nom}</a>{' '}
                        <span className="poids">{octets(f.octets)}</span> — {f.legende}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
