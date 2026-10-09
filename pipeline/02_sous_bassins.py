"""Étape 2 — Découpage du bassin en sous-bassins versants.

Phase 1 du CCTP, volet « découpage territorial » : diviser le bassin en unités
hydrographiques contiguës, ajustées à la topographie, exploitables en SIG.

Méthode. Le réseau hydrographique est extrait du MNT (accumulation de flux).
À chaque confluence où les deux branches drainent une surface d'au moins `S_MIN`,
chaque branche devient une unité, et le tronçon aval qui suit en devient une
autre. Les petits affluents sont absorbés par l'unité qui les reçoit. Le seuil
`S_MIN` est cherché pour obtenir une quinzaine d'unités, maille comparable
d'une unité à l'autre, adaptée à une analyse comparative.

Sorties : `travail/sous_bassins.gpkg`, `travail/relief.npz` (pente, indice
d'humidité topographique, accumulation).
Usage : python 02_sous_bassins.py
"""
from __future__ import annotations

import importlib

import geopandas as gpd
import numpy as np
from numba import njit
from rasterio.features import rasterize, shapes
from shapely.geometry import shape

from common import CRS, TRAVAIL

b1 = importlib.import_module("01_bassin")

# Directions d'écoulement pysheds : N, NE, E, SE, S, SW, W, NW.
CODES = np.array([64, 128, 1, 2, 4, 8, 16, 32])
DR = np.array([-1, -1, 0, 1, 1, 1, 0, -1])
DC = np.array([0, 1, 1, 1, 0, -1, -1, -1])

CIBLE_UNITES = (12, 16)
SURFACE_MINI_KM2 = 3.0
SEUIL_RESEAU_KM2 = 1.0
CELLULE_KM2 = (b1.PIXEL / 1000.0) ** 2


@njit(cache=True)
def _etiqueter(ordre, fdir, label, dr, dc, codes, nl, nc):
    """Chaque cellule prend l'étiquette de la cellule vers laquelle elle s'écoule,
    sauf si elle est elle-même un exutoire (étiquette déjà posée)."""
    for k in range(ordre.shape[0]):
        r = ordre[k] // nc
        c = ordre[k] % nc
        if label[r, c] != 0:
            continue
        d = fdir[r, c]
        for m in range(8):
            if codes[m] == d:
                r2 = r + dr[m]
                c2 = c + dc[m]
                if 0 <= r2 < nl and 0 <= c2 < nc:
                    label[r, c] = label[r2, c2]
                break


def affluents(fdir, acc, reseau):
    """Pour chaque cellule du réseau : liste de ses cellules amont du réseau."""
    nl, nc = fdir.shape
    amont = {}
    rr, cc = np.nonzero(reseau)
    for r, c in zip(rr, cc):
        for m in range(8):
            r2, c2 = r + DR[m], c + DC[m]
            if 0 <= r2 < nl and 0 <= c2 < nc and reseau[r2, c2]:
                # la cellule voisine s'écoule vers (r, c) si son code est l'opposé
                if fdir[r2, c2] == CODES[(m + 4) % 8]:
                    amont.setdefault((r, c), []).append((r2, c2))
    return amont


def exutoires(amont, acc, s_min_cellules):
    sortie = []
    for (r, c), liste in amont.items():
        gros = [u for u in liste if acc[u] >= s_min_cellules]
        if len(gros) >= 2:
            sortie.extend(gros)
    return sortie


