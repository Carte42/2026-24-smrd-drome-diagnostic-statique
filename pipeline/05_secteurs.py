"""Étape 5 — Espaces inéligibles et secteurs agricoles prioritaires.

Phase 1 (limites au déploiement d'actions d'infiltration) et phase 3 du CCTP :
  1. cartographier les espaces qui ne peuvent pas accueillir d'aménagement ;
  2. définir l'emprise du milieu agricole, ôtée de ces espaces ;
  3. la découper en secteurs d'échelle appropriée et les noter sur trois
     catégories : proximité des milieux aquatiques, potentiel d'infiltration,
     pression sur les milieux et l'humidité des sols.

Seuils retenus pour la démonstration, à arrêter avec le maître d'ouvrage :
pente supérieure à 25 %, emprise du bâti à 15 m, des routes revêtues à 8 m.

Sorties : `public/data/inegibles.geojson`, `secteurs.geojson`, `secteurs.csv`.
Usage : python 05_secteurs.py
"""
from __future__ import annotations

import importlib
import time

import geopandas as gpd
import numpy as np
import pandas as pd
from rasterio.features import rasterize, shapes
from rasterio.transform import from_origin
from shapely.geometry import box, shape
from shapely.ops import unary_union

from common import CRS, PUBLIC, TRAVAIL

charger = importlib.import_module("03_couches").charger

PIXEL = 25.0
ORIGINE = (853000.0, 6432000.0)
TRANSFORM = from_origin(ORIGINE[0], ORIGINE[1], PIXEL, PIXEL)
SEUIL_PENTE = 25.0
CELLULE_M = 400.0
SAU_MINI_HA = 3.0
REVETUES = {"Route à 1 chaussée", "Route à 2 chaussées", "Rond-point"}

CRITERES = [
    {"cle": "P", "libelle": "Proximité des milieux aquatiques", "poids": 30,
     "lecture": "Distance au plus proche cours d'eau naturel, permanent ou intermittent, ou à la plus proche source."},
    {"cle": "I", "libelle": "Potentiel d'infiltration", "poids": 45,
     "lecture": "Part de la surface en pente inférieure à 10 % et convergence des écoulements."},
    {"cle": "S", "libelle": "Pression sur les milieux et les sols", "poids": 25,
     "lecture": "Part des terres arables et des cultures permanentes, qui ruissellent davantage ou consomment plus d'eau que les prairies."},
]


def vecteurs(masque: np.ndarray, aire_mini: float) -> gpd.GeoSeries:
    polys = [shape(g) for g, v in shapes(masque.astype("uint8"), mask=masque, transform=TRANSFORM) if v == 1]
    s = gpd.GeoSeries(polys, crs=CRS)
    return s[s.area >= aire_mini]


T0 = time.time()


def t(msg: str) -> None:
    print(f"    [{time.time() - T0:5.0f} s] {msg}", flush=True)


