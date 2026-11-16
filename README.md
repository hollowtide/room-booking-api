# Room Booking API

[![CI](https://github.com/hollowtide/room-booking-api/actions/workflows/ci.yml/badge.svg)](https://github.com/hollowtide/room-booking-api/actions/workflows/ci.yml)

REST API do rezerwacji sal (ZTPAI, zadania 01–05): Node.js 22, Express 5, Zod, PostgreSQL 16, Knex,
JWT + role, event bus z audit logiem, testy (Jest + Supertest), Docker Compose i GitHub Actions.

## Uruchomienie od zera (Docker)

Wymagany tylko Docker (z Docker Compose v2).

```bash
git clone https://github.com/hollowtide/room-booking-api.git
cd room-booking-api
cp .env.example .env
docker compose up --build
```

- API: http://localhost:3000
- Swagger UI: http://localhost:3000/api/docs

Migracje uruchamiają się same przy starcie kontenera `api`. Konto ADMIN i dane przykładowe (seed):

```bash
docker compose exec api npx knex seed:run
```

| Email | Hasło | Rola |
|---|---|---|
| admin@example.com | admin-password-123 | ADMIN |
| jan.kowalski@example.com | jan-password-123 | USER |
| anna.nowak@example.com | anna-password-123 | USER |

Zatrzymanie: `docker compose down` (dane zostają w volume `pgdata`; `docker compose down -v` je usuwa).

Port 5432 musi być wolny – jeżeli działa inny PostgreSQL, zatrzymaj go albo ustaw w `.env` np. `DB_PORT=5433`.

## Testy

```bash
npm ci
npm run test:unit          # bez bazy danych (repositories in-memory)
docker compose up -d db    # baza dla testów integracyjnych
npm run test:integration   # baza roombooking_test - tworzona automatycznie, schemat z migracji
npm test                   # wszystko
```

Testy integracyjne używają `TEST_DATABASE_URL`
(domyślnie `postgres://postgres:postgres@localhost:5432/roombooking_test`) i nigdy bazy deweloperskiej.

## Uruchomienie bez Dockera dla API

```bash
docker compose up -d db
npm ci
npm run migrate && npm run seed
npm start
```

## Endpointy

| Metoda | Ścieżka | Dostęp |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | publiczne |
| GET | /api/auth/me | zalogowany |
| GET | /api/buildings, /api/buildings/:id, /api/buildings/:id/rooms | zalogowany |
| POST, PATCH, DELETE | /api/buildings, /api/rooms | ADMIN |
| GET | /api/rooms, /api/rooms/:id | zalogowany |
| GET, POST | /api/reservations | USER – własne, ADMIN – wszystkie |
| GET | /api/reservations/:id | właściciel albo ADMIN |
| PATCH | /api/reservations/:id/cancel | właściciel albo ADMIN |
| GET | /api/admin/audit-log?eventType=&page=&limit= | ADMIN |

## Eventy

Service rezerwacji publikuje po zatwierdzeniu transakcji `reservation.created` i `reservation.cancelled`.
Listenery zapisują je do tabeli `audit_log` (jsonb) i wysyłają (symulowane) powiadomienie właścicielowi,
gdy ADMIN anuluje jego rezerwację. Błąd listenera jest logowany i nie wpływa na odpowiedź API.
