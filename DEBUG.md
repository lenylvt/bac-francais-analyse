# Guide de Débogage - Sauvegarde des Analyses

## Vérifications Préalables

### 1. Vérifier les variables d'environnement
```bash
cat .env | grep APPWRITE
```

Doit afficher:
```
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6920a99a00133b6ef76a
VITE_APPWRITE_DATABASE_ID=6920b9a20012e8f04b22
VITE_APPWRITE_ANALYSES_COLLECTION_ID=6920b9a2003e30f394a7
```

### 2. Tester la connexion à la base de données
```bash
npm run test-db
```

Doit afficher "✨ All tests passed!"

### 3. Relancer le serveur après modification du .env
```bash
# Arrêter le serveur (Ctrl+C)
npm run dev
```

## Logs à surveiller dans la Console

Lors de la connexion:
- `📧 Sending OTP to: <email>`
- `✅ OTP sent successfully`
- `🔐 Verifying OTP`
- `✅ Session created successfully`
- `✅ User authenticated: <email>`

Lors de la sauvegarde:
- `📝 Creating analysis with data:`
- `🔧 Using config:` (vérifier les IDs)
- `✅ Analysis created successfully`

## Erreurs Courantes

### "Missing or invalid credentials"
→ Le .env n'est pas chargé. Relancez le serveur.

### "Document not found"
→ Mauvais databaseId ou collectionId dans le .env

### "Unauthorized"
→ L'utilisateur n'est pas authentifié. Vérifier la session.

### "Invalid permissions"
→ Permissions de la collection incorrectes. Vérifier dans Appwrite Console.

## Tests Manuels

1. **Se connecter avec OTP**
   - Entrer email → recevoir code
   - Entrer code → connexion réussie

2. **Sélectionner un poème**
   - Voir la liste des poèmes
   - Cliquer sur un poème

3. **Faire une analyse**
   - Sélectionner des mots
   - Écrire une analyse
   - Cliquer "Enregistrer"
   - Vérifier dans la console: "✅ Analysis created successfully"

4. **Vérifier dans Appwrite Console**
   - Aller sur https://cloud.appwrite.io
   - Databases → bac-francais → analyses
   - Voir le document créé

## Activer les logs détaillés

Dans la console du navigateur:
```javascript
// Voir tous les logs Appwrite
localStorage.debug = 'appwrite:*'
```

Puis recharger la page.
