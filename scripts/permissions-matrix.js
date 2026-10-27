const BASE = "http://localhost:3000/api";

async function call(method, path, token, body) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

async function login(email, password) {
  return (await call("POST", "/auth/login", null, { email, password })).json.accessToken;
}

let slot = 0;
async function freshReservation(token) {
  slot += 1;
  const day = String(slot).padStart(2, "0");
  const r = await call("POST", "/reservations", token, {
    roomId: 3,
    participants: 5,
    startTime: `2027-01-${day}T10:00:00Z`,
    endTime: `2027-01-${day}T11:00:00Z`,
  });
  return r.json.id;
}

let n = 0;
async function freshBuilding(admin) {
  n += 1;
  return (await call("POST", "/buildings", admin, { name: `Tymczasowy ${Date.now()}-${n}`, address: "ul. Testowa 1" })).json.id;
}
async function freshRoom(admin) {
  n += 1;
  return (await call("POST", "/rooms", admin, { buildingId: 3, name: `T${Date.now()}-${n}`, capacity: 10 })).json.id;
}

(async () => {
  const user = await login("jan.kowalski@example.com", "jan-password-123");
  const other = await login("anna.nowak@example.com", "anna-password-123");
  const admin = await login("admin@example.com", "admin-password-123");
  const tokens = { none: null, owner: user, foreign: other, admin };
  const COLS = ["none", "owner", "foreign", "admin"];

  const rows = [
    ["GET /api/buildings", () => ["GET", "/buildings"]],
    ["GET /api/buildings/1", () => ["GET", "/buildings/1"]],
    ["GET /api/buildings/1/rooms", () => ["GET", "/buildings/1/rooms"]],
    ["POST /api/buildings", () => ["POST", "/buildings", { name: `Nowy ${Date.now()}-${++n}`, address: "ul. Nowa 1" }]],
    ["PATCH /api/buildings/:id", async () => ["PATCH", `/buildings/${await freshBuilding(admin)}`, { address: "ul. Zmieniona 2" }]],
    ["DELETE /api/buildings/:id", async () => ["DELETE", `/buildings/${await freshBuilding(admin)}`]],
    ["GET /api/rooms", () => ["GET", "/rooms"]],
    ["GET /api/rooms/1", () => ["GET", "/rooms/1"]],
    ["POST /api/rooms", () => ["POST", "/rooms", { buildingId: 3, name: `R${Date.now()}-${++n}`, capacity: 10 }]],
    ["PATCH /api/rooms/:id", async () => ["PATCH", `/rooms/${await freshRoom(admin)}`, { capacity: 12 }]],
    ["DELETE /api/rooms/:id", async () => ["DELETE", `/rooms/${await freshRoom(admin)}`]],
    ["GET /api/reservations", () => ["GET", "/reservations"]],
    ["GET /api/reservations?userId=3 (id Anny)", () => ["GET", "/reservations?userId=3"]],
    ["POST /api/reservations", () => {
      slot += 1;
      const day = String(slot).padStart(2, "0");
      return ["POST", "/reservations", { roomId: 3, participants: 5, startTime: `2027-01-${day}T10:00:00Z`, endTime: `2027-01-${day}T11:00:00Z` }];
    }],
    ["GET /api/reservations/:id (rezerwacja Jana)", async () => ["GET", `/reservations/${await freshReservation(user)}`]],
    ["PATCH /api/reservations/:id/cancel (rezerwacja Jana)", async () => ["PATCH", `/reservations/${await freshReservation(user)}/cancel`]],
    ["GET /api/auth/me", () => ["GET", "/auth/me"]],
  ];

  const header = "| Endpoint | brak tokenu | USER właściciel | USER obcy | ADMIN |";
  const lines = [header, "|---|---|---|---|---|"];
  for (const [label, build] of rows) {
    const cells = [];
    for (const col of COLS) {
      const [method, path, body] = await build();
      const { status, json } = await call(method, path, tokens[col], body);
      const code = json && json.error ? ` ${json.error.code}` : "";
      cells.push(`${status}${code}`);
    }
    lines.push(`| ${label} | ${cells.join(" | ")} |`);
  }
  console.log("Jan Kowalski (id 2) = USER właściciel, Anna Nowak (id 3) = USER obcy, admin@example.com = ADMIN");
  console.log("Dla budynków i sal nie ma właściciela - kolumny USER pokazują zwykłego użytkownika.\n");
  console.log(lines.join("\n"));
})();
