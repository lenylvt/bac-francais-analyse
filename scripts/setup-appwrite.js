import { Client, Databases, ID, Permission, Role } from "node-appwrite";

// Configuration from env
const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6920a99a00133b6ef76a";
const APPWRITE_API_KEY =
  "standard_08e2d7992e5c633f955e1ac5376dd236bcc22854353a2d15933385a5b2570078f236a8eb4af8cb1cbc562708338cc0c34ebd81a473fce97aca72c97fa13794e84430ab035d84b9ab118c5b25bef30096d72aca9e003488d78fa05fdc9c4adf2578fed3bf37531f9038ae64ecc3a5830d0a7802fbc36bca0bed616a1b89ed8729";

const DATABASE_NAME = "bac-francais";
const COLLECTION_NAME = "analyses";

// Initialize client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function setup() {
  try {
    console.log("🚀 Starting Appwrite setup...\n");

    // 1. Create Database
    console.log("📦 Creating database...");
    let databaseId;
    try {
      const database = await databases.create(
        ID.unique(),
        DATABASE_NAME,
        true, // enabled
      );
      databaseId = database.$id;
      console.log(`✅ Database created: ${databaseId}\n`);
    } catch (error) {
      if (error.code === 409) {
        // Database already exists, list and find it
        console.log("⚠️  Database already exists, finding it...");
        const databasesList = await databases.list();
        const existingDb = databasesList.databases.find(
          (db) => db.name === DATABASE_NAME,
        );
        if (existingDb) {
          databaseId = existingDb.$id;
          console.log(`✅ Using existing database: ${databaseId}\n`);
        } else {
          throw new Error("Database exists but couldn't find it");
        }
      } else {
        throw error;
      }
    }

    // 2. Create Collection
    console.log("📝 Creating collection...");
    let collectionId;
    try {
      const collection = await databases.createCollection(
        databaseId,
        ID.unique(),
        COLLECTION_NAME,
        [
          Permission.create(Role.users()),
          Permission.read(Role.users()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ],
        true, // documentSecurity
        true, // enabled
      );
      collectionId = collection.$id;
      console.log(`✅ Collection created: ${collectionId}\n`);
    } catch (error) {
      if (error.code === 409) {
        console.log("⚠️  Collection already exists, finding it...");
        const collectionsList = await databases.listCollections(databaseId);
        const existingCollection = collectionsList.collections.find(
          (col) => col.name === COLLECTION_NAME,
        );
        if (existingCollection) {
          collectionId = existingCollection.$id;
          console.log(`✅ Using existing collection: ${collectionId}\n`);
        } else {
          throw new Error("Collection exists but couldn't find it");
        }
      } else {
        throw error;
      }
    }

    // 3. Create Attributes
    console.log("🔧 Creating attributes...");

    const attributes = [
      {
        key: "userId",
        type: "string",
        size: 36,
        required: true,
        description: "User ID",
      },
      {
        key: "poemId",
        type: "string",
        size: 100,
        required: true,
        description: "Poem ID",
      },
      {
        key: "poemTitle",
        type: "string",
        size: 200,
        required: true,
        description: "Poem Title",
      },
      {
        key: "stanzaId",
        type: "integer",
        required: true,
        description: "Stanza ID",
      },
      {
        key: "selectedWords",
        type: "string",
        size: 5000,
        required: true,
        array: true,
        description: "Selected words",
      },
      {
        key: "analysis",
        type: "string",
        size: 10000,
        required: true,
        description: "User analysis text",
      },
      {
        key: "score",
        type: "double",
        required: false,
        description: "AI evaluation score",
      },
      {
        key: "feedback",
        type: "string",
        size: 5000,
        required: false,
        description: "AI feedback",
      },
      {
        key: "missedPoints",
        type: "string",
        size: 3000,
        required: false,
        array: true,
        description: "Missed points from AI",
      },
      {
        key: "strengths",
        type: "string",
        size: 3000,
        required: false,
        array: true,
        description: "Strengths from AI",
      },
      {
        key: "completed",
        type: "boolean",
        required: false,
        default: false,
        description: "Analysis completed and evaluated",
      },
    ];

    for (const attr of attributes) {
      try {
        if (attr.type === "string") {
          await databases.createStringAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.size,
            attr.required,
            attr.default,
            attr.array || false,
          );
        } else if (attr.type === "integer") {
          await databases.createIntegerAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.required,
            null,
            null,
            attr.default,
          );
        } else if (attr.type === "double") {
          await databases.createFloatAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.required,
            null,
            null,
            attr.default,
          );
        } else if (attr.type === "boolean") {
          await databases.createBooleanAttribute(
            databaseId,
            collectionId,
            attr.key,
            attr.required,
            attr.default,
          );
        }
        console.log(`  ✅ ${attr.key} (${attr.type})`);
      } catch (error) {
        if (error.code === 409) {
          console.log(`  ⚠️  ${attr.key} already exists`);
        } else {
          console.error(`  ❌ Error creating ${attr.key}:`, error.message);
        }
      }
    }

    // Wait for attributes to be created
    console.log("\n⏳ Waiting for attributes to be ready...");
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // 4. Create Indexes
    console.log("\n📊 Creating indexes...");

    const indexes = [
      {
        key: "userId_index",
        type: "key",
        attributes: ["userId"],
        orders: ["ASC"],
      },
      {
        key: "poemId_index",
        type: "key",
        attributes: ["poemId"],
        orders: ["ASC"],
      },
      {
        key: "completed_index",
        type: "key",
        attributes: ["completed"],
        orders: ["ASC"],
      },
      {
        key: "user_poem_index",
        type: "key",
        attributes: ["userId", "poemId"],
        orders: ["ASC", "ASC"],
      },
    ];

    for (const index of indexes) {
      try {
        await databases.createIndex(
          databaseId,
          collectionId,
          index.key,
          index.type,
          index.attributes,
          index.orders,
        );
        console.log(`  ✅ ${index.key}`);
      } catch (error) {
        if (error.code === 409) {
          console.log(`  ⚠️  ${index.key} already exists`);
        } else {
          console.error(`  ❌ Error creating ${index.key}:`, error.message);
        }
      }
    }

    console.log("\n✨ Setup completed successfully!\n");
    console.log("📋 Add these to your .env file:\n");
    console.log(`VITE_APPWRITE_ENDPOINT=${APPWRITE_ENDPOINT}`);
    console.log(`VITE_APPWRITE_PROJECT_ID=${APPWRITE_PROJECT_ID}`);
    console.log(`VITE_APPWRITE_DATABASE_ID=${databaseId}`);
    console.log(`VITE_APPWRITE_ANALYSES_COLLECTION_ID=${collectionId}`);
    console.log("");
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
}

setup();
