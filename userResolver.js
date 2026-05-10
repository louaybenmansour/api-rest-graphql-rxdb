const userService = require('./services/userService');
const deviceService = require('./services/deviceService');

module.exports = {
  // User resolvers
  user: async ({ id }) => {
    return userService.getUserWithDevices(id);
  },
  users: async () => {
    return userService.getAllUsers();
  },
  addUser: async ({ name, email, password }) => {
    return userService.createUser({ name, email, password });
  },
  updateUser: async ({ id, name, email, password }) => {
    return userService.updateUser({ id, name, email, password });
  },
  deleteUser: async ({ id }) => {
    return userService.deleteUser(id);
  },
  
  // Device resolvers
  devices: async () => {
    return deviceService.getAllDevices();
  },
  device: async ({ id }) => {
    return deviceService.getDeviceById(id);
  },
  addDevice: async ({ userId, name, type, serialNumber, status }) => {
    return deviceService.createDevice({ userId, name, type, serialNumber, status });
  },
  updateDevice: async ({ id, name, type, serialNumber, status }) => {
    return deviceService.updateDevice({ id, name, type, serialNumber, status });
  },
  deleteDevice: async ({ id }) => {
    return deviceService.deleteDevice(id);
  },
};
