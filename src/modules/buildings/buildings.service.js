const { NotFoundError } = require("../../errors/AppError");

function createBuildingsService({ runInTransaction }) {
  async function listBuildings() {
    return runInTransaction(({ buildings }) => buildings.findAll());
  }

  async function getBuilding(id) {
    return runInTransaction(async ({ buildings }) => {
      const building = await buildings.findById(id);
      if (!building) throw new NotFoundError("Building");
      return building;
    });
  }

  async function createBuilding(input) {
    return runInTransaction(({ buildings }) => buildings.create(input));
  }

  async function updateBuilding(id, changes) {
    return runInTransaction(async ({ buildings }) => {
      const building = await buildings.findById(id);
      if (!building) throw new NotFoundError("Building");
      return buildings.update(id, changes);
    });
  }

  async function deleteBuilding(id) {
    return runInTransaction(async ({ buildings }) => {
      const building = await buildings.findById(id);
      if (!building) throw new NotFoundError("Building");
      await buildings.delete(id);
    });
  }

  async function listBuildingRooms(id) {
    return runInTransaction(async ({ buildings, rooms }) => {
      const building = await buildings.findById(id);
      if (!building) throw new NotFoundError("Building");
      return rooms.findByBuilding(id);
    });
  }

  return { listBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding, listBuildingRooms };
}

module.exports = { createBuildingsService };
