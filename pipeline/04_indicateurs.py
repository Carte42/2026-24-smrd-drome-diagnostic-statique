"""Étape 4 — Grille multicritères et classement des sous-bassins.

Phase 2 du CCTP : une grille d'analyse à catégories, critères et coefficients,
une note par sous-bassin et un niveau de priorité d'engagement d'actions
d'infiltration. La grille ci-dessous est celle de la démonstration : ses
pondérations sont proposées à titre d'exemple, la grille définitive étant
arrêtée avec le maître d'ouvrage en comité technique.

Méthode de notation.
  1. Chaque indicateur est calculé par sous-bassin, sur des couches ouvertes.
  2. Il est ramené à une note de 0 à 100 par normalisation entre les valeurs
     extrêmes du secteur (sens inversé si une valeur faible est favorable).
  3. La note d'une famille est la moyenne de ses indicateurs.
  4. La note globale est la moyenne des familles, pondérée par leurs coefficients.
  5. Le niveau de priorité est un rang de 1 à 5 étoiles, en cinq classes
     d'effectifs voisins.

Sorties : `public/data/grille.json`, `public/data/sous_bassins.geojson`,
`public/data/sous_bassins.csv`.
Usage : python 04_indicateurs.py
"""
from __future__ import annotations

import json

import geopandas as gpd
import numpy as np
import pandas as pd
from rasterio.features import rasterize
from rasterio.transform import from_origin

from common import CRS, PUBLIC, TRAVAIL
import importlib

charger = importlib.import_module("03_couches").charger

PIXEL = 25.0
TRANSFORM = from_origin(853000.0, 6432000.0, PIXEL, PIXEL)

# ── Grille ───────────────────────────────────────────────────────────────────
# `sens` = +1 : une valeur élevée accroît la priorité d'action ; -1 : l'inverse.
GRILLE = {
    "familles": [
        {"cle": "A", "libelle": "Vulnérabilité des milieux aquatiques", "poids": 30,
         "question": "Les milieux à soutenir sont-ils nombreux et fragiles ?",
         "indicateurs": [
             {"cle": "A1", "libelle": "Densité de cours d'eau", "unite": "km/km²", "sens": 1,
              "source": "BD TOPO, tronçons hydrographiques naturels",
              "lecture": "Longueur de cours d'eau, permanents et intermittents, rapportée à la surface. Plus il y a de milieux à soutenir, plus l'action est utile."},
             {"cle": "A2", "libelle": "Part du réseau intermittent", "unite": "%", "sens": 1,
              "source": "BD TOPO, attribut de persistance",
              "lecture": "Part du linéaire qui s'assèche par intermittence. Un réseau intermittent est plus exposé aux assecs."},
             {"cle": "A3", "libelle": "Sources et résurgences", "unite": "pour 10 km²", "sens": 1,
              "source": "BD TOPO, détails hydrographiques",
              "lecture": "Sources, sources captées et résurgences recensées. Elles marquent les zones d'alimentation à préserver."},
         ]},
        {"cle": "B", "libelle": "Pressions sur les milieux", "poids": 25,
         "question": "Quelles pressions s'exercent sur ces milieux ?",
         "indicateurs": [
             {"cle": "B1", "libelle": "Emprise du bâti et des routes revêtues", "unite": "%", "sens": 1,
              "source": "BD TOPO, bâtiments et tronçons de route",
              "lecture": "Surface imperméabilisée estimée : emprise des bâtiments et des routes revêtues, rapportée à la surface."},
             {"cle": "B2", "libelle": "Part des cultures permanentes", "unite": "% de la SAU", "sens": 1,
              "source": "Registre parcellaire graphique 2024",
              "lecture": "Vignes, vergers et autres cultures permanentes, plus dépendantes de l'eau que les prairies : pression potentielle sur la ressource."},
             {"cle": "B3", "libelle": "Part des terres arables", "unite": "% de la SAU", "sens": 1,
              "source": "Registre parcellaire graphique 2024",
              "lecture": "Part des terres arables dans la surface agricole utile. Les sols cultivés ruissellent davantage que les prairies."},
         ]},
        {"cle": "C", "libelle": "Potentiel d'infiltration", "poids": 25,
         "question": "Le terrain se prête-t-il à l'infiltration ?",
         "indicateurs": [
             {"cle": "C1", "libelle": "Surface en pente faible", "unite": "% (pente < 15 %)", "sens": 1,
              "source": "RGE ALTI, rééchantillonné à 25 m",
              "lecture": "Part de la surface où la pente reste inférieure à 15 %, condition d'un aménagement paysager d'infiltration."},
             {"cle": "C2", "libelle": "Convergence des écoulements", "unite": "indice", "sens": 1,
              "source": "RGE ALTI, indice d'humidité topographique médian",
              "lecture": "Indice qui croît là où les écoulements convergent. Il repère les terrains où le ruissellement se concentre."},
             {"cle": "C3", "libelle": "SAU en pente faible", "unite": "% (pente < 10 %)", "sens": 1,
              "source": "RGE ALTI et registre parcellaire graphique 2024",
              "lecture": "Part de la surface agricole utile en pente inférieure à 10 %, directement mobilisable."},
         ]},
        {"cle": "D", "libelle": "Faisabilité d'une action", "poids": 20,
         "question": "L'action est-elle réalisable à court terme ?",
         "indicateurs": [
             {"cle": "D1", "libelle": "Part de la surface agricole utile", "unite": "%", "sens": 1,
              "source": "Registre parcellaire graphique 2024",
              "lecture": "Part du sous-bassin occupée par des parcelles agricoles, terrain d'accueil des aménagements."},
             {"cle": "D2", "libelle": "Densité de chemins et de routes empierrées", "unite": "km/km²", "sens": 1,
              "source": "BD TOPO, tronçons de route",
              "lecture": "Chemins et routes empierrées, qui donnent accès aux parcelles."},
             {"cle": "D3", "libelle": "Taille moyenne des parcelles", "unite": "ha", "sens": 1,
              "source": "Registre parcellaire graphique 2024",
              "lecture": "Des parcelles plus grandes réduisent le nombre d'exploitants à associer à un aménagement."},
         ]},
    ],
    "classes": 5,
}
INDICATEURS = [i for f in GRILLE["familles"] for i in f["indicateurs"]]

