# Configuration Appwrite

## 1. Créer un Projet

1. Allez sur https://cloud.appwrite.io/
2. Créez un nouveau projet
3. Notez le **Project ID**

## 2. Créer la Base de Données

1. Dans le projet, allez dans "Databases"
2. Créez une nouvelle database nommée "bac-francais"
3. Notez le **Database ID**

## 3. Créer la Collection "analyses"

### Attributs:

- **userId** (String, required, 36 chars)
- **poemId** (String, required, 100 chars)
- **poemTitle** (String, required, 200 chars)
- **stanzaId** (Integer, required)
- **selectedWords** (String[], required)
- **analysis** (String, required, 10000 chars)
- **score** (Float, optional)
- **feedback** (String, optional, 5000 chars)
- **completed** (Boolean, required, default: false)

### Indexes:

- **userId** (key, ASC)
- **poemId** (key, ASC)
- **completed** (key, ASC)

### Permissions:

- **Create**: `users`
- **Read**: `user:[USER_ID]`
- **Update**: `user:[USER_ID]`
- **Delete**: `user:[USER_ID]`

## 4. Configuration du Projet

Dans Settings → Authentication:

- **Email/Password**: Activé
- **Email OTP**: Activé

## 5. Variables d'Environnement

Ajoutez dans votre `.env`:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=<votre_project_id>
VITE_APPWRITE_DATABASE_ID=<votre_database_id>
VITE_APPWRITE_ANALYSES_COLLECTION_ID=<votre_collection_id>
VITE_OPENROUTER_API_KEY=<votre_openrouter_key>
```

## 6. Test

Lancez l'application et testez la connexion OTP.
