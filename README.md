# Démonstrateur — diagnostic territorial du bassin versant de la Drôme

Interface de démonstration Carte 42 en réponse à la consultation du **Syndicat Mixte de la Rivière Drôme et ses affluents (SMRD)** : *Diagnostic territorial du bassin versant de la Drôme préalable à la programmation d'actions de résilience* (AWS-MPI-1885112, remise le 16 novembre 2026).

**But.** Montrer la méthode et un exemple des résultats qu'elle permet d'obtenir, sur un seul secteur, à partir de données ouvertes. La démonstration est hors de la note méthodologique, qui y renvoie.

**Secteur.** Le bassin de la Gervanne (152 km², 13 sous-bassins versants). L'emprise générale, le bassin de la Drôme (1 644 km² délimités sur le MNT, 1 666 km² au CCTP), ne sert qu'à situer le secteur.

## Ce que la démonstration montre

| Échelle | Contenu | CCTP |
|---|---|---|
| Bassin | Découpage en sous-bassins sur le MNT, grille multicritères (4 familles, 12 indicateurs), note et priorité de 1 à 5 étoiles | Phases 1 et 2 |
| Bassin | Espaces inéligibles : pente supérieure à 25 %, bâti et routes revêtues, surfaces en eau | Phase 1, limites au déploiement |
| Opérationnelle | Surface agricole utile (RPG 2024) hors espaces inéligibles, découpée en secteurs de 400 m, notée sur 3 critères | Phase 3 |
| Restitution | Couches GeoJSON, grille en tableur, chaîne de traitement | Livrables transversaux |

Les coefficients de la grille et les seuils sont proposés à titre d'exemple. Aucun n'est un résultat du marché.

## Lancer

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
```

Les données de `public/data/` sont produites par la chaîne de traitement de `pipeline/` (voir `pipeline/README.md`). Elles sont versionnées : la page ne dépend d'aucun service au chargement, hors les fonds de plan IGN.

## Publication

GitHub Pages par le workflow `.github/workflows/pages.yml`. Le domaine personnalisé s'écrit dans `public/CNAME` une fois l'entrée DNS créée.

## Ne figure pas dans ce dépôt

Aucune pièce d'offre (`*.docx`, `*.xlsx`, `*.pdf` exclus), aucune donnée source lourde (`pipeline/sources/`, `pipeline/travail/`).
