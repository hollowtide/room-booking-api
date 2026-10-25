\echo '--- 1. buildings.name UNIQUE'
INSERT INTO buildings (name, address) VALUES ('Budynek A', 'ul. Testowa 1');
\echo '--- 2. rooms (building_id, name) UNIQUE'
INSERT INTO rooms (building_id, name, capacity) VALUES (1, '101', 10);
\echo '--- 2b. ta sama nazwa sali w innym budynku - OK'
INSERT INTO rooms (building_id, name, capacity) VALUES (3, '101', 10);
\echo '--- 3. rooms.capacity CHECK (capacity > 0)'
INSERT INTO rooms (building_id, name, capacity) VALUES (1, '999', 0);
\echo '--- 4. reservations CHECK (end_time > start_time)'
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time) VALUES (1, 'Test', 5, '2026-12-01 12:00Z', '2026-12-01 10:00Z');
\echo '--- 5. reservations.status CHECK'
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time, status) VALUES (1, 'Test', 5, '2026-12-01 10:00Z', '2026-12-01 11:00Z', 'PENDING');
\echo '--- 6. reservations.participants CHECK (participants > 0)'
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time) VALUES (1, 'Test', 0, '2026-12-01 10:00Z', '2026-12-01 11:00Z');
\echo '--- 7. FK rooms.building_id -> buildings.id'
INSERT INTO rooms (building_id, name, capacity) VALUES (999, '101', 10);
\echo '--- 8. FK reservations.room_id -> rooms.id'
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time) VALUES (999, 'Test', 5, '2026-12-01 10:00Z', '2026-12-01 11:00Z');
\echo '--- 9. ON DELETE RESTRICT - usunięcie sali z rezerwacjami'
DELETE FROM rooms WHERE id = 1;
\echo '--- 10. ON DELETE RESTRICT - usunięcie budynku z salami'
DELETE FROM buildings WHERE id = 1;
\echo '--- 11. exclusion constraint - nakładająca się rezerwacja CONFIRMED (sala 1, 11:00-13:00)'
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time) VALUES (1, 'Test', 5, '2026-11-10 11:00Z', '2026-11-10 13:00Z');
\echo '--- 11b. stykająca się rezerwacja 12:00-13:00 - OK'
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time) VALUES (1, 'Test', 5, '2026-11-10 12:00Z', '2026-11-10 13:00Z');
\echo '--- 11c. w przedziale anulowanej rezerwacji (14:00-15:00) - OK'
INSERT INTO reservations (room_id, reserved_by, participants, start_time, end_time) VALUES (1, 'Test', 5, '2026-11-10 14:00Z', '2026-11-10 15:00Z');
