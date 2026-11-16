function registerNotificationListeners(eventBus, db, { logger = console } = {}) {
  eventBus.subscribe("reservation.cancelled", async ({ payload }) => {
    if (payload.cancelledBy === payload.userId) return;

    const [owner, canceller] = await Promise.all([
      db("users").where({ id: payload.userId }).first("email"),
      db("users").where({ id: payload.cancelledBy }).first("role"),
    ]);
    if (!owner || canceller?.role !== "ADMIN") return;

    logger.log(
      `[notification] to: ${owner.email} - your reservation #${payload.reservationId} ` +
        `(room ${payload.roomId}) was cancelled by an administrator`
    );
  });
}

module.exports = { registerNotificationListeners };