def main() -> None:
    print("Étape 2 — sous-bassins versants")
    b1.mnt()
    grille, mnt_brut, fdir_r, acc_r = b1.hydrologie()
    fdir = np.asarray(fdir_r).astype("int64")
    acc = np.asarray(acc_r).astype("float64")
    nl, nc = fdir.shape

    contour = gpd.read_file(TRAVAIL / "bassin.gpkg")
    dedans = rasterize(
        [(geom, 1) for geom in contour.geometry], out_shape=(nl, nc),
        transform=grille.affine, fill=0, dtype="uint8",
    ).astype(bool)

    reseau = (acc >= SEUIL_RESEAU_KM2 / CELLULE_KM2) & dedans
    amont = affluents(fdir, acc, reseau)

    # Exutoire du bassin : cellule de plus forte accumulation à l'intérieur.
    sortie_bassin = np.unravel_index(np.argmax(np.where(dedans, acc, -1)), acc.shape)

    # Recherche du seuil donnant le nombre d'unités visé.
    choix = None
    for s_min_km2 in (2, 3, 4, 5, 6, 7, 8, 10, 12, 15):
        pts = exutoires(amont, acc, s_min_km2 / CELLULE_KM2)
        pts = [(int(r), int(c)) for r, c in pts if dedans[r, c]]
        n = len(pts) + 1
        print(f"    seuil {s_min_km2:>2} km² : {n} unités")
        if CIBLE_UNITES[0] <= n <= CIBLE_UNITES[1] and choix is None:
            choix = (s_min_km2, pts)
    if choix is None:
        raise SystemExit("aucun seuil ne donne une maille dans la cible : ajuster CIBLE_UNITES")
    s_min_km2, pts = choix
    print(f"    seuil retenu : {s_min_km2} km²")

    label = np.zeros((nl, nc), dtype="int32")
    label[sortie_bassin] = 1
    for i, (r, c) in enumerate(pts, start=2):
        label[r, c] = i
    valides = np.flatnonzero(dedans.ravel())
    ordre = valides[np.argsort(-acc.ravel()[valides], kind="stable")]
    _etiqueter(ordre.astype("int64"), fdir, label, DR, DC, CODES, nl, nc)
    label[~dedans] = 0

    # Vectorisation, une géométrie par unité.
    morceaux = {}
    for geom, v in shapes(label, mask=label > 0, transform=grille.affine):
        morceaux.setdefault(int(v), []).append(shape(geom))
    lignes = []
    for v, geoms in morceaux.items():
        g = gpd.GeoSeries(geoms, crs=CRS).union_all()
        # Lissage : le contour d'une unité suit l'escalier du maillage raster.
        g = g.buffer(b1.PIXEL * 1.5).buffer(-b1.PIXEL * 3).buffer(b1.PIXEL * 1.5).simplify(b1.PIXEL / 2)
        if g.is_empty:
            continue
        lignes.append({"v": v, "geometry": g, "acc_exutoire": float(acc[np.unravel_index(np.argmax(np.where(label == v, acc, -1)), acc.shape)])})
    gdf = gpd.GeoDataFrame(lignes, crs=CRS)

    # Fusion des unités trop petites pour être comparables : elles rejoignent le
    # voisin avec lequel elles partagent la plus longue limite.
    while True:
        gdf["aire"] = gdf.area / 1e6
        petites = gdf[gdf["aire"] < SURFACE_MINI_KM2].sort_values("aire")
        if petites.empty or len(gdf) <= 2:
            break
        i = petites.index[0]
        zone = gdf.at[i, "geometry"].buffer(60)
        voisins = [(j, zone.intersection(gdf.at[j, "geometry"].buffer(60)).area)
                   for j in gdf.index if j != i]
        j = max(voisins, key=lambda t: t[1])[0]
        gdf.at[j, "geometry"] = gdf.at[j, "geometry"].union(gdf.at[i, "geometry"]).buffer(60).buffer(-60)
        gdf.at[j, "acc_exutoire"] = max(gdf.at[j, "acc_exutoire"], gdf.at[i, "acc_exutoire"])
        gdf = gdf.drop(index=i)
    gdf = gdf.drop(columns="aire")
    gdf = gdf.sort_values("acc_exutoire", ascending=False).reset_index(drop=True)
    gdf["id"] = [f"SB{i:02d}" for i in range(1, len(gdf) + 1)]
    gdf["surface_km2"] = (gdf.area / 1e6).round(1)
    # Les unités sont découpées sur le contour du bassin : pas de recouvrement.
    gdf["geometry"] = gdf.geometry.intersection(contour.geometry.iloc[0])
    gdf = gdf[~gdf.geometry.is_empty][["id", "surface_km2", "geometry"]]
    gdf.to_file(TRAVAIL / "sous_bassins.gpkg", driver="GPKG")
    print(gdf.drop(columns="geometry").to_string(index=False))

    # Relief : pente et indice d'humidité topographique, au pas du MNT.
    z = np.asarray(mnt_brut).astype("float64")
    z[z < -1000] = np.nan
    zf = np.where(np.isnan(z), np.nanmean(z), z)
    gy, gx = np.gradient(zf, b1.PIXEL)
    pente = 100.0 * np.hypot(gx, gy)
    surface_amont = (acc + 1.0) * b1.PIXEL  # largeur contributive, m
    twi = np.log(surface_amont / np.maximum(pente / 100.0, 0.01))
    np.savez_compressed(TRAVAIL / "relief.npz", pente=pente.astype("float32"),
                        twi=twi.astype("float32"), acc=acc.astype("float32"),
                        label=label, mnt=zf.astype("float32"))
    print("    relief.npz écrit")


if __name__ == "__main__":
    main()
