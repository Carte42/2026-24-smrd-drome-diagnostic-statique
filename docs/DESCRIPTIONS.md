# Descriptions en langage courant — règles et seuils

La bulle qui s'ouvre au clic sur un sous-bassin ou un secteur agricole décrit le lieu en trois phrases, puis conclut. Le texte est produit par `src/description.js` : chaque phrase est tirée d'un indicateur, avec un seuil lu dans la répartition réelle des 13 sous-bassins et des 328 secteurs. Aucune surface, aucun rang ni aucune note n'y figure ; ils restent dans la fiche détaillée du panneau de gauche.

## Sous-bassin

| Phrase | Indicateur | Seuils | Texte |
|---|---|---|---|
| 1. Relief | Altitude médiane | < 350 m · < 600 m · < 1 200 m · au-delà | fond de vallée · piémont · moyenne montagne · haute montagne |
| 1. Pente | Pente médiane | < 20 % · < 35 % · au-delà | au terrain doux · au relief modéré · aux versants raides |
| 1. Occupation | Part de surface agricole utile (D1) | < 15 % · < 30 % · au-delà | avec peu de terres agricoles · avec des terres agricoles par endroits · largement agricole |
| 1. Cultures | Terres arables (B3), cultures permanentes (B2) | B3 ≥ 50 % et B2 ≥ 10 % · B3 ≥ 50 % · B2 ≥ 10 % · B3 < 25 % · sinon | surtout des terres cultivées avec des vignes et d'autres cultures pérennes · surtout des terres cultivées · terres cultivées, vignes et cultures pérennes · surtout des prairies · cultures et prairies |
| 1. Parcelles | Taille moyenne (D3) | ≥ 2,5 ha · < 1,2 ha | aux parcelles assez grandes · aux petites parcelles |
| 2. Réseau | Densité de cours d'eau (A1) | ≥ 2,8 km/km² · ≤ 1,3 | dense · peu dense |
| 2. Régime | Part intermittente (A2) | ≥ 85 % · ≥ 65 % · sinon | presque entièrement intermittent · en grande partie intermittent · en partie permanent |
| 2. Sources | Sources pour 10 km² (A3) | ≥ 6 | avec de nombreuses sources |
| 2. Pression | D1, B3 | D1 < 15 % · B3 ≥ 50 % · B3 < 25 % · sinon | peu de pression agricole · les sols cultivés ruissellent vers les ruisseaux · peu de terres labourées, donc peu de ruissellement à corriger · pression agricole modérée |
| 3. Desserte | Chemins et routes empierrées (D2) | ≥ 2,7 km/km² · ≥ 1,9 · sinon | bien desservi · accès correct par les pistes · accès rares |
| 3. Aménagement | Surface en pente < 15 % (C1) | ≥ 35 % · < 12 % · sinon | la pente permet d'aménager · limite fortement · limite en partie |

**Conclusion selon les étoiles.** 5 : effet important et relativement simple à mettre en œuvre. 4 : pertinente et réalisable. 3 : intérêt moyen, effet attendu et faisabilité partagés. 2 et 1 : rôle de zone d'alimentation des cours d'eau en aval.

## Secteur agricole

| Phrase | Indicateur | Seuils | Texte |
|---|---|---|---|
| 1. Relief | Altitude du secteur | mêmes classes que le sous-bassin | fond de vallée · piémont · moyenne montagne · haute montagne |
| 1. Eau | Distance au plus proche cours d'eau naturel ou source | < 50 m · < 700 m · au-delà | au bord · à environ N m (arrondi à 50 m) · éloigné |
| 2. Terrain | Part en pente < 10 % | ≥ 60 % · ≥ 30 % · sinon | terrain plat · pente modérée · terrain en pente |
| 2. Sol | Terres arables, cultures permanentes | ta ≥ 60 % · cp ≥ 30 % · ta < 20 % et cp < 20 % · sinon | cultivé en terres arables (avec mention du ruissellement si le cours d'eau est à moins de 300 m) · planté en vignes ou en cultures pérennes · en prairie, sol enherbé · en partie cultivé |
| 3. Accès | Distance au plus proche chemin ou route | < 60 m · < 200 m · au-delà | en bordure d'un chemin · accessible par un chemin proche · à l'écart des chemins |

**Conclusion selon les étoiles.** 4 et 5 : bien placé et réalisable. 3 : envisageable. 1 et 2 : moins bien placé que les autres du même sous-bassin.

Les étoiles d'un secteur sont celles de son sous-bassin lorsque celui-ci compte au moins cinq secteurs ; sinon, celles de l'ensemble du secteur d'étude, et la bulle n'écrit pas « dans son sous-bassin ».

## Nature du texte

Les phrases décrivent des indicateurs. La conclusion est une lecture de la priorité, pas une mesure : elle traduit en mots le niveau d'étoiles. Les seuils sont des choix de présentation, modifiables sans toucher à la grille de notation.

## Ce que recouvrent les catégories de culture

Les mots employés viennent de l'attribut de catégorie principale du Registre parcellaire graphique 2024 : terres arables, cultures permanentes, prairies permanentes. Sur le bassin de la Gervanne, les terres arables ne sont pas que des cultures de vente : à côté du blé tendre, de l'orge et du tournesol, elles comptent de la luzerne, du sainfoin, des prairies temporaires et des mélanges fourragers. Les cultures permanentes sont à plus de 80 % de la vigne, avec de la lavande et du lavandin, des noyers et quelques vergers. D'où « terres cultivées » et « cultures pérennes » dans les textes.
