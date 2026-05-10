const fs = require("fs/promises");
const path = require("path");
const { createHash, randomUUID } = require("crypto");
const { createRxDatabase } = require("rxdb");
const { getRxStorageMemory } = require("rxdb/plugins/storage-memory");
const { wrappedValidateAjvStorage } = require("rxdb/plugins/validate-ajv");
const DATA_DIR = path.join(__dirname, "data");
const SNAPSHOT_FILE = path.join(DATA_DIR, "users.snapshot.json");
const userSchema = {
  title: "user schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    name: { type: "string", minLength: 1, maxLength: 120 },
    email: { type: "string", minLength: 3, maxLength: 190 },
    password: { type: "string", minLength: 1, maxLength: 255 },
  },
  required: ["id", "name", "email", "password"],
  indexes: ["email"],
};
const deviceSchema = {
  title: 'device schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    userId: { type: 'string', maxLength: 100 },
    name: { type: 'string', minLength: 1, maxLength: 255 },
    type: { type: 'string', enum: ['laptop', 'smartphone', 'tablet', 'server'] },
    serialNumber: { type: 'string', minLength: 1, maxLength: 255 },
    status: { type: 'string', enum: ['active', 'inactive', 'maintenance'] }
  },
  required: ['id', 'userId', 'name', 'type', 'serialNumber', 'status'],
  indexes: ['userId', 'serialNumber']
};

async function hashFunction(input) {
  if (input instanceof ArrayBuffer) {
    input = Buffer.from(input);
  }
  if (typeof Blob !== "undefined" && input instanceof Blob) {
    input = Buffer.from(await input.arrayBuffer());
  }
  if (!Buffer.isBuffer(input)) {
    input = Buffer.from(String(input));
  }
  return createHash("sha256").update(input).digest("hex");
}
async function loadSnapshot() {
  try {
    const raw = await fs.readFile(SNAPSHOT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
async function persistUsers(collection) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const docs = await collection.find().exec();
  const users = docs.map((doc) => doc.toJSON());
  await fs.writeFile(SNAPSHOT_FILE, JSON.stringify(users, null, 2), "utf8");
}
async function initDatabase() {
  const storage = wrappedValidateAjvStorage({
    storage: getRxStorageMemory(),
  });
  const db = await createRxDatabase({
    name: "tp7-rxdb-memory",
    storage,
    eventReduce: true,
    multiInstance: false,
    hashFunction,
  });
  await db.addCollections({
    users: { schema: userSchema },
    devices: { schema: deviceSchema },
  });
  const initialUsers = await loadSnapshot();
  if (initialUsers.length > 0) {
    await db.users.bulkInsert(initialUsers);
  }
  return {
    db,
    users: db.users,
    devices: db.devices,
    persistUsers,
    createId: () => randomUUID(),
  };
}
module.exports = initDatabase();
