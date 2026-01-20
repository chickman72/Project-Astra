import { CosmosClient, Database, Container } from "@azure/cosmos";

const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
const cosmosKey = process.env.COSMOS_KEY;

if (!cosmosEndpoint || !cosmosKey) {
  throw new Error(
    "Missing Cosmos DB configuration: COSMOS_ENDPOINT or COSMOS_KEY"
  );
}

let client: CosmosClient | null = null;
let database: Database | null = null;
let remixesContainer: Container | null = null;
let initialized = false;

/**
 * Initialize Cosmos DB client and ensure database/container exist
 */
async function initializeCosmosDB(): Promise<void> {
  if (initialized) return;

  try {
    console.log("[initializeCosmosDB] Starting initialization...");
    console.log("[initializeCosmosDB] Endpoint:", cosmosEndpoint);
    
    client = new CosmosClient({
      endpoint: cosmosEndpoint,
      key: cosmosKey,
    });

    console.log("[initializeCosmosDB] CosmosClient created");

    // Ensure database exists
    const { database: db } = await client.databases.createIfNotExists({
      id: "AstralDB",
    });
    database = db;
    console.log("✓ Database 'AstralDB' ready");

    // Ensure container exists with partition key /userId
    const { container } = await database.containers.createIfNotExists({
      id: "Remixes",
      partitionKey: {
        paths: ["/userId"],
      },
    });
    remixesContainer = container;
    console.log("✓ Container 'Remixes' ready with partition key /userId");

    initialized = true;
  } catch (error) {
    console.error("Failed to initialize Cosmos DB:", error);
    throw error;
  }
}

/**
 * Get the Remixes container, initializing if needed
 */
export async function getRemixesContainer(): Promise<Container> {
  await initializeCosmosDB();
  if (!remixesContainer) {
    throw new Error("Failed to initialize Remixes container - no container available");
  }
  console.log("[getRemixesContainer] Returning container with ID:", remixesContainer.id);
  return remixesContainer;
}

/**
 * Ensure initialization on module load (for server-side startup)
 */
if (typeof window === "undefined") {
  // Server-side only
  initializeCosmosDB().catch((err) => {
    console.error("Cosmos DB initialization error at startup:", err);
  });
}
