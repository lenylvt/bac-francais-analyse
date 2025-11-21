# 📚 BAC Français - Analyse Linéaire Interactive

Application web moderne pour analyser des poèmes avec assistance IA et sauvegarde automatique.

## ✨ Fonctionnalités

- **Authentification OTP** : Connexion sécurisée sans mot de passe
- **Sélection interactive** : Cliquez et glissez pour sélectionner les mots clés
- **Analyses multiples** : Créez plusieurs analyses avant soumission
- **Sauvegarde automatique** : Toutes vos analyses sont sauvegardées dans Appwrite
- **Mode Complet/Rapide** : Analysez tout le poème ou des strophes aléatoires
- **Évaluation IA** : Feedback détaillé avec score via OpenRouter
- **Interface responsive** : Design optimisé mobile et desktop

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

### 3. Créer la Collection "analyses"

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
Delete: user:[USER_ID]
```

### 4. Activer l'Authentification OTP

```bash
# Dans Settings → Auth
1. Email/Password: ON
2. Email OTP: ON
```

### 5. Variables d'Environnement

Éditez votre `.env`:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=votre_project_id
VITE_APPWRITE_DATABASE_ID=votre_database_id
VITE_APPWRITE_ANALYSES_COLLECTION_ID=votre_collection_id
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
3. **Cliquez et glissez** sur les mots importants
4. **Rédigez** votre analyse
5. **Enregistrez** (répétez autant de fois que nécessaire)
6. **Revoir** toutes vos analyses via le bouton header
7. **Soumettre à l'IA** pour évaluation complète

### Mode Édition

- Dans le dialogue "Revoir", cliquez "Modifier"
- Les mots et texte se rechargent automatiquement
- Modifiez puis sauvegardez

## 📦 Stack Technique

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS + shadcn/ui
- **Database**: Appwrite (BaaS)
- **Auth**: Appwrite OTP Email
- **IA**: OpenRouter (Grok-2)
- **UI Components**: Radix UI

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
├── lib/
│   └── appwrite/
│       ├── config.ts         # Configuration client
│       ├── auth.ts           # Service auth OTP
│       └── database.ts       # Service analyses
├── services/
│   └── ai.ts                 # Service OpenRouter
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

- **Auto-save**: Chaque "Enregistrer" crée un document
- **Édition**: Mise à jour du document existant
- **Stats**: Analyses totales, complétées, score moyen
- **Historique**: Toutes les analyses par utilisateur

## 📝 Commandes

```bash
npm run dev      # Développement
npm run build    # Build production
npm run preview  # Preview build
npm run lint     # Linter
```

## 🐛 Debugging

### Logs API dans la console

- 🔑 Présence de la clé OpenRouter
- 📡 Status HTTP des requêtes
- ❌ Erreurs détaillées

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

## 🚧 TODO

- [ ] Export PDF des analyses
- [ ] Graphiques de progression
- [ ] Partage d'analyses
- [ ] Mode hors-ligne (PWA)
- [ ] Thème sombre

## 📄 Licence

MIT

---

**Bon courage pour vos analyses ! 🎯📚**