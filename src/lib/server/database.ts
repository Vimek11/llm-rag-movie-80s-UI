// Base de datos deshabilitada - sin conexión a MongoDB
import { logger } from "$lib/server/logger";
import { building } from "$app/environment";

export const CONVERSATION_STATS_COLLECTION = "conversations.stats";

// Mock cursor methods that can be chained
class MockCursor {
	toArray = async () => [];
	project = () => new MockCursor();
	sort = () => new MockCursor();
	limit = () => new MockCursor();
	skip = () => new MockCursor();
	next = async () => null;
}

// Mock implementation para reemplazar las colecciones de MongoDB
class MockCollection {
	find() {
		return new MockCursor();
	}

	async findOne() {
		return null;
	}

	async insertOne() {
		return { insertedId: "mock-id" };
	}

	async updateOne() {
		return { modifiedCount: 0 };
	}
	
	async deleteOne() {
		return { deletedCount: 0 };
	}

	async deleteMany() {
		return { deletedCount: 0 };
	}

	async countDocuments() {
		return 0;
	}

	async createIndex() {
		return "mock-index";
	}

	aggregate() {
		return {
			toArray: async () => [],
			next: async () => null,
			[Symbol.asyncIterator]: async function* () {
				// Empty generator
			}
		};
	}

	async insertMany() {
		return { insertedIds: {} };
	}

	async replaceOne() {
		return { modifiedCount: 0 };
	}

	async distinct() {
		return [];
	}
}

// Mock GridFS bucket
class MockGridFSBucket {
	openUploadStream() {
		return {
			write: () => {},
			end: () => {},
			on: () => {},
		};
	}

	openDownloadStream() {
		return {
			pipe: () => {},
			on: () => {},
		};
	}
}

// Mock MongoDB client
class MockMongoClient {
	async connect() {
		return this;
	}

	async close() {
		return;
	}

	db() {
		return {
			admin: () => ({
				listCollections: () => ({
					toArray: async () => []
				})
			})
		};
	}
}

export class Database {
	private static instance: Database;
	private mockClient = new MockMongoClient();

	public static async getInstance(): Promise<Database> {
		if (!Database.instance) {
			Database.instance = new Database();
		}
		return Database.instance;
	}

	public getClient() {
		return this.mockClient;
	}

	public getCollections() {
		logger.info("Usando colecciones mock (MongoDB deshabilitado)");
		
		const mockCollection = new MockCollection();
		const mockBucket = new MockGridFSBucket();

		return {
			conversations: mockCollection,
			conversationStats: mockCollection,
			assistants: mockCollection,
			assistantStats: mockCollection,
			reports: mockCollection,
			sharedConversations: mockCollection,
			abortedGenerations: mockCollection,
			settings: mockCollection,
			users: mockCollection,
			sessions: mockCollection,
			messageEvents: mockCollection,
			bucket: mockBucket,
			migrationResults: mockCollection,
			semaphores: mockCollection,
			tokenCaches: mockCollection,
			tools: mockCollection,
			config: mockCollection,
		};
	}
}

export let collections: ReturnType<typeof Database.prototype.getCollections>;

export const ready = (async () => {
	if (!building) {
		const db = await Database.getInstance();
		collections = db.getCollections();
	} else {
		collections = {} as unknown as ReturnType<typeof Database.prototype.getCollections>;
	}
})();

export async function getCollectionsEarly(): Promise<
	ReturnType<typeof Database.prototype.getCollections>
> {
	await ready;
	if (!collections) {
		throw new Error("Database not initialized");
	}
	return collections;
}

