import { Client, Databases, Account } from "node-appwrite";

const APPWRITE_ENDPOINT = "https://fra.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6920a99a00133b6ef76a";
const APPWRITE_API_KEY =
  "standard_08e2d7992e5c633f955e1ac5376dd236bcc22854353a2d15933385a5b2570078f236a8eb4af8cb1cbc562708338cc0c34ebd81a473fce97aca72c97fa13794e84430ab035d84b9ab118c5b25bef30096d72aca9e003488d78fa05fdc9c4adf2578fed3bf37531f9038ae64ecc3a5830d0a7802fbc36bca0bed616a1b89ed8729";
const DATABASE_ID = "6920b9a20012e8f04b22";
const COLLECTION_ID = "6920b9a2003e30f394a7";

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);
const account = new Account(client);

async function testConnection() {
  console.log("🧪 Testing Appwrite Connection...\n");

  try {
    // Test 1: Project connection
    console.log("1️⃣ Testing project connection...");
    const health = await fetch(`${APPWRITE_ENDPOINT}/health`);
    if (health.ok) {
      console.log("✅ Appwrite endpoint is reachable\n");
    }

    // Test 2: Database exists
    console.log("2️⃣ Testing database access...");
    const database = await databases.get(DATABASE_ID);
    console.log(`✅ Database found: ${database.name} (${database.$id})\n`);

    // Test 3: Collection exists
    console.log("3️⃣ Testing collection access...");
    const collection = await databases.getCollection(DATABASE_ID, COLLECTION_ID);
    console.log(`✅ Collection found: ${collection.name} (${collection.$id})`);
    console.log(`   Attributes: ${collection.attributes.length}`);
    console.log(`   Indexes: ${collection.indexes.length}\n`);

    // Test 4: List attributes
    console.log("4️⃣ Collection attributes:");
    collection.attributes.forEach((attr) => {
      console.log(
        `   - ${attr.key}: ${attr.type} ${attr.required ? "(required)" : "(optional)"}`,
      );
    });
    console.log("");

    // Test 5: List indexes
    console.log("5️⃣ Collection indexes:");
    collection.indexes.forEach((index) => {
      console.log(`   - ${index.key}: ${index.attributes.join(", ")}`);
    });
    console.log("");

    // Test 6: Check permissions
    console.log("6️⃣ Collection permissions:");
    console.log(`   Document Security: ${collection.documentSecurity}`);
    console.log(`   Permissions: ${collection.$permissions.join(", ")}\n`);

    // Test 7: Try to list documents
    console.log("7️⃣ Testing document listing...");
    const documents = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);
    console.log(`✅ Found ${documents.total} document(s) in collection\n`);

    console.log("✨ All tests passed! Database is ready to use.\n");
    console.log("📋 Configuration for .env:");
    console.log(`VITE_APPWRITE_ENDPOINT=${APPWRITE_ENDPOINT}`);
    console.log(`VITE_APPWRITE_PROJECT_ID=${APPWRITE_PROJECT_ID}`);
    console.log(`VITE_APPWRITE_DATABASE_ID=${DATABASE_ID}`);
    console.log(`VITE_APPWRITE_ANALYSES_COLLECTION_ID=${COLLECTION_ID}`);
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    if (error.type) {
      console.error(`   Type: ${error.type}`);
    }
    process.exit(1);
  }
}

testConnection();
