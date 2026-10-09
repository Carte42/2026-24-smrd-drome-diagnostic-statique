"""Étape 3 — Téléchargement des couches ouvertes sur le secteur.

Toutes les couches viennent de la Géoplateforme de l'IGN (BD TOPO, Registre
parcellaire graphique 2024) et sont rejouées depuis le cache. Le tampon de
500 m évite qu'un objet à cheval sur la limite du bassin soit coupé.

Usage : python 03_couches.py
"""
from __future__ import annotations

import geopandas as gpd

from common import CRS, TRAVAIL, telecharger


def charger() -> dict[str, gpd.GeoDataFrame]:
    bassin = gpd.read_file(TRAVAIL / "bassin.gpkg")
    bbox = tuple(bassin.buffer(500).total_bounds)
    return {nom: telecharger(nom, bbox) for nom in
            ("troncons", "surfaces_eau", "details_eau", "batiments", "routes", "communes", "rpg")}


def main() -> None:
    print("Étape 3 — couches ouvertes du secteur")
    couches = charger()
    bassin = gpd.read_file(TRAVAIL / "bassin.gpkg").geometry.iloc[0]
    for nom, g in couches.items():
        dedans = g[g.intersects(bassin)]
        print(f"    {nom:<13} {len(dedans):>6} dans le bassin")
    rpg = couches["rpg"]
    print("    RPG, catégories de cultures :", rpg["cat_cult_p"].value_counts().to_dict())
    print("    troncons, persistance :", couches["troncons"]["persistance"].value_counts().to_dict())
    print("    routes, nature :", couches["routes"]["nature"].value_counts().to_dict())
    if len(couches["details_eau"]):
        print("    details d'eau, nature :", couches["details_eau"]["nature"].value_counts().to_dict())


if __name__ == "__main__":
    main()