REVETUES = {"Route à 1 chaussée", "Route à 2 chaussées", "Rond-point"}
EMPIERREES = {"Chemin", "Route empierrée"}


def longueur_km(lignes: gpd.GeoDataFrame, zone) -> float:
    return float(lignes.clip(zone).length.sum() / 1000.0)


def vrai(serie: pd.Series) -> pd.Series:
    return serie.astype(str).str.lower().isin(["true", "1", "t"])


def commune_principale(zone, communes: gpd.GeoDataFrame) -> str:
    co = communes[communes.intersects(zone)]
    if len(co):
        return str(co.assign(a=co.intersection(zone).area).sort_values("a").iloc[-1]["nom_officiel"])
    return ""


def cours_principal(zone, troncons: gpd.GeoDataFrame) -> str:
    """Nom du cours d'eau le plus long dans l'unité, s'il pèse au moins 1,5 km."""
    nom = "cpx_toponyme_de_cours_d_eau"
    t = troncons[troncons.intersects(zone) & troncons[nom].notna()]
    if len(t):
        longueurs = t.assign(l=t.clip(zone).length).groupby(nom)["l"].sum()
        if longueurs.max() > 1500:
            return str(longueurs.idxmax()).strip()
    return ""


def main() -> None:
    print("Étape 4 — grille multicritères et classement")
    sb = gpd.read_file(TRAVAIL / "sous_bassins.gpkg")
    relief = np.load(TRAVAIL / "relief.npz")
    pente, twi = relief["pente"], relief["twi"]
    couches = charger()
    tr = couches["troncons"]
    tr = tr[(~vrai(tr["fictif"])) & (tr["etat_de_l_objet"] == "En service")]
    nature = tr[(tr["nature"] == "Ecoulement naturel") & (~vrai(tr["fosse"]))]
    sources = couches["details_eau"][couches["details_eau"]["nature"].isin(["Source", "Source captée", "Résurgence"])]
    bati = couches["batiments"]
    routes = couches["routes"]
    rpg = couches["rpg"].copy()
    rpg["surf_ha"] = rpg.area / 1e4
    cours_d_eau = gpd.read_file(next((TRAVAIL.parent / "sources").glob("cours_d_eau_*.gpkg")))
    communes = couches["communes"]

    # Trame du secteur agricole au pas du MNT, pour les indicateurs de pente.
    h, w = pente.shape
    sau_raster = rasterize([(g, 1) for g in rpg.geometry], out_shape=(h, w), transform=TRANSFORM,
                           fill=0, dtype="uint8").astype(bool)

    lignes = []
    for _, u in sb.iterrows():
        zone = u.geometry
        s_km2 = zone.area / 1e6
        masque = rasterize([(zone, 1)], out_shape=(h, w), transform=TRANSFORM, fill=0, dtype="uint8").astype(bool)

        l_nat = longueur_km(nature, zone)
        l_int = longueur_km(nature[nature["persistance"] == "Intermittent"], zone)
        n_src = int(sources.intersects(zone).sum())
        bati_ha = bati.clip(zone).area.sum() / 1e4
        rev_km = longueur_km(routes[routes["nature"].isin(REVETUES)], zone)
        emprise = (bati_ha * 1e4 + rev_km * 1000 * 6.0) / zone.area * 100.0

        parc = rpg.clip(zone)
        sau_ha = parc.area.sum() / 1e4
        ta_ha = parc[parc["cat_cult_p"] == "TA"].area.sum() / 1e4
        centres = rpg[rpg.geometry.representative_point().within(zone)]

        pf = pente[masque] < 15.0
        sau_m = masque & sau_raster

        lignes.append({
            "id": u["id"],
            "cours": cours_principal(zone, nature),
            "commune": commune_principale(zone, communes),
            "surface_km2": round(s_km2, 1),
            "alt": float(np.median(relief["mnt"][masque])),
            "pente_med": float(np.median(pente[masque])),
            "A1": l_nat / s_km2,
            "A2": 100.0 * l_int / l_nat if l_nat else 0.0,
            "A3": 10.0 * n_src / s_km2,
            "B1": emprise,
            "B2": 100.0 * parc[parc["cat_cult_p"] == "CP"].area.sum() / 1e4 / sau_ha if sau_ha else 0.0,
            "B3": 100.0 * ta_ha / sau_ha if sau_ha else 0.0,
            "C1": 100.0 * float(pf.mean()),
            "C2": float(np.median(twi[masque])),
            "C3": 100.0 * float((pente[sau_m] < 10.0).mean()) if sau_m.any() else 0.0,
            "D1": 100.0 * sau_ha / (s_km2 * 100.0),
            "D2": longueur_km(routes[routes["nature"].isin(EMPIERREES)], zone) / s_km2,
            "D3": float(centres["surf_ha"].mean()) if len(centres) else 0.0,
            "geometry": zone,
        })
    gdf = gpd.GeoDataFrame(lignes, crs=CRS)
    # Nom lisible : le cours d'eau principal ; à défaut ou si plusieurs unités le
    # partagent, la commune qui occupe la plus grande part de l'unité s'y ajoute.
    gdf["nom"] = np.where(gdf["cours"] != "", gdf["cours"], "Bassin de " + gdf["commune"])
    doublons = gdf["nom"].duplicated(keep=False)
    gdf.loc[doublons, "nom"] = gdf.loc[doublons, "nom"] + " (" + gdf.loc[doublons, "commune"] + ")"
    gdf = gdf.drop(columns=["cours"])

    # ── Notation ─────────────────────────────────────────────────────────────
    for ind in INDICATEURS:
        v = gdf[ind["cle"]].astype(float)
        mini, maxi = v.min(), v.max()
        note = (v - mini) / (maxi - mini) * 100.0 if maxi > mini else pd.Series(50.0, index=v.index)
        gdf["n_" + ind["cle"]] = (note if ind["sens"] > 0 else 100.0 - note).round(1)
    for fam in GRILLE["familles"]:
        cols = ["n_" + i["cle"] for i in fam["indicateurs"]]
        gdf["f_" + fam["cle"]] = gdf[cols].mean(axis=1).round(1)
    total = sum(f["poids"] for f in GRILLE["familles"])
    gdf["note"] = sum(gdf["f_" + f["cle"]] * f["poids"] for f in GRILLE["familles"]) / total
    gdf["note"] = gdf["note"].round(1)
    # Cinq classes d'effectifs voisins, d'après le rang de la note globale.
    rang = gdf["note"].rank(method="first", ascending=False).astype(int)
    n = len(gdf)
    gdf["rang"] = rang
    gdf["etoiles"] = (GRILLE["classes"] - ((rang - 1) * GRILLE["classes"] // n)).astype(int)
    gdf = gdf.sort_values("rang").reset_index(drop=True)

    # ── Sorties ──────────────────────────────────────────────────────────────
    (PUBLIC / "grille.json").write_text(json.dumps(GRILLE, ensure_ascii=False, indent=1), encoding="utf-8")
    web = gdf.copy()
    web["geometry"] = web.geometry.simplify(12).to_crs(4326)
    for c in web.columns:
        if c not in ("id", "nom", "geometry") and pd.api.types.is_float_dtype(web[c]):
            web[c] = web[c].round(2)
    (PUBLIC / "sous_bassins.geojson").write_text(web.to_json(drop_id=True, show_bbox=False), encoding="utf-8")
    gdf.drop(columns="geometry").round(2).to_csv(PUBLIC / "sous_bassins.csv", index=False, encoding="utf-8-sig", sep=";")
    gdf.to_file(TRAVAIL / "sous_bassins_notes.gpkg", driver="GPKG")

    cols = ["rang", "id", "nom", "surface_km2", "f_A", "f_B", "f_C", "f_D", "note", "etoiles"]
    print(gdf[cols].to_string(index=False))


if __name__ == "__main__":
    main()
