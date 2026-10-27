exports.seed = async function (knex) {
  await knex("buildings").insert([
    { name: "Budynek A", address: "ul. Warszawska 24, Kraków" },
    { name: "Budynek B", address: "ul. Podchorążych 1, Kraków" },
    { name: "Budynek C", address: "al. Jana Pawła II 37, Kraków" },
  ]);

  await knex("rooms").insert([
    { building_id: 1, name: "101", capacity: 30 },
    { building_id: 1, name: "102", capacity: 20 },
    { building_id: 1, name: "201", capacity: 50 },
    { building_id: 2, name: "101", capacity: 25 },
    { building_id: 2, name: "301", capacity: 10 },
  ]);

  const now = Date.now();
  const minutes = (m) => new Date(now + m * 60 * 1000);

  await knex("reservations").insert([
    { room_id: 1, user_id: 2, participants: 20,
      start_time: "2026-11-10T10:00:00Z", end_time: "2026-11-10T12:00:00Z", status: "CONFIRMED" },
    { room_id: 1, user_id: 3, participants: 15,
      start_time: "2026-11-10T14:00:00Z", end_time: "2026-11-10T15:00:00Z", status: "CANCELLED",
      cancelled_at: minutes(-60) },
    { room_id: 2, user_id: 3, participants: 10,
      start_time: "2026-11-12T09:00:00Z", end_time: "2026-11-12T11:00:00Z", status: "CONFIRMED" },
    { room_id: 4, user_id: 2, participants: 20,
      start_time: "2026-11-15T12:00:00Z", end_time: "2026-11-15T14:00:00Z", status: "CONFIRMED" },
    { room_id: 5, user_id: 2, participants: 5,
      start_time: minutes(-30), end_time: minutes(90), status: "CONFIRMED" },
  ]);
};
