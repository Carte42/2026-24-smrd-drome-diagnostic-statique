"""Étape 1 — Emprise : bassin versant de la Gervanne délimité sur le MNT.

Le secteur de démonstration est le bassin de la Gervanne, affluent de la Drôme.
Son contour n'est pas repris d'une couche existante : il est délimité sur le
modèle numérique de terrain de l'IGN (RGE ALTI), à partir de l'exutoire de la
Gervanne dans la Drôme. C'est la première opération de la phase 1 du CCTP, à
échelle réduite.

Sorties dans `travail/` : `mnt25.tif`, `bassin.gpkg`.
Usage : python 01_bassin.py
"""
from __future__ import annotations

import numpy as np
import rasterio
import requests
from rasterio.features import shapes
from rasterio.transform import from_origin
import geopandas as gpd
from shapely.geometry import LineString, Point, shape
from shapely.ops import linemerge
from pysheds.grid import Grid

from common import AGENT, CRS, TRAVAIL, WMS, telecharger

# pysheds 0.5 appelle np.in1d, retirée de numpy 2.4 : np.isin en est l'équivalent.
if not hasattr(np, "in1d"):
    np.in1d = np.isin

# Emprise de travail, large, en Lambert-93. Elle contient tout le bassin ; le
# contrôle en fin de script vérifie que le bassin n'en touche pas le bord.
EMPRISE = (853000.0, 6396000.0, 890000.0, 6432000.0)
PIXEL = 25.0
# Exutoire de la Gervanne dans la Drôme, repéré sur le tracé de la couche
# « cours d'eau » de la BD TOPO (extrémité aval du linéaire « la Gervanne »).
EXUTOIRE = (865238.0, 6403256.0)
MNT = TRAVAIL / "mnt25.tif"


def mnt(emprise=EMPRISE, pixel=PIXEL, cote_tuile=5000.0) -> None:
    """Mosaïque d'altitudes RGE ALTI au pas de `pixel` mètres, par tuiles."""
    if MNT.exists():
        return
    x0, y0, x1, y1 = emprise
    nx = int(round((x1 - x0) / pixel))
    ny = int(round((y1 - y0) / pixel))
    mosaique = np.full((ny, nx), np.nan, dtype="float32")
    pas = int(round(cote_tuile / pixel))
    for j in range(0, ny, pas):
        for i in range(0, nx, pas):
            w, h = min(pas, nx - i), min(pas, ny - j)
            bx0, by1 = x0 + i * pixel, y1 - j * pixel
            bbox = (bx0, by1 - h * pixel, bx0 + w * pixel, by1)
            r = requests.get(WMS, headers=AGENT, timeout=120, params={
                "SERVICE": "WMS", "VERSION": "1.3.0", "REQUEST": "GetMap",
                "LAYERS": "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES", "STYLES": "",
                "CRS": "EPSG:2154", "BBOX": ",".join(map(str, bbox)),
                "WIDTH": w, "HEIGHT": h, "FORMAT": "image/x-bil;bits=32",
            })
            r.raise_for_status()
            if len(r.content) != w * h * 4:
                raise RuntimeError(f"réponse altimétrique inattendue : {r.text[:200]}")
            tuile = np.frombuffer(r.content, dtype="<f4").reshape(h, w).copy()
            tuile[tuile < -1000] = np.nan
            mosaique[j:j + h, i:i + w] = tuile
        print(f"    MNT : {min(j + pas, ny)}/{ny} lignes")
    with rasterio.open(
        MNT, "w", driver="GTiff", height=ny, width=nx, count=1, dtype="float32",
        crs=CRS, transform=from_origin(x0, y1, pixel, pixel), nodata=-9999.0,
    ) as dst:
        dst.write(np.where(np.isnan(mosaique), -9999.0, mosaique), 1)


def hydrologie():
    """Remplissage des cuvettes, directions d'écoulement, accumulation."""
    grille = Grid.from_raster(str(MNT))
    mnt_brut = grille.read_raster(str(MNT))
    comble = grille.fill_pits(mnt_brut)
    comble = grille.fill_depressions(comble)
    comble = grille.resolve_flats(comble)
    fdir = grille.flowdir(comble)
    acc = grille.accumulation(fdir)
    return grille, mnt_brut, fdir, acc


def main() -> None:
    print("Étape 1 — bassin versant de la Gervanne")
    mnt()
    grille, _, fdir, acc = hydrologie()

    # L'exutoire est pris sur la Gervanne, 700 m en amont de sa confluence : à la
    # confluence même, le calage tombe sur la Drôme et délimiterait son bassin.
    ce = telecharger("cours_d_eau", (EXUTOIRE[0] - 15000, EXUTOIRE[1] - 3000, EXUTOIRE[0] + 25000, EXUTOIRE[1] + 25000))
    ligne = linemerge(list(ce[ce["toponyme"].str.contains("Gervanne", case=False, na=False)].geometry.explode(index_parts=False)))
    if Point(ligne.coords[0]).distance(Point(EXUTOIRE)) > Point(ligne.coords[-1]).distance(Point(EXUTOIRE)):
        ligne = LineString(list(ligne.coords)[::-1])
    amont = ligne.interpolate(700.0)

    # Calage sur la cellule du réseau la plus proche : le tracé vectoriel et le
    # MNT ne se superposent pas au pixel près.
    reseau = acc > 4000  # environ 2,5 km² : rivière, pas ruissellement diffus
    xs, ys = grille.snap_to_mask(reseau, (amont.x, amont.y))
    bassin = grille.catchment(x=xs, y=ys, fdir=fdir, xytype="coordinate")
    masque = np.asarray(bassin).astype("uint8")

    polys = [shape(g) for g, v in shapes(masque, mask=masque == 1, transform=grille.affine) if v == 1]
    contour = gpd.GeoSeries(polys, crs=CRS).union_all()
    contour = contour.buffer(PIXEL).buffer(-PIXEL).simplify(PIXEL / 2)  # lissage de l'escalier
    gdf = gpd.GeoDataFrame({"nom": ["Bassin de la Gervanne"]}, geometry=[contour], crs=CRS)
    gdf["surface_km2"] = (gdf.area / 1e6).round(1)
    gdf.to_file(TRAVAIL / "bassin.gpkg", driver="GPKG")

    minx, miny, maxx, maxy = gdf.total_bounds
    x0, y0, x1, y1 = EMPRISE
    marge = min(minx - x0, miny - y0, x1 - maxx, y1 - maxy)
    print(f"    exutoire calé : {xs:.0f}, {ys:.0f}")
    print(f"    surface du bassin : {gdf.surface_km2.iloc[0]} km²")
    print(f"    emprise : {minx:.0f}-{maxx:.0f} E, {miny:.0f}-{maxy:.0f} N")
    print(f"    marge au bord de l'emprise de travail : {marge/1000:.1f} km", "(OK)" if marge > 500 else "(INSUFFISANTE)")

    # Couches de repère pour l'étape suivante (téléchargement unique, en cache).
    tampon = gdf.buffer(1500).total_bounds
    telecharger("cours_d_eau", tuple(tampon))


if __name__ == "__main__":
    main()
