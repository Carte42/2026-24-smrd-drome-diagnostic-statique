"""Étape 1 bis — Emprise générale : le bassin versant de la Drôme.

La démonstration traite un secteur. L'emprise générale ne sert qu'à le situer :
le bassin de la Drôme est délimité sur un MNT au pas de 100 m, depuis la
confluence avec le Rhône. La surface obtenue est comparée à celle que donne le
CCTP (1 666 km²), ce qui vérifie le calage de l'exutoire.

Sorties dans `travail/` : `mnt100.tif`, `bassin_drome.gpkg`.
Usage : python 01b_emprise_drome.py
"""
from __future__ import annotations

import numpy as np
import requests
import rasterio
import geopandas as gpd
from rasterio.features import shapes
from rasterio.transform import from_origin
from shapely.geometry import LineString, Point, shape
from shapely.ops import linemerge
from pysheds.grid import Grid

from common import AGENT, CRS, TRAVAIL, WMS, telecharger

if not hasattr(np, "in1d"):
    np.in1d = np.isin

EMPRISE = (832000.0, 6368000.0, 940000.0, 6428000.0)
PIXEL = 100.0
MNT = TRAVAIL / "mnt100.tif"
SURFACE_CCTP_KM2 = 1666.0


def mnt() -> None:
    if MNT.exists():
        return
    x0, y0, x1, y1 = EMPRISE
    nx, ny = int((x1 - x0) / PIXEL), int((y1 - y0) / PIXEL)
    mosaique = np.full((ny, nx), np.nan, dtype="float32")
    pas = 200  # tuiles de 20 km
    for j in range(0, ny, pas):
        for i in range(0, nx, pas):
            w, h = min(pas, nx - i), min(pas, ny - j)
            bx0, by1 = x0 + i * PIXEL, y1 - j * PIXEL
            bbox = (bx0, by1 - h * PIXEL, bx0 + w * PIXEL, by1)
            r = requests.get(WMS, headers=AGENT, timeout=120, params={
                "SERVICE": "WMS", "VERSION": "1.3.0", "REQUEST": "GetMap",
                "LAYERS": "ELEVATION.ELEVATIONGRIDCOVERAGE.HIGHRES", "STYLES": "",
                "CRS": "EPSG:2154", "BBOX": ",".join(map(str, bbox)),
                "WIDTH": w, "HEIGHT": h, "FORMAT": "image/x-bil;bits=32"})
            r.raise_for_status()
            t = np.frombuffer(r.content, dtype="<f4").reshape(h, w).copy()
            t[t < -1000] = np.nan
            mosaique[j:j + h, i:i + w] = t
    with rasterio.open(MNT, "w", driver="GTiff", height=ny, width=nx, count=1,
                       dtype="float32", crs=CRS, transform=from_origin(x0, y1, PIXEL, PIXEL),
                       nodata=-9999.0) as dst:
        dst.write(np.where(np.isnan(mosaique), -9999.0, mosaique), 1)


def main() -> None:
    print("Étape 1 bis — bassin versant de la Drôme (emprise générale)")
    mnt()
    ce = telecharger("cours_d_eau", (832000, 6385000, 940000, 6425000),
                     cql="strToLowerCase(\"toponyme\") = 'la drôme'")
    lignes = [g for g in ce.geometry.explode(index_parts=False) if g.geom_type == "LineString"]
    ligne = linemerge(lignes)
    if ligne.geom_type != "LineString":
        ligne = max(ligne.geoms, key=lambda g: g.length)
    # L'aval est l'extrémité la plus à l'ouest (le Rhône est à l'ouest du bassin).
    if ligne.coords[0][0] > ligne.coords[-1][0]:
        ligne = LineString(list(ligne.coords)[::-1])
    amont = ligne.interpolate(2500.0)

    grille = Grid.from_raster(str(MNT))
    z = grille.read_raster(str(MNT))
    z = grille.resolve_flats(grille.fill_depressions(grille.fill_pits(z)))
    fdir = grille.flowdir(z)
    acc = grille.accumulation(fdir)
    xs, ys = grille.snap_to_mask(acc > 300, (amont.x, amont.y))
    bassin = np.asarray(grille.catchment(x=xs, y=ys, fdir=fdir, xytype="coordinate")).astype("uint8")
    polys = [shape(g) for g, v in shapes(bassin, mask=bassin == 1, transform=grille.affine) if v == 1]
    contour = gpd.GeoSeries(polys, crs=CRS).union_all().buffer(PIXEL).buffer(-PIXEL).simplify(PIXEL)
    gdf = gpd.GeoDataFrame({"nom": ["Bassin versant de la Drôme"]}, geometry=[contour], crs=CRS)
    gdf["surface_km2"] = round(gdf.area.iloc[0] / 1e6, 0)
    gdf.to_file(TRAVAIL / "bassin_drome.gpkg", driver="GPKG")
    s = gdf.surface_km2.iloc[0]
    print(f"    surface délimitée : {s:.0f} km² — CCTP : {SURFACE_CCTP_KM2:.0f} km² (écart {100*(s/SURFACE_CCTP_KM2-1):+.1f} %)")
    print(f"    exutoire calé : {xs:.0f}, {ys:.0f}")


if __name__ == "__main__":
    main()
