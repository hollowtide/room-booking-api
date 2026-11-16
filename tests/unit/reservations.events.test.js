const { ADMIN, JAN, ANNA, at, reservation, setup, input } = require("./helpers");

function fakeEventBus() {
  return { publish: jest.fn(), subscribe: jest.fn() };
}

describe("eventy service'u rezerwacji", () => {
  test("publikuje reservation.created po udanym utworzeniu", async () => {
    const eventBus = fakeEventBus();
    const { service } = setup({ eventBus });

    const created = await service.createReservation(input("10:00", "12:00"), JAN);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith("reservation.created", {
      reservationId: created.id,
      roomId: 1,
      userId: JAN.id,
      startTime: at("10:00").toISOString(),
      endTime: at("12:00").toISOString(),
    });
  });

  test.each([
    ["kolizja terminów", () => input("11:00", "13:00"), "ROOM_ALREADY_BOOKED"],
    ["przekroczona pojemność", () => input("14:00", "15:00", { participants: 11 }), "ROOM_CAPACITY_EXCEEDED"],
  ])("nie publikuje eventu po błędzie (%s)", async (_, body, code) => {
    const eventBus = fakeEventBus();
    const { service } = setup({ eventBus, reservations: [reservation(1, 1, ANNA.id, "10:00", "12:00")] });

    await expect(service.createReservation(body(), JAN)).rejects.toMatchObject({ code });

    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  test("publikuje reservation.cancelled z cancelledBy, a ponowne anulowanie nie publikuje", async () => {
    const eventBus = fakeEventBus();
    const { service } = setup({ eventBus, reservations: [reservation(1, 1, JAN.id, "10:00", "12:00")] });

    await service.cancelReservation(1, ADMIN);
    await service.cancelReservation(1, ADMIN);

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    expect(eventBus.publish).toHaveBeenCalledWith("reservation.cancelled", {
      reservationId: 1,
      roomId: 1,
      userId: JAN.id,
      cancelledBy: ADMIN.id,
    });
  });

  test("nie publikuje eventu, gdy anulowanie się nie udało", async () => {
    const eventBus = fakeEventBus();
    const { service, clock } = setup({ eventBus, reservations: [reservation(1, 1, JAN.id, "10:00", "12:00")] });
    clock.now = at("10:30");

    await expect(service.cancelReservation(1, JAN)).rejects.toMatchObject({ code: "RESERVATION_ALREADY_STARTED" });

    expect(eventBus.publish).not.toHaveBeenCalled();
  });
});
