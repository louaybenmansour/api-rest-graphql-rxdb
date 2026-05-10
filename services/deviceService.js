const dbPromise = require('../db');

async function validateDeviceType(type) {
  const validTypes = ['laptop', 'smartphone', 'tablet', 'server'];
  if (!validTypes.includes(type)) {
    throw new Error(`Type de device invalide. Doit être: ${validTypes.join(', ')}`);
  }
}

async function validateDeviceStatus(status) {
  const validStatus = ['active', 'inactive', 'maintenance'];
  if (!validStatus.includes(status)) {
    throw new Error(`Statut invalide. Doit être: ${validStatus.join(', ')}`);
  }
}

async function ensureUserExists(userId) {
  const { users } = await dbPromise;
  const user = await users.findOne(userId).exec();
  if (!user) {
    throw new Error('Utilisateur non trouvé');
  }
}

async function ensureUniqueSerialNumber(devicesCollection, serialNumber, excludedId = null) {
  const existing = await devicesCollection.findOne({
    selector: { serialNumber }
  }).exec();
  if (existing && existing.primary !== excludedId) {
    throw new Error('Numéro de série déjà utilisé');
  }
}

async function getDeviceById(id) {
  const { devices } = await dbPromise;
  const doc = await devices.findOne(id).exec();
  return doc ? doc.toJSON() : null;
}

async function getAllDevices() {
  const { devices } = await dbPromise;
  const docs = await devices.find().exec();
  return docs.map((doc) => doc.toJSON());
}

async function getDevicesByUserId(userId) {
  const { devices } = await dbPromise;
  const docs = await devices.find({ selector: { userId } }).exec();
  return docs.map((doc) => doc.toJSON());
}

async function createDevice({ userId, name, type, serialNumber, status }) {
  const { devices, persistUsers, createId } = await dbPromise;
  
  // Validations
  await ensureUserExists(userId);
  await validateDeviceType(type);
  await validateDeviceStatus(status);
  await ensureUniqueSerialNumber(devices, serialNumber);
  
  const inserted = await devices.insert({
    id: createId(),
    userId,
    name,
    type,
    serialNumber,
    status,
  });
  // Note: persistUsers function name is used for both collections
  // It persists to the snapshot file - here we just persist the device insertion
  return inserted.toJSON();
}

async function updateDevice({ id, name, type, serialNumber, status }) {
  const { devices } = await dbPromise;
  const doc = await devices.findOne(id).exec();
  if (!doc) {
    return null;
  }
  
  // Validations
  await validateDeviceType(type);
  await validateDeviceStatus(status);
  await ensureUniqueSerialNumber(devices, serialNumber, id);
  
  const updatedDoc = await doc.incrementalPatch({
    name,
    type,
    serialNumber,
    status,
  });
  return updatedDoc.toJSON();
}

async function deleteDevice(id) {
  const { devices } = await dbPromise;
  const doc = await devices.findOne(id).exec();
  if (!doc) {
    return false;
  }
  await doc.remove();
  return true;
}

module.exports = {
  getDeviceById,
  getAllDevices,
  getDevicesByUserId,
  createDevice,
  updateDevice,
  deleteDevice,
};