def main() -> None:
    print("Étape 5 — espaces inéligibles et secteurs agricoles")
    bassin = gpd.read_file(TRAVAIL / "bassin.gpkg").geometry.iloc[0]
    sb = gpd.read_file(TRAVAIL / "sous_bassins_notes.gpkg")
    relief = np.load(TRAVAIL / "relief.npz")
    pente, twi = relief["pente"], relief["twi"]
    h, w = pente.shape
    c = charger()

    # ── 1. Espaces inéligibles ───────────────────────────────────────────────
    t('début')
    raide = vecteurs(pente > SEUIL_PENTE, 4000.0).simplify(20)
    t(f'pentes vectorisées : {len(raide)}')
    raide = gpd.GeoSeries(unary_union(raide), crs=CRS).clip(bassin)
    t('pentes unies')
    bati = c["batiments"].geometry.buffer(15)
    rev = c["routes"][c["routes"]["nature"].isin(REVETUES)].geometry.buffer(8)
    artif = gpd.GeoSeries(unary_union(list(bati) + list(rev)), crs=CRS).clip(bassin)
    t('bâti et routes unis')
    eau = gpd.GeoSeries(unary_union(list(c["surfaces_eau"].geometry.buffer(5))), crs=CRS).clip(bassin)
    couches = {"pente": raide, "artificialise": artif, "eau": eau}
    lignes = []
    for type_, s in couches.items():
        for g in s.explode(index_parts=False):
            if g.is_empty or g.area < 800:
                continue
            lignes.append({"type": type_, "geometry": g.simplify(8)})
    inel = gpd.GeoDataFrame(lignes, crs=CRS)
    inel["ha"] = (inel.area / 1e4).round(1)
    web = inel.to_crs(4326)
    web["geometry"] = web.geometry.set_precision(1e-5)
    (PUBLIC / "inegibles.geojson").write_text(web.to_json(drop_id=True), encoding="utf-8")
    exclu = unary_union([g for s in couches.values() for g in s])
    t('exclusions prêtes')
    print(f"    espaces inéligibles : {inel.groupby('type')['ha'].sum().round(0).to_dict()} ha")

    # ── 2. Milieu agricole éligible ──────────────────────────────────────────
    rpg = c["rpg"][["cat_cult_p", "geometry"]].clip(bassin)
    rpg = rpg[~rpg.is_empty]
    # Différence par recouvrement indexé : une différence parcelle par parcelle
    # contre l'union complète des exclusions est de plusieurs ordres plus lente.
    parties = gpd.GeoDataFrame(geometry=list(gpd.GeoSeries(exclu, crs=CRS).explode(index_parts=False)), crs=CRS)
    parties = parties[parties.geom_type == "Polygon"]
    t(f'exclusions en {len(parties)} parties')
    sau = gpd.overlay(rpg.reset_index(drop=True), parties.assign(_x=1), how="difference", keep_geom_type=True)
    sau = sau.drop(columns=["_x"], errors="ignore")
    sau = sau[~sau.is_empty & (sau.area > 100)]
    t('SAU éligible')
    print(f"    SAU du bassin : {rpg.area.sum()/1e4:,.0f} ha, éligible : {sau.area.sum()/1e4:,.0f} ha")
    sau_r = rasterize([(g, 1) for g in sau.geometry], out_shape=(h, w), transform=TRANSFORM,
                      fill=0, dtype="uint8").astype(bool)

    # ── 3. Secteurs : mailles de 400 m sur la SAU éligible ───────────────────
    minx, miny, maxx, maxy = bassin.bounds
    xs = np.arange(np.floor(minx / CELLULE_M) * CELLULE_M, maxx, CELLULE_M)
    ys = np.arange(np.floor(miny / CELLULE_M) * CELLULE_M, maxy, CELLULE_M)
    mailles = gpd.GeoDataFrame(
        {"maille": range(len(xs) * len(ys))},
        geometry=[box(x, y, x + CELLULE_M, y + CELLULE_M) for x in xs for y in ys], crs=CRS)
    pieces = gpd.overlay(mailles, sau, how="intersection", keep_geom_type=True)
    pieces["ha"] = pieces.area / 1e4

    # Réseau de référence : tous les cours d'eau naturels, permanents ou
    # intermittents, et les sources. Limiter la mesure aux seuls tronçons
    # permanents favorisait mécaniquement les fonds de vallée, la BD TOPO
    # classant l'essentiel du réseau amont en intermittent.
    tr = c["troncons"]
    tr = tr[(tr["fictif"].astype(str).str.lower() != "true") & (tr["nature"] == "Ecoulement naturel")]
    src = c["details_eau"]
    src = src[src["nature"].isin(["Source", "Source captée", "Résurgence"])]
    reseau = unary_union(list(tr.geometry) + list(src.geometry))

    lignes = []
    for m, groupe in pieces.groupby("maille"):
        ha = groupe["ha"].sum()
        if ha < SAU_MINI_HA:
            continue
        geom = unary_union(list(groupe.geometry))
        x0, y0, x1, y1 = geom.bounds
        c0, r0 = int((x0 - ORIGINE[0]) // PIXEL), int((ORIGINE[1] - y1) // PIXEL)
        c1, r1 = int((x1 - ORIGINE[0]) // PIXEL) + 1, int((ORIGINE[1] - y0) // PIXEL) + 1
        fen = (slice(max(r0, 0), min(r1, h)), slice(max(c0, 0), min(c1, w)))
        masque = sau_r[fen]
        if not masque.any():
            continue
        lignes.append({
            "maille": int(m),
            "sb": None,
            "ha": round(ha, 1),
            "dist_eau_m": float(geom.representative_point().distance(reseau)),
            "pente10": 100.0 * float((pente[fen][masque] < 10.0).mean()),
            "twi": float(np.median(twi[fen][masque])),
            "ta": 100.0 * groupe.loc[groupe["cat_cult_p"] == "TA", "ha"].sum() / ha,
            "cp": 100.0 * groupe.loc[groupe["cat_cult_p"] == "CP", "ha"].sum() / ha,
            "geometry": geom,
        })
    sec = gpd.GeoDataFrame(lignes, crs=CRS)
    sec["sb"] = sec.geometry.representative_point().apply(
        lambda p: next((i for i, g in zip(sb["id"], sb.geometry) if g.contains(p)), None))
    sec = sec[sec["sb"].notna()].reset_index(drop=True)

    def minmax(v, sens=1):
        v = v.astype(float)
        n = (v - v.min()) / (v.max() - v.min()) * 100.0 if v.max() > v.min() else pd.Series(50.0, index=v.index)
        return n if sens > 0 else 100.0 - n

    sec["n_P"] = minmax(sec["dist_eau_m"].clip(upper=1500), sens=-1)
    sec["n_I"] = (minmax(sec["pente10"]) + minmax(sec["twi"])) / 2.0
    sec["n_S"] = (minmax(sec["ta"]) + minmax(sec["cp"])) / 2.0
    total = sum(k["poids"] for k in CRITERES)
    sec["note"] = sum(sec["n_" + k["cle"]] * k["poids"] for k in CRITERES) / total
    # Les cinq classes se répartissent au sein de chaque sous-bassin, comme le
    # demande le CCTP : des secteurs prioritaires au sein de chacun des
    # sous-bassins évalués, non sur l'ensemble du secteur d'étude.
    # Un sous-bassin de moins de cinq secteurs ne se partage pas en cinq classes :
    # ses secteurs reçoivent la classe qu'ils auraient sur l'ensemble du secteur d'étude.
    sec["rang"] = sec.groupby("sb")["note"].rank(method="first", ascending=False).astype(int)
    sec["n_sb"] = sec.groupby("sb")["note"].transform("size").astype(int)
    interne = (5 - ((sec["rang"] - 1) * 5 // sec["n_sb"])).astype(int)
    rang_global = sec["note"].rank(method="first", ascending=False).astype(int)
    global_ = (5 - ((rang_global - 1) * 5 // len(sec))).astype(int)
    sec["etoiles"] = np.where(sec["n_sb"] >= 5, interne, global_).astype(int)
    for k in ("note", "n_P", "n_I", "n_S", "dist_eau_m", "pente10", "twi", "ta", "cp"):
        sec[k] = sec[k].round(1)

    web = sec.copy()
    web["geometry"] = web.geometry.simplify(6).to_crs(4326)
    (PUBLIC / "secteurs.geojson").write_text(web.to_json(drop_id=True), encoding="utf-8")
    sec.drop(columns="geometry").to_csv(PUBLIC / "secteurs.csv", index=False, encoding="utf-8-sig", sep=";")
    (PUBLIC / "criteres_agricoles.json").write_text(
        pd.Series(CRITERES).to_json(force_ascii=False, orient="values"), encoding="utf-8")
    sec.to_file(TRAVAIL / "secteurs.gpkg", driver="GPKG")

    print(f"    {len(sec)} secteurs notés, {sec['ha'].sum():,.0f} ha")
    print(sec.groupby("etoiles")["ha"].agg(["count", "sum"]).round(0).to_string())


if __name__ == "__main__":
    main()
