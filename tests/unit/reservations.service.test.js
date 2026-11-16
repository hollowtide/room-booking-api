const { ADMIN, JAN, ANNA, at, reservation, setup, input } = require("./helpers");

describe("createReservation - nakładanie się rezerwacji", () => {
  const existing = () => [reservation(1, 1, ANNA.id, "10:00", "12:00")];

  test.each([
    ["nakłada się częściowo (koniec)", "11:00", "13:00"],
    ["nakłada się częściowo (początek)", "09:00", "10:30"],
    ["zawiera się w istniejącej", "10:30", "11:00"],
    ["zawiera istniejącą", "09:00", "13:00"],
    ["ma identyczny przedział", "10:00", "12:00"],
  ])("odrzuca rezerwację, która %s", async (_, start, end) => {
    const { service } = setup({ reservations: existing() });

    await expect(service.createReservation(input(start, end), JAN)).rejects.toMatchObject({
      code: "ROOM_ALREADY_BOOKED",
    });
  });

  test.each([
    ["styka się końcem (12:00-13:00)", "12:00", "13:00"],
    ["styka się początkiem (09:00-10:00)", "09:00", "10:00"],
  ])("pozwala na rezerwację, która %s", async (_, start, end) => {
    const { service } = setup({ reservations: existing() });

    const created = await service.createReservation(input(start, end), JAN);

    expect(created.status).toBe("CONFIRMED");
  });

  test("pozwala na ten sam przedział w innej sali", async () => {
    const { service } = setup({ reservations: existing() });

    const created = await service.createReservation(input("10:00", "12:00", { roomId: 2 }), JAN);

    expect(created.roomId).toBe(2);
  });

  test("anulowana rezerwacja (CANCELLED) nie blokuje przedziału", async () => {
    const { service } = setup({
      reservations: [reservation(1, 1, ANNA.id, "10:00", "12:00", { status: "CANCELLED", cancelledAt: at("07:00") })],
    });

    const created = await service.createReservation(input("10:00", "12:00"), JAN);

    expect(created.status).toBe("CONFIRMED");
  });
});

describe("createReservation - pojemność sali", () => {
  test("pozwala, gdy participants == capacity", async () => {
    const { service } = setup();

    const created = await service.createReservation(input("10:00", "11:00", { participants: 10 }), JAN);

    expect(created.participants).toBe(10);
  });

  test("odrzuca, gdy participants == capacity + 1", async () => {
    const { service } = setup();

    await expect(
      service.createReservation(input("10:00", "11:00", { participants: 11 }), JAN)
    ).rejects.toMatchObject({ code: "ROOM_CAPACITY_EXCEEDED" });
  });
});

describe("createReservation - czas trwania", () => {
  test.each([
    ["dokładnie 15 min", "10:00", "10:15"],
    ["dokładnie 8 h", "08:00", "16:00"],
  ])("pozwala na rezerwację trwającą %s", async (_, start, end) => {
    const { service } = setup();

    await expect(service.createReservation(input(start, end), JAN)).resolves.toMatchObject({
      status: "CONFIRMED",
    });
  });

  test.each([
    ["14 min", "10:00", "10:14"],
    ["8 h 1 min", "08:00", "16:01"],
  ])("odrzuca rezerwację trwającą %s", async (_, start, end) => {
    const { service } = setup();

    await expect(service.createReservation(input(start, end), JAN)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});

describe("cancelReservation", () => {
  test("odrzuca anulowanie rezerwacji, która już się rozpoczęła", async () => {
    const { service, clock } = setup({ reservations: [reservation(1, 1, JAN.id, "10:00", "12:00")] });
    clock.now = at("10:30");

    await expect(service.cancelReservation(1, JAN)).rejects.toMatchObject({
      code: "RESERVATION_ALREADY_STARTED",
    });
  });

  test("podwójne anulowanie jest idempotentne - cancelledAt się nie zmienia", async () => {
    const { service, clock } = setup({ reservations: [reservation(1, 1, JAN.id, "10:00", "12:00")] });

    const first = await service.cancelReservation(1, JAN);
    clock.now = at("09:00");
    const second = await service.cancelReservation(1, JAN);

    expect(first.status).toBe("CANCELLED");
    expect(second.status).toBe("CANCELLED");
    expect(second.cancelledAt).toEqual(first.cancelledAt);
  });
});

describe("ownership", () => {
  test("obcy USER nie widzi cudzej rezerwacji (NOT_FOUND)", async () => {
    const { service } = setup({ reservations: [reservation(1, 1, JAN.id, "10:00", "12:00")] });

    await expect(service.getReservation(1, ANNA)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("obcy USER nie może anulować cudzej rezerwacji (NOT_FOUND)", async () => {
    const { service } = setup({ reservations: [reservation(1, 1, JAN.id, "10:00", "12:00")] });

    await expect(service.cancelReservation(1, ANNA)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("ADMIN może pobrać i anulować cudzą rezerwację", async () => {
    const { service } = setup({ reservations: [reservation(1, 1, JAN.id, "10:00", "12:00")] });

    await expect(service.getReservation(1, ADMIN)).resolves.toMatchObject({ id: 1, userId: JAN.id });
    await expect(service.cancelReservation(1, ADMIN)).resolves.toMatchObject({ status: "CANCELLED" });
  });

  test("USER widzi na liście tylko swoje rezerwacje", async () => {
    const { service } = setup({
      reservations: [reservation(1, 1, JAN.id, "10:00", "12:00"), reservation(2, 2, ANNA.id, "10:00", "12:00")],
    });

    const { items, meta } = await service.listReservations({ page: 1, limit: 20, sort: "startTime" }, JAN);

    expect(items.map((r) => r.id)).toEqual([1]);
    expect(meta.total).toBe(1);
  });

  test("USER nie może filtrować po cudzym userId (FORBIDDEN)", async () => {
    const { service } = setup();

    await expect(
      service.listReservations({ page: 1, limit: 20, sort: "startTime", userId: ANNA.id }, JAN)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
