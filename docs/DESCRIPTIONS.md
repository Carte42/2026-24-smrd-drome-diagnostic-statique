# Bulles de description — principe et contenu

La bulle qui s'ouvre au clic sur un sous-bassin ou un secteur agricole restitue des **faits calculés** sur des données ouvertes, avec leur valeur et leur source. Elle n'ajoute aucune interprétation : pas de recommandation d'aménagement, pas de lien de cause supposé entre deux indicateurs, pas de qualificatif sans mesure derrière (« raide », « dense », « bien desservi »).

Le texte est produit par `src/description.js`. Aucune surface, aucun rang ni aucune note globale n'y figure ; ils restent dans la fiche détaillée du panneau de gauche.

## Sous-bassin

| Ligne | Contenu | Indicateur |
|---|---|---|
| 1 | Altitude médiane, pente médiane, part de la surface en pente inférieure à 15 % | RGE ALTI à 25 m |
| 2 | Surface agricole en pourcentage du sous-bassin, répartie en terres arables, cultures permanentes et prairies permanentes | Registre parcellaire graphique 2024 |
| 3 | Longueur de cours d'eau par km², part du linéaire classé intermittent, sources et résurgences pour 10 km² | BD TOPO |
| 4 | Emprise du bâti et des routes revêtues, longueur de chemins et de routes empierrées par km² | BD TOPO |
| 5 | Classement : familles de la grille dont la note est la plus élevée, et celles dont elle est la plus basse | Grille de notation |

## Secteur agricole

| Ligne | Contenu | Indicateur |
|---|---|---|
| 1 | Altitude, part de la surface agricole du secteur en pente inférieure à 10 % | RGE ALTI à 25 m |
| 2 | Distance au plus proche cours d'eau ou à la plus proche source, distance au plus proche chemin ou à la plus proche route, arrondies à la dizaine de mètres | BD TOPO |
| 3 | Répartition de la surface agricole du secteur : terres arables, cultures permanentes, prairies permanentes | Registre parcellaire graphique 2024 |
| 4 | Classement : critères dont la note est la plus élevée, et ceux dont elle est la plus basse | Grille de notation |

## La ligne de classement

Les notes d'une famille ou d'un critère sont sur 100, normalisées dans le secteur d'étude. Une note d'au moins 60 est dite « élevée », d'au plus 40 « basse ». La ligne nomme les familles ou les critères concernés, sans en tirer de conséquence. Si aucune note n'atteint ces seuils, elle indique des notes intermédiaires. Ces seuils sont un choix de présentation, modifiable sans toucher à la grille.

Les étoiles d'un secteur sont celles de son sous-bassin lorsque celui-ci compte au moins cinq secteurs ; sinon, celles de l'ensemble du secteur d'étude, et la bulle n'écrit pas « dans son sous-bassin ».

## Les mots de culture

Ils viennent de l'attribut de catégorie principale du Registre parcellaire graphique 2024 : terres arables, cultures permanentes, prairies permanentes. Sur le bassin de la Gervanne, les terres arables ne sont pas que des cultures de vente : à côté du blé tendre, de l'orge et du tournesol, elles comptent de la luzerne, du sainfoin, des prairies temporaires et des mélanges fourragers. Les cultures permanentes sont à plus de 80 % de la vigne, avec de la lavande et du lavandin, des noyers et quelques vergers.

## Ce qui a été retiré

Les phrases suivantes de la première version ont été supprimées parce qu'elles disaient plus que ce que les données établissent : les termes de relief (« fond de vallée », « moyenne montagne », « versants raides »), les liens de cause (« les sols cultivés ruissellent vers les ruisseaux », « peu de terres labourées, donc peu de ruissellement à corriger »), les jugements de desserte et d'aménagement (« bien desservi », « la pente permet d'aménager ») et toute conclusion de recommandation (« une action d'infiltration y est pertinente »).

Dans la grille, les rubriques « lecture » de chaque indicateur disent ce qui est mesuré et, lorsque c'est une approche, qu'il est « retenu comme approche de » la notion visée.
