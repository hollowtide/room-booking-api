# ZTPAI – Zadanie 03 – Room Booking API: PostgreSQL, relacje i współbieżność

Node.js + Express 5 + Zod + PostgreSQL 16 (Docker) + Knex.

## Uruchomienie od zera

```bash
cp .env.example .env          # i wpisz dane: postgres://postgres:postgres@localhost:5432/roombooking
npm install
docker compose up -d          # PostgreSQL 16 w kontenerze roombooking-db, volume roombooking-pgdata
npm run migrate               # npx knex migrate:latest
npm run seed                  # npx knex seed:run (zawsze ten sam stan, ID od 1)
npm start                     # albo: npm run start:debug  (logi SQL: DEBUG=knex:query)
```

psql w kontenerze: `docker exec -it roombooking-db psql -U postgres -d roombooking`

Test race condition: `npm run seed && node scripts/double-booking.js`

## Endpointy

| Metoda | Ścieżka |
|---|---|
| GET | /api/buildings (z roomsCount) |
| GET | /api/buildings/:id |
| GET | /api/buildings/:id/rooms |
| POST | /api/buildings |
| GET | /api/rooms, /api/rooms/:id (z budynkiem) |
| POST | /api/rooms (buildingId) |
| GET | /api/reservations?roomId&buildingId&status&from&to&page&limit&sort |
| GET | /api/reservations/:id |
| POST | /api/reservations |
| PATCH | /api/reservations/:id/cancel |

## Decyzje

**ON DELETE** – oba klucze obce mają `RESTRICT`.
- `reservations.room_id → rooms`: rezerwacje to dane historyczne (kto, kiedy, ile osób). `CASCADE` po cichu skasowałby historię,
  `SET NULL` zostawiłby rezerwacje "w powietrzu" (kolumna i tak jest NOT NULL). Salę z rezerwacjami trzeba najpierw świadomie
  obsłużyć (np. anulować przyszłe rezerwacje), dopiero potem usunąć.
- `rooms.building_id → buildings`: z tego samego powodu nie usuwamy budynku, który ma sale.

**Indeks** `(room_id, start_time, end_time)` – zapytanie o kolizje filtruje po sali i po czasie (`room_id = ? AND start_time < ? AND end_time > ?`).

**Który wiersz blokujemy (`FOR UPDATE`)** – wiersz **sali** (`rooms`). Nowa rezerwacja jeszcze nie istnieje, więc nie da się jej zablokować,
a blokowanie istniejących rezerwacji nie pomaga, gdy sala nie ma jeszcze żadnej w tym przedziale. Wiersz sali jest wspólnym punktem dla
wszystkich rezerwacji tej sali – drugi request czeka na blokadę i sprawdza kolizje dopiero po COMMIT pierwszego, więc widzi już jego
rezerwację. Rezerwacje różnych sal się nie blokują.

**Dlaczego sama transakcja nie wystarcza** – domyślny poziom izolacji PostgreSQL to READ COMMITTED: każde zapytanie widzi tylko dane
zatwierdzone przed jego startem. Dwie równoległe transakcje wykonują SELECT na kolizje, zanim którakolwiek zrobi COMMIT, więc obie widzą
pustą salę i obie robią INSERT. Transakcja daje atomowość (wszystko albo nic), ale nie szereguje równoległych odczytów – do tego potrzebna
jest blokada (`FOR UPDATE`) albo constraint w bazie (exclusion constraint), który jest ostatnią linią obrony.

## Wyniki

Katalog `results/` – wyniki migracji, `\d reservations`, próby złamania constraintów, logi SQL (N+1, pagination),
wyniki `double-booking.js` w trzech wariantach i diff service lab2 → lab3.
