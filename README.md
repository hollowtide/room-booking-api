# ZTPAI – Zadanie 04 – Room Booking API: authentication, authorization i konfiguracja

Node.js + Express 5 + Zod + PostgreSQL 16 (Docker) + Knex + bcryptjs + jsonwebtoken + swagger-ui-express.

## Uruchomienie

```bash
cp .env.example .env          # uzupełnij DATABASE_URL i JWT_SECRET (min. 32 znaki)
npm install
docker compose up -d
npm run migrate
npm run seed
npm start                     # Swagger UI: http://localhost:3000/api/docs
```

Losowy JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

Konta z seeda (tylko środowisko developerskie):

| Email | Hasło | Rola |
|---|---|---|
| admin@example.com | admin-password-123 | ADMIN |
| jan.kowalski@example.com | jan-password-123 | USER |
| anna.nowak@example.com | anna-password-123 | USER |

Testy w Postmanie: zaimportuj `postman/room-booking-lab4.postman_collection.json` (File → Import), uruchom folder
„0. Zaloguj się”, a potem foldery 1–4. Tokeny zapisują się same, każdy request ma w nazwie oczekiwany status.

Skrypty: `npm run permissions` (tabela uprawnień), `npm run register-race` (równoległe rejestracje),
`npm run double-booking` (race condition z zadania 03).

## Decyzje

**`?userId=` dla USERa → 403** (chyba że to jego własne id). Cicha ignorowana wartość zwróciłaby własne rezerwacje
użytkownika jako odpowiedź na pytanie o kogoś innego – klient dostałby mylący wynik. 403 jasno mówi, że ten filtr
jest dostępny tylko dla administratora. Niezależnie od parametrów backend zawsze dokłada `user_id = <id z tokenu>`
dla roli USER.

**Cudza rezerwacja → 404, nie 403.** Rezerwacje są prywatne – 403 zdradzałoby, że rezerwacja o tym id istnieje.

**Migracja `user_id`** działa na bazie z danymi: dodaje kolumnę jako nullable, dla każdej wartości `reserved_by`
tworzy konto (email z imienia i nazwiska, losowe hasło – konto trzeba aktywować resetem hasła), uzupełnia `user_id`,
ustawia NOT NULL i dopiero wtedy usuwa `reserved_by`. Funkcja `down` odtwarza `reserved_by` z emaila użytkownika.

**Login** – zły email i złe hasło dają ten sam kod `INVALID_CREDENTIALS` i ten sam komunikat. Dla nieistniejącego
emaila i tak liczony jest bcrypt (na stałym hashu), żeby czas odpowiedzi nie zdradzał, czy konto istnieje.

**Wygasły token** → 401 z kodem `TOKEN_EXPIRED` (frontend wie, że wystarczy ponowne logowanie). Inne problemy
z tokenem → `UNAUTHORIZED` / `INVALID_TOKEN`.

**Konfiguracja** – jedyne miejsce czytające `process.env` to `src/config/index.js` (walidacja Zod, fail fast).
