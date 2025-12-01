# 📚 BAC Français - Analyse Linéaire Interactive

Application web moderne pour analyser des poèmes avec assistance IA, sauvegarde automatique et intégration **Craft Collections API**.

> 🏆 **Submitted for [Craft Winter Challenge 2024](https://craft.do)** - See full submission: [WINTER_CHALLENGE_POST.md](./WINTER_CHALLENGE_POST.md)

**🌐 Live Demo:** [https://your-app-url.com](https://your-app-url.com)
**📦 GitHub:** [https://github.com/yourusername/bac-francais](https://github.com/yourusername/bac-francais)

## ✨ Fonctionnalités

### 🎯 Pour les Étudiants
- **Authentification OTP** : Connexion sécurisée sans mot de passe
- **Sélection interactive** : Cliquez et glissez pour sélectionner les mots clés
- **Analyses multiples** : Créez plusieurs analyses avant soumission
- **Sauvegarde automatique** : Toutes vos analyses sont sauvegardées dans Appwrite
- **Reprise d'analyse** : Continuez une analyse non terminée automatiquement
- **Évaluation IA** : Feedback détaillé avec score via OpenRouter
- **Mode Complet/Rapide** : Analysez tout le poème ou des strophes aléatoires
- **Interface responsive** : Design optimisé mobile et desktop
- **Thème sombre/clair** : Personnalisez votre expérience

### 🎨 Intégration Craft API
- **📚 Collections API** : Gestion des poèmes via Craft Collections
- **🔄 Synchronisation temps réel** : Les poèmes sont chargés depuis Craft
- **📝 Analyses liées** : Récupération automatique des analyses liées à d'autres documents
- **🎛️ Toggle Published** : Contrôle de visibilité directement depuis Craft
- **🚀 Chargement progressif** : Affichage des poèmes au fur et à mesure
- **✨ Interface de gestion** : Créez du contenu avec la belle UI de Craft
- **🧹 Nettoyage automatique** : Suppression des balises Craft (`<callout>`, etc.)

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos clés API
```

## 🔧 Configuration Appwrite

### 1. Créer un Projet Appwrite

1. Allez sur [cloud.appwrite.io](https://cloud.appwrite.io/)
2. Créez un nouveau projet
3. Notez le **Project ID**

### 2. Créer la Base de Données

```bash
# Dans la console Appwrite
1. Databases → Create Database
2. Nom: "bac-francais"
3. Notez le Database ID
```

### 3. Créer la Collection "poems"

**Attributs à créer:**

| Attribut | Type | Requis | Taille/Défaut |
|----------|------|--------|---------------|
| title | String | ✅ | 200 |
| author | String | ✅ | 200 |
| fullText | String | ✅ | 50000 |
| analyses | String | ❌ | 100000 |

**Note importante**: L'attribut `analyses` contient l'analyse de référence complète du poème. Cette analyse sera automatiquement incluse lors de la soumission à l'IA pour enrichir l'évaluation.

**Permissions:**

```
Create: admin only
Read: any
Update: admin only
Delete: admin only
```

### 4. Créer la Collection "analyses"

**Attributs à créer:**

| Attribut | Type | Requis | Taille/Défaut |
|----------|------|--------|---------------|
| userId | String | ✅ | 36 |
| poemId | String | ✅ | 100 |
| poemTitle | String | ✅ | 200 |
| stanzaId | Integer | ✅ | - |
| selectedWords | String[] | ✅ | - |
| analysis | String | ✅ | 10000 |
| score | Float | ❌ | - |
| feedback | String | ❌ | 5000 |
| completed | Boolean | ✅ | false |

**Indexes à créer:**

- `userId_index` : key "userId" (ASC)
- `poemId_index` : key "poemId" (ASC)
- `completed_index` : key "completed" (ASC)

**Permissions:**

```
Create: users
Read: user:[USER_ID]
Update: user:[USER_ID]
Delete: none (pas nécessaire)
```

### 5. Activer l'Authentification OTP

```bash
# Dans Settings → Auth
1. Email/Password: ON
2. Email OTP: ON
```

### 6. Variables d'Environnement

Éditez votre `.env`:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=votre_project_id
VITE_APPWRITE_DATABASE_ID=votre_database_id
VITE_APPWRITE_ANALYSES_COLLECTION_ID=votre_collection_analyses_id
VITE_APPWRITE_POEMS_COLLECTION_ID=votre_collection_poems_id
VITE_OPENROUTER_API_KEY=sk-or-v1-...
```

## 🎯 Lancer l'Application

```bash
npm run dev
```

Ouvrez http://localhost:5173

## 📖 Utilisation

### Première Connexion

1. Entrez votre email
2. Recevez le code à 6 chiffres
3. Entrez le code pour vous connecter

### Analyse d'un Poème

1. **Sélectionnez** un poème sur la page d'accueil
2. **Choisissez** le mode (Complet ou Rapide)
3. **Reprise automatique** : Si une analyse est en cours, dialogue de reprise
4. **Cliquez et glissez** sur les mots importants
5. **Rédigez** votre analyse dans le champ texte
6. **Enregistrez** (répétez autant de fois que nécessaire)
7. **Revoir** toutes vos analyses via le bouton header
8. **Soumettre à l'IA** : Combine TOUTES vos analyses + analyse de référence DB du poème pour évaluation complète

### Reprise d'Analyse

- À l'ouverture : détection automatique des analyses non terminées
- **Reprendre** : Restaure toutes les analyses précédentes
- **Nouvelle analyse** : Marque les anciennes comme terminées et recommence

### Mode Édition

- Dans le dialogue "Revoir", cliquez sur l'icône œil
- Les mots et texte se rechargent automatiquement
- Modifiez puis sauvegardez

## 📦 Stack Technique

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS + shadcn/ui
- **Content Management**: Craft Collections API 🎨
- **Database**: Appwrite (BaaS) + Craft
- **Auth**: Appwrite OTP Email
- **IA**: OpenRouter (Grok-2)
- **UI Components**: Radix UI

## 🎨 Craft API Integration

This project uses **Craft's Collections API** to manage poems and analyses:

```typescript
// Fetch collections
const collections = await fetch('/api/v1/collections');
const poemsCollection = collections.items.find(c => c.name === 'Analyse');

// Get collection items with content
const items = await fetch(`/api/v1/collections/${id}/items?maxDepth=-1`);

// Progressive loading
for (const item of items) {
  const poem = await parsePoemFromCollectionItem(item);
  displayPoem(poem); // Show immediately
}
```

### Craft Collection Structure

**Collection Name:** `Analyse`

**Properties:**
- `name` (Text) - Poem title
- `author` (Text) - Poet name
- `analyse` (Text/Link) - Literary analysis (can be text or linked document)
- `published` (Boolean) - Visibility toggle

**Content:** Full poem text in the collection item's page

See [CRAFT_API_USAGE.md](./CRAFT_API_USAGE.md) for detailed setup instructions.

## 📂 Structure

```
src/
├── components/
│   ├── Auth.tsx              # Authentification OTP
│   ├── PoemSelector.tsx      # Page d'accueil
│   ├── ModeSelector.tsx      # Sélection mode
│   ├── StanzaAnalysis.tsx    # Composant principal
│   ├── ResultsView.tsx       # Résultats
│   └── ui/                   # shadcn components
├── hooks/
│   ├── usePreloadAPI.ts      # Preload API connection
│   ├── useTheme.tsx          # Gestion thème sombre/clair
│   └── use-toast.ts          # Toast notifications
├── lib/
│   └── appwrite/
│       ├── config.ts         # Configuration client
│       ├── auth.ts           # Service auth OTP
│       └── database.ts       # Service analyses
├── services/
│   └── ai.ts                 # Service OpenRouter + cache
├── utils/
│   └── cache.ts              # Cache API responses
├── types/
│   └── index.ts              # Types TypeScript
└── data/
    └── poems.json            # Poèmes classiques
```

## 🎨 Design

### Desktop
- Layout 2 colonnes: texte full width + sidebar 340px
- Header compact avec bouton "Revoir (X)"
- Sidebar fixe: sélection + analyse + bouton

### Mobile
- Layout vertical: texte scroll + bottom fixe
- Sélection et analyse en bas de page

### Interactions
- **Drag selection**: Cliquez + glissez sur les mots
- **Hover effects**: Survol subtil sur desktop
- **Animations**: 150-200ms transitions

## 🔑 API OpenRouter

```typescript
POST https://openrouter.ai/api/v1/chat/completions
Headers:
  Authorization: Bearer <KEY>
  Content-Type: application/json
Body:
  model: "x-ai/grok-2-1212"
  messages: [...]
```

## 💾 Sauvegarde Automatique

Toutes les analyses sont automatiquement sauvegardées dans Appwrite:

- **Auto-save**: Chaque "Enregistrer" crée/met à jour un document
- **Reprise**: Détection automatique des analyses non terminées
- **Édition**: Mise à jour du document existant via currentAnalysisId
- **Combinaison intelligente**: Soumission combine :
  - Toutes les analyses locales (Analyse 1, 2, 3...)
  - Analyses sauvegardées dans DB (collection analyses)
  - Analyse de référence complète (attribut `analyses` du poème passé via App.tsx)
- **Nettoyage automatique**: 
  - Au chargement : suppression des analyses marquées complétées
  - À la soumission : suppression de toutes les analyses DB utilisées
  - Les résultats sont sauvegardés dans la collection `results`
- **Stats**: Analyses totales, complétées, score moyen
- **Historique**: Toutes les analyses par utilisateur

## ⚡ Optimisations Performances

### API Preloading
- DNS prefetch vers openrouter.ai au démarrage
- Connexion TCP préétablie
- Première requête ~200ms plus rapide

### Cache Intelligent
- Cache en mémoire pour réponses identiques
- TTL: 10 minutes pour évaluations
- Cleanup automatique toutes les 5 minutes
- Évite requêtes API dupliquées

### Parsing JSON Robuste
- Détection et suppression code blocks markdown
- Nettoyage caractères spéciaux et line breaks
- Suppression trailing commas
- Gestion erreurs détaillée avec logs
- Retry automatique en cas d'erreur format

### Optimisations React
- `useMemo` pour calculs coûteux (conversion poèmes)
- Skeleton loading pendant évaluation IA
- États minimaux (suppression des états inutilisés)

## 📝 Commandes

```bash
npm run dev      # Développement
npm run build    # Build production
npm run preview  # Preview build
npm run lint     # Linter
```

## 🐛 Debugging

### Logs API dans la console

- Cache hits affichés dans console
- Erreurs détaillées avec contexte

### Vérifier Appwrite

```bash
# Tester la connexion
console.log(await account.get())

# Lister les analyses
console.log(await databases.listDocuments(...))
```

## 🔒 Sécurité

- **OTP Email**: Pas de mot de passe stocké
- **Permissions**: Document-level (user:[USER_ID])
- **Variables d'env**: Jamais committées
- **Session**: Gérée par Appwrite SDK

## 📱 Responsive Breakpoints

- Mobile: < 768px (vertical)
- Desktop: ≥ 768px (2 colonnes)

## 🚧 Améliorations récentes

- [x] Thème sombre/clair avec toggle
- [x] Reprise automatique d'analyses non terminées
- [x] Combinaison analyses multiples + DB + référence
- [x] Nettoyage code inutilisé
- [x] Fix couleurs boutons en mode sombre
- [x] Compteur analyses dans bouton de soumission
- [x] Utilisation attribut `analyses` DB pour analyse de référence
- [x] Prompt IA amélioré pour analyses multiples
- [x] Nettoyage automatique analyses complétées (pas d'accumulation)
- [x] Parsing JSON robuste avec nettoyage automatique
- [x] Priorité analyses : DB > linearAnalysis > basique
- [x] Fix transmission analyse référence depuis App.tsx vers IA

## 🚧 TODO

- [ ] Export PDF des analyses
- [ ] Graphiques de progression
- [ ] Partage d'analyses
- [ ] Mode hors-ligne (PWA)
- [ ] Service Worker pour cache persistant
- [ ] Prefetch poèmes suivants

## 📄 Licence

MIT

---

**Bon courage pour vos analyses ! 🎯📚**