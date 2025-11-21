# Configuration Collection "results"

## Créer la Collection

1. Aller dans **Databases** → Sélectionner votre database `bac-francais`
2. Cliquer sur **Create Collection**
3. Nom: `results`
4. Collection ID: `results` (ou noter l'ID généré)

## Attributs à créer

| Attribut | Type | Requis | Taille/Options | Array |
|----------|------|--------|----------------|-------|
| userId | String | ✅ | 36 | ❌ |
| poemId | String | ✅ | 100 | ❌ |
| poemTitle | String | ✅ | 200 | ❌ |
| poemAuthor | String | ✅ | 100 | ❌ |
| mode | String | ✅ | 20 | ❌ |
| answers | String | ✅ | 50000 | ❌ |
| evaluations | String | ✅ | 50000 | ❌ |
| averageScore | Float | ✅ | - | ❌ |
| totalStanzas | Integer | ✅ | - | ❌ |

### Commandes pour créer les attributs

```bash
# userId
Type: String
Size: 36
Required: Yes
Array: No
Default: (none)

# poemId
Type: String
Size: 100
Required: Yes
Array: No
Default: (none)

# poemTitle
Type: String
Size: 200
Required: Yes
Array: No
Default: (none)

# poemAuthor
Type: String
Size: 100
Required: Yes
Array: No
Default: (none)

# mode
Type: String
Size: 20
Required: Yes
Array: No
Default: (none)

# answers (JSON stringifié)
Type: String
Size: 50000
Required: Yes
Array: No
Default: (none)

# evaluations (JSON stringifié)
Type: String
Size: 50000
Required: Yes
Array: No
Default: (none)

# averageScore
Type: Float
Required: Yes
Array: No
Default: (none)

# totalStanzas
Type: Integer
Required: Yes
Array: No
Default: (none)
```

## Indexes à créer

1. **userId_index**
   - Type: key
   - Attribut: userId
   - Order: ASC

2. **poemId_index**
   - Type: key
   - Attribut: poemId
   - Order: ASC

3. **createdAt_index**
   - Type: key
   - Attribut: $createdAt
   - Order: DESC

4. **averageScore_index**
   - Type: key
   - Attribut: averageScore
   - Order: DESC

## Permissions

### Create
```
users
```

### Read
```
user:[USER_ID]
```

### Update
```
user:[USER_ID]
```

### Delete
```
user:[USER_ID]
```

**Note:** Ces permissions permettent à chaque utilisateur de créer ses propres résultats et de les gérer (lecture, modification, suppression).

## Variables d'environnement

Ajouter dans votre fichier `.env`:

```env
VITE_APPWRITE_RESULTS_COLLECTION_ID=results
```

(ou remplacer `results` par l'ID de collection généré par Appwrite si différent)

## Vérification

Pour vérifier que tout fonctionne:

```javascript
// Dans la console navigateur après connexion
import { databases, appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'appwrite';

const results = await databases.listDocuments(
  appwriteConfig.databaseId,
  appwriteConfig.resultsCollectionId,
  [Query.limit(5)]
);

console.log('Results:', results);
```

## Structure des données

### Exemple de document
```json
{
  "$id": "unique_id",
  "$createdAt": "2024-01-15T10:30:00.000+00:00",
  "$updatedAt": "2024-01-15T10:30:00.000+00:00",
  "userId": "user_123",
  "poemId": "poem_456",
  "poemTitle": "Demain, dès l'aube",
  "poemAuthor": "Victor Hugo",
  "mode": "complete",
  "answers": "[{\"stanzaId\":1,\"selectedWords\":[...],\"analysis\":\"...\"}]",
  "evaluations": "[{\"score\":15.5,\"feedback\":\"...\",\"strengths\":[...],\"missedPoints\":[...]}]",
  "averageScore": 15.5,
  "totalStanzas": 4
}
```

### Champs JSON stringifiés

**answers** et **evaluations** sont stockés en JSON stringifié car Appwrite ne supporte pas directement les objets complexes. Ils sont automatiquement parsés/stringifiés par les fonctions du service `results.ts`.

## Fonctionnalités

- ✅ Sauvegarde automatique après chaque test
- ✅ Historique complet des résultats
- ✅ Statistiques utilisateur (moyenne, meilleur score, etc.)
- ✅ Page "Suivi" pour visualiser la progression
- ✅ Détail de chaque test avec possibilité de le revoir
- ✅ Suppression de résultats

## Notes importantes

- Les résultats sont sauvegardés **après l'évaluation IA**
- Chaque test génère un nouveau document (pas de mise à jour)
- La suppression est définitive (demande confirmation)
- Les statistiques sont calculées côté client (pas de backend)