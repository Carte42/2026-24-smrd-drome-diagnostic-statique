# Disponibilité des données ouvertes — vérifiée le 9 octobre 2026

Vérification faite en interrogeant directement les services de la Géoplateforme de l'IGN, pas d'après de la documentation. Chaque ligne a été testée sur le bassin de la Gervanne.

| Couche | Service | Résultat sur le secteur |
|---|---|---|
| `BDTOPO_V3:troncon_hydrographique` | WFS `data.geopf.fr/wfs/ows` | 3 394 tronçons, dont 622 permanents ; attributs de nature, de persistance et d'origine |
| `BDTOPO_V3:detail_hydrographique` | idem | 222 objets : sources, sources captées, résurgences, fontaines, cascades |
| `BDTOPO_V3:surface_hydrographique` | idem | 191 surfaces |
| `BDTOPO_V3:batiment` | idem | 6 692 bâtiments |
| `BDTOPO_V3:troncon_de_route` | idem | 8 218 tronçons : routes, chemins, sentiers |
| `BDTOPO_V3:commune` | idem | 28 communes sur l'emprise de travail |
| `IGNF_RPG_PARCELLES-AGRICOLES-CATEGORISEES_2024` | idem | 4 266 parcelles : prairies permanentes, terres arables, cultures permanentes |
| `ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES` | WMS `data.geopf.fr/wms-r/wms`, format `image/x-bil;bits=32` | altitudes en flottants, interrogées par tuiles |
| `GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2`, `ORTHOIMAGERY.ORTHOPHOTOS` | WMTS | fonds de plan |

## Points relevés pendant la vérification

- Le Registre parcellaire graphique est diffusé en 2024 et en 2025 sous des noms de couche distincts ; le CCTP désigne l'édition 2024, retenue ici.
- L'attribut `fosse` du tronçon hydrographique est faux pour l'ensemble des 3 394 tronçons du secteur : les fossés ne sont pas distingués dans la BD TOPO sur ce territoire. L'indicateur de densité de fossés initialement envisagé a été remplacé par la part des cultures permanentes.
- L'occupation du sol à grande échelle n'a pas été retenue : le service vectoriel (WFS) de la Géoplateforme n'en expose que l'édition du Gers. Les surfaces artificialisées sont estimées à partir des bâtiments et des routes revêtues.

## Non interrogé dans la démonstration

Les couches du maître d'ouvrage et celles d'autres producteurs listées à l'annexe 1 du CCTP (état des masses d'eau, zones humides, captages et périmètres de protection, irrigation, drainage, pédologie, géologie, étiage, suivis) n'ont pas été interrogées. Elles seront intégrées à la grille dans le cadre du marché.

## Étapes de contrôle du traitement

- Bassin de la Drôme : 1 644 km² délimités sur un MNT au pas de 100 m, contre 1 666 km² donnés par le CCTP (écart de 1,3 %).
- Bassin de la Gervanne : 151,8 km² délimités sur le MNT à 25 m ; somme des 13 sous-bassins égale à 151,9 km².
- Communes recouvrant au moins un cinquième du bassin de la Drôme : 78, contre 80 au périmètre du SAGE (1 810 km²).
