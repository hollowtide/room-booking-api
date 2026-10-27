const { Router } = require("express");
const validate = require("../../middleware/validate");
const authorize = require("../../middleware/authorize");
const { roomIdParams, createRoomBody, updateRoomBody } = require("./rooms.schemas");

function createRoomsRouter(controller) {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:id", validate({ params: roomIdParams }), controller.getById);
  router.post("/", authorize("ADMIN"), validate({ body: createRoomBody }), controller.create);
  router.patch("/:id", authorize("ADMIN"), validate({ params: roomIdParams, body: updateRoomBody }), controller.update);
  router.delete("/:id", authorize("ADMIN"), validate({ params: roomIdParams }), controller.remove);
  return router;
}

module.exports = { createRoomsRouter };
