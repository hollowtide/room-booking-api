const request = require("supertest");
const config = require("../../src/config");
const { createApp } = require("../../src/app");
const { createKnexUnitOfWork } = require("../../src/db/unitOfWork.knex");
const { createEventBus } = require("../../src/events/eventBus");
const { registerAuditListeners } = require("../../src/events/auditListeners");
const { db, setupSchema, resetData } = require("./testDb");

const eventBus = createEventBus();
registerAuditListeners(eventBus, db);
const app = createApp({ config, ...createKnexUnitOfWork(db), eventBus });

const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

async function login(email, password) {
  const res = await request(app).post("/api/auth/login").send({ email, password }).expect(200);
  return res.body.accessToken;
}

beforeAll(setupSchema);
beforeEach(resetData);
afterAll(() => db.destroy());

test("audit log: utworzenie → kolizja → anulowanie przez ADMINa → ponowne anulowanie", async () => {
  await request(app).post("/api/auth/register").send({ email: "jan@example.com", password: "bardzo-dlugie-haslo" });
  const jan = await login("jan@example.com", "bardzo-dlugie-haslo");
  const admin = await login("admin@example.com", "admin-password-123");
  const body = { roomId: 1, participants: 5, startTime: "2027-01-10T10:00:00Z", endTime: "2027-01-10T12:00:00Z" };

  const { body: created } = await request(app)
    .post("/api/reservations").set("Authorization", `Bearer ${jan}`).send(body).expect(201);
  await request(app).post("/api/reservations").set("Authorization", `Bearer ${jan}`).send(body).expect(409);
  await request(app).patch(`/api/reservations/${created.id}/cancel`).set("Authorization", `Bearer ${admin}`).expect(200);
  await request(app).patch(`/api/reservations/${created.id}/cancel`).set("Authorization", `Bearer ${admin}`).expect(200);
  await flush();

  const rows = await db("audit_log").orderBy("id");
  expect(rows.map((r) => r.event_type)).toEqual(["reservation.created", "reservation.cancelled"]);
  expect(rows[1].payload).toEqual({ reservationId: created.id, roomId: 1, userId: 2, cancelledBy: 1 });

  const res = await request(app).get("/api/admin/audit-log?eventType=reservation.cancelled").set("Authorization", `Bearer ${admin}`);
  expect(res.status).toBe(200);
  expect(res.body.meta.total).toBe(1);
  expect(res.body.data[0]).toMatchObject({ eventType: "reservation.cancelled", payload: { cancelledBy: 1 } });

  await request(app).get("/api/admin/audit-log").set("Authorization", `Bearer ${jan}`).expect(403);
});
