"""Étape 7 — Publication des chaînes de traitement et inventaire des fichiers servis.

Les scripts vivent dans `pipeline/`, hors de `public/` : ils sont versionnés, mais
pas livrés avec la page. Ce script produit `public/data/traitements.zip`, pour
que les chaînes de traitement soient livrées avec les résultats, et
`public/data/fichiers.json`, l'inventaire que le volet « sources » emploie pour
offrir chaque fichier en téléchargement.

L'inventaire est construit en parcourant le dossier servi : il ne peut pas
annoncer un fichier absent, ni en oublier un.

Usage : python 07_publier.py
"""
from __future__ import annotations

import json
import sys
import zipfile
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RACINE = Path(__file__).resolve().parent.parent
PIPELINE = RACINE / "pipeline"
DATA = RACINE / "public" / "data"
ARCHIVE = DATA / "traitements.zip"
INVENTAIRE = DATA / "fichiers.json"

# Ce que chaque fichier servi contient, en une ligne. Un fichier présent sur le
# disque et absent de cette table est signalé plutôt que publié sans légende.
LEGENDES = {
    "sous_bassins.geojson": "Sous-bassins versants du secteur, avec leurs douze indicateurs, leurs notes et leur priorité",
    "sous_bassins.csv": "Les mêmes données en tableur, sans géométrie",
    "secteurs.geojson": "Secteurs agricoles notés, hors espaces inéligibles",
    "secteurs.csv": "Les mêmes secteurs en tableur, sans géométrie",
    "inegibles.geojson": "Espaces inéligibles : pente, bâti et routes revêtues, surfaces en eau",
    "grille.json": "Grille de notation : familles, indicateurs, coefficients, sources",
    "criteres_agricoles.json": "Critères de notation des secteurs agricoles",
    "bassin_gervanne.geojson": "Contour du bassin de la Gervanne, délimité sur le modèle numérique de terrain",
    "bassin_drome.geojson": "Contour du bassin de la Drôme, délimité sur le modèle numérique de terrain",
    "communes_bassin.geojson": "Communes recouvrant le bassin de la Drôme pour un cinquième au moins de leur surface",
    "reseau_principal.geojson": "Cours d'eau nommés de la BD TOPO dans le bassin de la Drôme",
    "emprise.json": "Surfaces délimitées et comparaison avec le cahier des clauses techniques",
    "traitements.zip": "Les scripts qui produisent tout ce qui précède",
    "fichiers.json": None,  # l'inventaire ne s'inventorie pas lui-même
}

FAMILLES = {
    "donnees": "Données et traitements",
    "situation": "Situation dans le bassin de la Drôme",
}
SITUATION = {"bassin_gervanne.geojson", "bassin_drome.geojson", "communes_bassin.geojson",
             "reseau_principal.geojson", "emprise.json"}


def main() -> None:
    print("Étape 7 — chaînes de traitement et inventaire des fichiers servis")
    scripts = sorted(PIPELINE.glob("[0-9]*.py")) + [PIPELINE / "common.py"]

    def objet(script: Path) -> str:
        premiere = script.read_text(encoding="utf-8").splitlines()[0]
        return premiere.strip('"').strip() or "—"

    lisez_moi = (
        "Chaînes de traitement du démonstrateur — Carte 42\n"
        "Consultation du Syndicat Mixte de la Rivière Drôme et ses affluents :\n"
        "diagnostic territorial du bassin versant de la Drôme\n\n"
        "Les scripts s'exécutent dans l'ordre de leur numéro. Chacun lit ce que le\n"
        "précédent a écrit et n'a besoin d'aucun identifiant : toutes les sources sont\n"
        "ouvertes et interrogées sans authentification.\n\n"
        + "\n".join(f"  {s.name:24s} {objet(s)}" for s in scripts)
        + "\n\nDépendances : geopandas, rasterio, pyogrio, shapely, numpy, pandas, requests,\n"
          "pysheds, numba.\n"
    )
    with zipfile.ZipFile(ARCHIVE, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("LISEZ-MOI.txt", lisez_moi)
        for s in scripts:
            z.write(s, s.name)
    print(f"  traitements.zip : {len(scripts)} scripts, {ARCHIVE.stat().st_size // 1024} Ko")

    entrees, inconnus = [], []
    for f in sorted(DATA.iterdir()):
        if not f.is_file():
            continue
        if f.name not in LEGENDES:
            inconnus.append(f.name)
            continue
        if LEGENDES[f.name] is None:
            continue
        entrees.append({
            "chemin": f"data/{f.name}",
            "nom": f.name,
            "legende": LEGENDES[f.name],
            "famille": "situation" if f.name in SITUATION else "donnees",
            "octets": f.stat().st_size,
        })
    if inconnus:
        print(f"  ATTENTION — fichiers servis sans légende : {inconnus}")
    entrees.sort(key=lambda e: (list(FAMILLES).index(e["famille"]), e["nom"]))
    INVENTAIRE.write_text(json.dumps({"familles": FAMILLES, "fichiers": entrees}, ensure_ascii=False, indent=2),
                          encoding="utf-8")
    print(f"  fichiers.json : {len(entrees)} entrées")


if __name__ == "__main__":
    main()
