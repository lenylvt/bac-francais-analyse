const sdk = require("node-appwrite");
require("dotenv").config();

const client = new sdk.Client();

client
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);

const databaseId = process.env.VITE_APPWRITE_DATABASE_ID;
const poemsCollectionId = "poems";

async function setupPoemsCollection() {
  try {
    console.log("🚀 Configuration de la collection des poèmes...");

    // 1. Créer la collection
    try {
      const collection = await databases.createCollection(
        databaseId,
        poemsCollectionId,
        "Poèmes",
        [
          sdk.Permission.read(sdk.Role.any()),
          sdk.Permission.create(sdk.Role.users()),
          sdk.Permission.update(sdk.Role.users()),
          sdk.Permission.delete(sdk.Role.users()),
        ],
        false, // documentSecurity
        true, // enabled
      );
      console.log("✅ Collection 'poems' créée");
    } catch (error) {
      if (error.code === 409) {
        console.log("ℹ️  Collection 'poems' existe déjà");
      } else {
        throw error;
      }
    }

    // 2. Créer les attributs
    const attributes = [
      {
        key: "title",
        type: "string",
        size: 255,
        required: true,
        array: false,
        default: null,
      },
      {
        key: "author",
        type: "string",
        size: 255,
        required: true,
        array: false,
        default: null,
      },
      {
        key: "fullText",
        type: "string",
        size: 100000,
        required: true,
        array: false,
        default: null,
      },
      {
        key: "analyses",
        type: "string",
        size: 10000,
        required: false,
        array: false,
        default: null,
      },
    ];

    for (const attr of attributes) {
      try {
        await databases.createStringAttribute(
          databaseId,
          poemsCollectionId,
          attr.key,
          attr.size,
          attr.required,
          attr.default,
          attr.array,
        );
        console.log(`✅ Attribut '${attr.key}' créé`);
      } catch (error) {
        if (error.code === 409) {
          console.log(`ℹ️  Attribut '${attr.key}' existe déjà`);
        } else {
          console.error(`❌ Erreur création attribut '${attr.key}':`, error);
        }
      }
    }

    // 3. Créer les indexes
    console.log("⏳ Attente pour les indexes (5s)...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const indexes = [
      { key: "title_index", type: "key", attributes: ["title"] },
      { key: "author_index", type: "key", attributes: ["author"] },
    ];

    for (const index of indexes) {
      try {
        await databases.createIndex(
          databaseId,
          poemsCollectionId,
          index.key,
          index.type,
          index.attributes,
        );
        console.log(`✅ Index '${index.key}' créé`);
      } catch (error) {
        if (error.code === 409) {
          console.log(`ℹ️  Index '${index.key}' existe déjà`);
        } else {
          console.error(`❌ Erreur création index '${index.key}':`, error);
        }
      }
    }

    console.log("\n✅ Configuration terminée!");
    console.log("\n📝 Informations:");
    console.log(`Database ID: ${databaseId}`);
    console.log(`Collection ID: ${poemsCollectionId}`);
    console.log("\n⚙️  Ajoutez ceci dans votre .env:");
    console.log(`VITE_APPWRITE_POEMS_COLLECTION_ID=${poemsCollectionId}`);
  } catch (error) {
    console.error("\n❌ Erreur lors de la configuration:", error);
    process.exit(1);
  }
}

setupPoemsCollection();
