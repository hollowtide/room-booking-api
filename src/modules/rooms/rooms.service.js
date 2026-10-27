const { NotFoundError } = require("../../errors/AppError");

function createRoomsService({ runInTransaction }) {
  async function listRooms() {
    return runInTransaction(({ rooms }) => rooms.findAll());
  }

  async function getRoom(id) {
    return runInTransaction(async ({ rooms }) => {
      const room = await rooms.findById(id);
      if (!room) throw new NotFoundError("Room");
      return room;
    });
  }

  async function createRoom(input) {
    return runInTransaction(async ({ buildings, rooms }) => {
      const building = await buildings.findById(input.buildingId);
      if (!building) throw new NotFoundError("Building");
      return rooms.create(input);
    });
  }

  async function updateRoom(id, changes) {
    return runInTransaction(async ({ rooms }) => {
      const room = await rooms.findById(id);
      if (!room) throw new NotFoundError("Room");
      return rooms.update(id, changes);
    });
  }

  async function deleteRoom(id) {
    return runInTransaction(async ({ rooms }) => {
      const room = await rooms.findById(id);
      if (!room) throw new NotFoundError("Room");
      await rooms.delete(id);
    });
  }

  return { listRooms, getRoom, createRoom, updateRoom, deleteRoom };
}

module.exports = { createRoomsService };
