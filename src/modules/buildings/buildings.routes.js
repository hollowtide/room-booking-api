const { Router } = require("express");
const validate = require("../../middleware/validate");
const authorize = require("../../middleware/authorize");
const { buildingIdParams, createBuildingBody, updateBuildingBody } = require("./buildings.schemas");

function createBuildingsRouter(controller) {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:id", validate({ params: buildingIdParams }), controller.getById);
  router.get("/:id/rooms", validate({ params: buildingIdParams }), controller.listRooms);
  router.post("/", authorize("ADMIN"), validate({ body: createBuildingBody }), controller.create);
  router.patch("/:id", authorize("ADMIN"), validate({ params: buildingIdParams, body: updateBuildingBody }), controller.update);
  router.delete("/:id", authorize("ADMIN"), validate({ params: buildingIdParams }), controller.remove);
  return router;
}

module.exports = { createBuildingsRouter };
