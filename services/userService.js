const dbPromise = require('../db');

async function findByEmail(usersCollection, email) {
  return usersCollection
    .findOne({
      selector: { email },
    })
    .exec();
}

async function ensureUniqueEmail(usersCollection, email, excludedId = null) {
  const existing = await findByEmail(usersCollection, email);
  if (existing && existing.primary !== excludedId) {
    throw new Error('Adresse e-mail déjà utilisée');
  }
}

async function getUserById(id) {
  const { users } = await dbPromise;
  const doc = await users.findOne(id).exec();
  return doc ? doc.toJSON() : null;
}

async function getAllUsers() {
  const { users } = await dbPromise;
  const docs = await users.find().exec();
  return docs.map((doc) => doc.toJSON());
}

async function createUser({ name, email, password }) {
  const { users, persistUsers, createId } = await dbPromise;
  await ensureUniqueEmail(users, email);
  const inserted = await users.insert({
    id: createId(),
    name,
    email,
    password,
  });
  await persistUsers(users);
  return inserted.toJSON();
}

async function updateUser({ id, name, email, password }) {
  const { users, persistUsers } = await dbPromise;
  const doc = await users.findOne(id).exec();
  if (!doc) {
    return null;
  }
  await ensureUniqueEmail(users, email, id);
  const updatedDoc = await doc.incrementalPatch({
    name,
    email,
    password,
  });
  await persistUsers(users);
  return updatedDoc.toJSON();
}

async function deleteUser(id) {
  const { users, devices, persistUsers } = await dbPromise;
  const doc = await users.findOne(id).exec();
  if (!doc) {
    return false;
  }
  
  // Supprimer automatiquement les devices associés
  const userDevices = await devices.find({ selector: { userId: id } }).exec();
  for (const device of userDevices) {
    await device.remove();
  }
  
  await doc.remove();
  await persistUsers(users);
  
  return true;
}

async function getUserWithDevices(id) {
  const { devices } = await dbPromise;
  const user = await getUserById(id);
  if (!user) {
    return null;
  }
  const userDevices = await devices.find({ selector: { userId: id } }).exec();
  user.devices = userDevices.map((doc) => doc.toJSON());
  return user;
}

module.exports = {
  getUserById,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserWithDevices,
};
