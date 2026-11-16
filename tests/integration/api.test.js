const request = require("supertest");
const config = require("../../src/config");
const { createApp } = require("../../src/app");
const { createKnexUnitOfWork } = require("../../src/db/unitOfWork.knex");
const { db, setupSchema, resetData } = require("./testDb");

const app = createApp({ config, ...createKnexUnitOfWork(db) });

const PASSWORD = "bardzo-dlugie-haslo";

async function registerAndLogin(email) {
  await request(app).post("/api/auth/register").send({ email, password: PASSWORD }).expect(201);
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD }).expect(200);
  return res.body.accessToken;
}

async function loginAdmin() {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@example.com", password: "admin-password-123" })
    .expect(200);
  return res.body.accessToken;
}

function reservationBody(day, overrides = {}) {
  return {
    roomId: 1,
    participants: 5,
    startTime: `2027-01-${day}T10:00:00Z`,
    endTime: `2027-01-${day}T12:00:00Z`,
    ...overrides,
  };
}

function createReservation(token, body) {
  return request(app).post("/api/reservations").set("Authorization", `Bearer ${token}`).send(body);
}

beforeAll(async () => {
  await setupSchema();
});

beforeEach(async () => {
  await resetData();
});

afterAll(async () => {
  await db.destroy();
});

describe("Auth", () => {
  test("rejestracja + logowanie + GET /api/auth/me", async () => {
    const register = await request(app)
      .post("/api/auth/register")
      .send({ email: "Jan@Example.com", password: PASSWORD });
    expect(register.status).toBe(201);
    expect(register.body).toMatchObject({ email: "jan@example.com", role: "USER" });
    expect(register.body).not.toHaveProperty("passwordHash");

    const login = await request(app).post("/api/auth/login").send({ email: "jan@example.com", password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toEqual(expect.any(String));

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ id: register.body.id, email: "jan@example.com", role: "USER" });
  });

  test("401 bez tokenu", async () => {
    const res = await request(app).get("/api/reservations");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("Reservations API", () => {
  test("POST /api/reservations → 201, nagłówek Location i rekord w bazie", async () => {
    const token = await registerAndLogin("jan@example.com");

    const res = await createReservation(token, reservationBody("10"));

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/reservations/${res.body.id}`);
    const row = await db("reservations").where({ id: res.body.id }).first();
    expect(row).toMatchObject({ room_id: 1, participants: 5, status: "CONFIRMED" });
    expect(row.start_time.toISOString()).toBe("2027-01-10T10:00:00.000Z");
    const user = await db("users").where({ email: "jan@example.com" }).first();
    expect(row.user_id).toBe(user.id);
  });

  test("400 z details dla błędnego body", async () => {
    const token = await registerAndLogin("jan@example.com");

    const res = await createReservation(token, { roomId: "abc", participants: 0, startTime: "jutro", extra: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(["roomId", "participants", "startTime", "endTime", "extra"]));
    expect(res.body.error.details).toContainEqual({ location: "body", field: "extra", message: "Unknown field" });
  });

  test("409 ROOM_ALREADY_BOOKED dla nakładającej się rezerwacji", async () => {
    const jan = await registerAndLogin("jan@example.com");
    const anna = await registerAndLogin("anna@example.com");
    await createReservation(jan, reservationBody("10")).expect(201);

    const res = await createReservation(
      anna,
      reservationBody("10", { startTime: "2027-01-10T11:00:00Z", endTime: "2027-01-10T13:00:00Z" })
    );

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ROOM_ALREADY_BOOKED");
    const { count } = await db("reservations").count({ count: "*" }).first();
    expect(Number(count)).toBe(1);
  });

  test("404 dla USER pobierającego cudzą rezerwację", async () => {
    const jan = await registerAndLogin("jan@example.com");
    const anna = await registerAndLogin("anna@example.com");
    const { body: created } = await createReservation(jan, reservationBody("10")).expect(201);

    const res = await request(app).get(`/api/reservations/${created.id}`).set("Authorization", `Bearer ${anna}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("pagination: meta.total i liczba elementów w data dla mniejszego limit", async () => {
    const token = await registerAndLogin("jan@example.com");
    for (const day of ["10", "11", "12", "13", "14"]) {
      await createReservation(token, reservationBody(day)).expect(201);
    }

    const res = await request(app)
      .get("/api/reservations?limit=2&page=2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(res.body.data.map((r) => r.startTime)).toEqual(["2027-01-12T10:00:00.000Z", "2027-01-13T10:00:00.000Z"]);
  });
});

describe("Role", () => {
  test("403 dla USER próbującego utworzyć salę", async () => {
    const token = await registerAndLogin("jan@example.com");

    const res = await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({ buildingId: 1, name: "301", capacity: 15 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(await db("rooms").where({ name: "301" }).first()).toBeUndefined();
  });

  test("ADMIN może utworzyć salę (201)", async () => {
    const token = await loginAdmin();

    const res = await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({ buildingId: 1, name: "301", capacity: 15 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "301", capacity: 15, building: { id: 1 } });
  });
});
