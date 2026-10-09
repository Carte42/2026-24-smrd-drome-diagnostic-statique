"""Outils communs aux chaînes de traitement de la démonstration.

Tout le calcul est fait en RGF93 / Lambert-93 (EPSG:2154). Les couches sont
téléchargées une fois, mises en cache dans `sources/`, et rejouées depuis le
cache : relancer une étape ne réinterroge pas les services.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import geopandas as gpd
import requests

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RACINE = Path(__file__).resolve().parent
SOURCES = RACINE / "sources"
TRAVAIL = RACINE / "travail"
PUBLIC = RACINE.parent / "public" / "data"
for d in (SOURCES, TRAVAIL, PUBLIC):
    d.mkdir(parents=True, exist_ok=True)

CRS = "EPSG:2154"
AGENT = {"User-Agent": "Carte42/1.0 (+https://carte42.fr ; contact@carte42.fr)"}
WFS = "https://data.geopf.fr/wfs/ows"
WMS = "https://data.geopf.fr/wms-r/wms"

# Couches IGN utilisées : toutes en accès libre, listées à l'annexe 1 du CCTP
# ou équivalentes.
COUCHES = {
    "cours_d_eau": "BDTOPO_V3:cours_d_eau",
    "troncons": "BDTOPO_V3:troncon_hydrographique",
    "surfaces_eau": "BDTOPO_V3:surface_hydrographique",
    "details_eau": "BDTOPO_V3:detail_hydrographique",
    "batiments": "BDTOPO_V3:batiment",
    "routes": "BDTOPO_V3:troncon_de_route",
    "communes": "BDTOPO_V3:commune",
    "rpg": "IGNF_RPG_PARCELLES-AGRICOLES-CATEGORISEES_2024:parcelles_agricole_categorisees_2024",
}


def _decoder(contenu: bytes) -> dict:
    """Le service répond en UTF-8 ; certaines passerelles en ISO-8859-1."""
    try:
        return json.loads(contenu.decode("utf-8"))
    except UnicodeDecodeError:
        return json.loads(contenu.decode("latin-1"))


def telecharger(nom: str, bbox: tuple[float, float, float, float],
                cql: str | None = None, pas: int = 4000) -> gpd.GeoDataFrame:
    """Couche WFS de la Géoplateforme sur une emprise Lambert-93, avec cache.

    Les réponses sont paginées : le service plafonne le nombre d'objets par
    requête, et une couche tronquée en silence fausserait tous les ratios.
    """
    couche = COUCHES.get(nom, nom)
    cle = hashlib.sha1(f"{couche}|{bbox}|{cql}".encode()).hexdigest()[:12]
    fichier = SOURCES / f"{nom}_{cle}.gpkg"
    if fichier.exists():
        return gpd.read_file(fichier)

    morceaux = []
    debut = 0
    while True:
        params = {
            "SERVICE": "WFS", "VERSION": "2.0.0", "REQUEST": "GetFeature",
            "TYPENAMES": couche, "OUTPUTFORMAT": "application/json",
            "SRSNAME": CRS, "COUNT": pas, "STARTINDEX": debut,
            "BBOX": ",".join(f"{v:.1f}" for v in bbox) + ",urn:ogc:def:crs:EPSG::2154",
        }
        if cql:
            params["CQL_FILTER"] = cql
            params.pop("BBOX")
        r = requests.get(WFS, params=params, headers=AGENT, timeout=300)
        r.raise_for_status()
        entites = _decoder(r.content).get("features", [])
        if not entites:
            break
        morceaux.append(gpd.GeoDataFrame.from_features(entites, crs=CRS))
        if len(entites) < pas:
            break
        debut += pas
    if morceaux:
        gdf = gpd.pd.concat(morceaux, ignore_index=True)
        gdf = gpd.GeoDataFrame(gdf, geometry="geometry", crs=CRS)
    else:
        gdf = gpd.GeoDataFrame({"geometry": []}, geometry="geometry", crs=CRS)
    # Géométries exportées en 2D : les couches IGN portent parfois une altitude.
    gdf["geometry"] = gdf.geometry.force_2d()
    gdf.to_file(fichier, driver="GPKG")
    print(f"    {nom:<13} {len(gdf):>6} objets  ({couche})")
    return gdf
