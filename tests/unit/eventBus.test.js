const { createEventBus } = require("../../src/events/eventBus");

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("eventBus", () => {
  test("dostarcza event do listenerów z nazwą, czasem i payloadem", async () => {
    const bus = createEventBus();
    const handler = jest.fn();
    bus.subscribe("reservation.created", handler);

    bus.publish("reservation.created", { reservationId: 1 });
    await flush();

    expect(handler).toHaveBeenCalledWith({
      name: "reservation.created",
      occurredAt: expect.any(String),
      payload: { reservationId: 1 },
    });
  });

  test("błąd jednego listenera nie przerywa publish ani innych listenerów", async () => {
    const logger = { error: jest.fn() };
    const bus = createEventBus({ logger });
    const healthy = jest.fn();
    bus.subscribe("reservation.created", async () => {
      throw new Error("audit db down");
    });
    bus.subscribe("reservation.created", healthy);

    expect(() => bus.publish("reservation.created", { reservationId: 1 })).not.toThrow();
    await flush();

    expect(healthy).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith("[event:reservation.created] handler failed:", expect.any(Error));
  });
});
