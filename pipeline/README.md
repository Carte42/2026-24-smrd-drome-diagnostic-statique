# Chaîne de traitement

Tout est calculé en RGF93 / Lambert-93 (EPSG:2154). Les scripts s'exécutent dans l'ordre de leur numéro. Chacun lit ce que le précédent a écrit ; aucun n'a besoin d'identifiant, toutes les sources sont ouvertes.

| Script | Rôle | Sortie |
|---|---|---|
| `common.py` | Chemins, téléchargement WFS paginé avec cache | — |
| `01_bassin.py` | MNT RGE ALTI au pas de 25 m, bassin de la Gervanne délimité depuis son exutoire | `travail/mnt25.tif`, `bassin.gpkg` |
| `01b_emprise_drome.py` | Bassin de la Drôme au pas de 100 m, comparé à la surface du CCTP | `travail/bassin_drome.gpkg` |
| `02_sous_bassins.py` | Réseau par accumulation de flux, découpage en 13 unités, relief (pente, indice d'humidité) | `travail/sous_bassins.gpkg`, `relief.npz` |
| `03_couches.py` | Couches IGN du secteur (BD TOPO, RPG 2024), en cache | `sources/*.gpkg` |
| `04_indicateurs.py` | Grille multicritères, notes, priorité par sous-bassin | `public/data/sous_bassins.*`, `grille.json` |
| `05_secteurs.py` | Espaces inéligibles, secteurs agricoles notés | `public/data/inegibles.geojson`, `secteurs.*` |
| `06_emprise.py` | Couches de situation : bassin de la Drôme, communes, réseau | `public/data/bassin_*.geojson`, `communes_bassin.geojson`, `reseau_principal.geojson`, `emprise.json` |
| `07_publier.py` | Archive des scripts et inventaire des fichiers servis | `public/data/traitements.zip`, `fichiers.json` |

## Exécuter

```bash
pip install geopandas rasterio pyogrio shapely numpy pandas requests pysheds numba
cd pipeline
python 01_bassin.py && python 01b_emprise_drome.py && python 02_sous_bassins.py
python 04_indicateurs.py && python 05_secteurs.py && python 06_emprise.py && python 07_publier.py
```

Le premier lancement télécharge une dizaine de mégaoctets de relief et de couches, mis en cache dans `sources/` et `travail/`.

## Méthode

**Sous-bassins.** Le réseau est extrait de l'accumulation de flux. À chaque confluence où les deux branches drainent 5 km² au moins, chaque branche devient une unité, et le tronçon aval qui suit en devient une autre. Les unités de moins de 3 km² rejoignent le voisin avec lequel elles partagent la plus longue limite.

**Notation.** Chaque indicateur est ramené de 0 à 100 entre les valeurs extrêmes du secteur (sens inversé si une valeur faible est favorable). La note d'une famille est la moyenne de ses indicateurs ; la note globale pondère les familles (30, 25, 25, 20). La priorité est un rang de une à cinq étoiles, en cinq classes d'effectifs voisins.

**Secteurs agricoles.** La surface agricole utile du RPG 2024, ôtée des espaces inéligibles, est découpée en mailles de 400 m. Une maille est conservée à partir de 3 ha. Trois critères : distance au cours d'eau permanent (40), potentiel d'infiltration (35), pression (25).

## Validation

- Surface délimitée du bassin de la Drôme : 1 644 km², contre 1 666 km² au CCTP (écart de 1,3 %).
- Le découpage a été contrôlé à l'œil sur un fond hydrographique : unités contiguës, sans recouvrement, sans fragment isolé.
- Les sommes de surfaces des 13 unités égalent la surface du bassin de la Gervanne.
