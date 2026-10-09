"""Étape 6 — Couches de situation : bassin de la Drôme, communes, cours d'eau.

La démonstration traite le bassin de la Gervanne. Ces couches situent ce secteur
dans le bassin versant de la Drôme tout entier, que la démonstration ne traite
pas : bassin, communes qu'il recouvre, cours d'eau principaux.

Sorties : `public/data/bassin_drome.geojson`, `bassin_gervanne.geojson`,
`communes_bassin.geojson`, `reseau_principal.geojson`, `emprise.json`.
Usage : python 06_emprise.py
"""
from __future__ import annotations

import json

import geopandas as gpd

from common import CRS, PUBLIC, TRAVAIL, telecharger


def ecrire(gdf: gpd.GeoDataFrame, nom: str, simplification: float, colonnes: list[str]) -> None:
    web = gdf[colonnes + ["geometry"]].copy()
    web["geometry"] = web.geometry.simplify(simplification).to_crs(4326)
    web["geometry"] = web.geometry.set_precision(1e-5)
    (PUBLIC / f"{nom}.geojson").write_text(web.to_json(drop_id=True), encoding="utf-8")
    print(f"    {nom:<20} {len(web):>4} objets, {(PUBLIC / (nom + '.geojson')).stat().st_size / 1024:.0f} Ko")


def main() -> None:
    print("Étape 6 — couches de situation")
    drome = gpd.read_file(TRAVAIL / "bassin_drome.gpkg")
    gerv = gpd.read_file(TRAVAIL / "bassin.gpkg")
    zone = drome.geometry.iloc[0]
    bbox = tuple(drome.buffer(2000).total_bounds)

    # Communes dont un cinquième au moins de la surface est dans le bassin.
    communes = telecharger("communes", bbox)
    communes["part"] = communes.intersection(zone).area / communes.area
    dans = communes[communes["part"] >= 0.2].copy()
    dans = dans.rename(columns={"nom_officiel": "nom"})
    print(f"    communes dont au moins un cinquième est dans le bassin : {len(dans)}")

    # Réseau : cours d'eau nommés de la BD TOPO, dans le bassin.
    ce = telecharger("cours_d_eau", bbox)
    ce = ce[ce.intersects(zone) & ce["toponyme"].notna()].copy()
    ce["importance"] = ce["importance"].astype(int)
    principal = ce.copy()
    principal["geometry"] = principal.geometry.clip(zone)
    principal = principal[~principal.is_empty].rename(columns={"toponyme": "nom"})
    print("    cours d'eau par importance :", ce["importance"].value_counts().sort_index().to_dict())

    ecrire(drome, "bassin_drome", 60, ["nom", "surface_km2"])
    ecrire(gerv, "bassin_gervanne", 15, ["nom", "surface_km2"])
    ecrire(dans, "communes_bassin", 40, ["nom"])
    ecrire(principal, "reseau_principal", 40, ["nom", "importance"])

    meta = {
        "bassin_drome_km2": float(drome.surface_km2.iloc[0]),
        "bassin_drome_km2_cctp": 1666,
        "communes_bassin": int(len(dans)),
        "communes_cctp": 80,
        "bassin_gervanne_km2": float(gerv.surface_km2.iloc[0]),
        "communes_gervanne": int((communes.intersection(gerv.geometry.iloc[0]).area / communes.area >= 0.1).sum()),
    }
    (PUBLIC / "emprise.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print("   ", meta)


if __name__ == "__main__":
    main()
