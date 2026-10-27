const db = require("../src/db/knex");

const BASE = "http://localhost:3000/api";
const URL = `${BASE}/reservations`;
const N = 10;
const BODY = {
  roomId: 3,
  participants: 10,
  startTime: "2026-12-20T10:00:00Z",
  endTime: "2026-12-20T12:00:00Z",
};

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "jan.kowalski@example.com", password: "jan-password-123" }),
  });
  return (await res.json()).accessToken;
}

async function book(i, token) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(BODY),
  });
  const json = await res.json();
  return { i, status: res.status, info: json.error ? json.error.code : `id=${json.id}` };
}

(async () => {
  await db("reservations")
    .where({ room_id: BODY.roomId })
    .where("start_time", "<", BODY.endTime)
    .where("end_time", ">", BODY.startTime)
    .del();

  const token = await login();
  const results = await Promise.all(Array.from({ length: N }, (_, i) => book(i + 1, token)));

  for (const r of results) console.log(`request ${String(r.i).padStart(2)}: ${r.status} ${r.info}`);

  const counts = results.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
  console.log("\npodsumowanie statusów:", counts);

  const { count } = await db("reservations")
    .where({ room_id: BODY.roomId, status: "CONFIRMED" })
    .where("start_time", "<", BODY.endTime)
    .where("end_time", ">", BODY.startTime)
    .count({ count: "*" })
    .first();
  console.log(`rezerwacje CONFIRMED w bazie dla sali ${BODY.roomId} (10:00-12:00): ${count}`);

  await db.destroy();
})();
