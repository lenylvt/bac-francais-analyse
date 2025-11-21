import { Client, Account, Databases } from "appwrite";

const client = new Client();

const endpoint =
  import.meta.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || "";

console.log("🔧 Appwrite Config:", {
  endpoint,
  projectId: projectId ? projectId.substring(0, 8) + "..." : "MISSING",
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || "MISSING",
  collectionId:
    import.meta.env.VITE_APPWRITE_ANALYSES_COLLECTION_ID || "MISSING",
});

if (!projectId) {
  console.error("❌ VITE_APPWRITE_PROJECT_ID is missing!");
}

client.setEndpoint(endpoint).setProject(projectId);

export const account = new Account(client);
export const databases = new Databases(client);

export const appwriteConfig = {
  endpoint,
  projectId,
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || "",
  analysesCollectionId:
    import.meta.env.VITE_APPWRITE_ANALYSES_COLLECTION_ID || "",
  resultsCollectionId:
    import.meta.env.VITE_APPWRITE_RESULTS_COLLECTION_ID || "",
};

export { client };
