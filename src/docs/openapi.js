const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const resp = (name) => ({ $ref: `#/components/responses/${name}` });
const json = (schema, description) => ({ description, content: { "application/json": { schema } } });
const body = (name) => ({ required: true, content: { "application/json": { schema: ref(name) } } });
const idParam = { $ref: "#/components/parameters/Id" };
const secured = [{ bearerAuth: [] }];

const authErrors = { 401: resp("Unauthorized") };
const adminErrors = { 401: resp("Unauthorized"), 403: resp("Forbidden") };

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Room Booking API",
    version: "4.0.0",
    description:
      "API do rezerwacji sal. Zaloguj się (POST /api/auth/login), skopiuj accessToken i kliknij Authorize. " +
      "Konta z seeda: admin@example.com / admin-password-123, jan.kowalski@example.com / jan-password-123.",
  },
  servers: [{ url: "/" }],
  tags: [{ name: "Auth" }, { name: "Buildings" }, { name: "Rooms" }, { name: "Reservations" }],
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Rejestracja nowego użytkownika (zawsze rola USER)",
        requestBody: body("RegisterRequest"),
        responses: {
          201: json(ref("User"), "Utworzono konto"),
          400: resp("BadRequest"),
          409: resp("Conflict"),
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Logowanie - zwraca token JWT",
        requestBody: body("LoginRequest"),
        responses: {
          200: json(ref("LoginResponse"), "Zalogowano"),
          400: resp("BadRequest"),
          401: resp("Unauthorized"),
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Dane zalogowanego użytkownika",
        security: secured,
        responses: { 200: json(ref("User"), "Zalogowany użytkownik"), ...authErrors },
      },
    },
    "/api/buildings": {
      get: {
        tags: ["Buildings"],
        summary: "Lista budynków z liczbą sal",
        security: secured,
        responses: { 200: json({ type: "array", items: ref("Building") }, "Lista budynków"), ...authErrors },
      },
      post: {
        tags: ["Buildings"],
        summary: "Dodanie budynku (ADMIN)",
        security: secured,
        requestBody: body("BuildingCreate"),
        responses: {
          201: json(ref("Building"), "Utworzono budynek"),
          400: resp("BadRequest"),
          ...adminErrors,
          409: resp("Conflict"),
        },
      },
    },
    "/api/buildings/{id}": {
      parameters: [idParam],
      get: {
        tags: ["Buildings"],
        summary: "Szczegóły budynku",
        security: secured,
        responses: { 200: json(ref("Building"), "Budynek"), 400: resp("BadRequest"), ...authErrors, 404: resp("NotFound") },
      },
      patch: {
        tags: ["Buildings"],
        summary: "Zmiana budynku (ADMIN)",
        security: secured,
        requestBody: body("BuildingUpdate"),
        responses: {
          200: json(ref("Building"), "Zmieniono budynek"),
          400: resp("BadRequest"),
          ...adminErrors,
          404: resp("NotFound"),
          409: resp("Conflict"),
        },
      },
      delete: {
        tags: ["Buildings"],
        summary: "Usunięcie budynku (ADMIN) - tylko budynek bez sal",
        security: secured,
        responses: {
          204: { description: "Usunięto budynek" },
          400: resp("BadRequest"),
          ...adminErrors,
          404: resp("NotFound"),
          409: resp("Conflict"),
        },
      },
    },
    "/api/buildings/{id}/rooms": {
      parameters: [idParam],
      get: {
        tags: ["Buildings"],
        summary: "Sale w budynku",
        security: secured,
        responses: {
          200: json({ type: "array", items: ref("Room") }, "Lista sal (pusta, gdy budynek nie ma sal)"),
          400: resp("BadRequest"),
          ...authErrors,
          404: resp("NotFound"),
        },
      },
    },
    "/api/rooms": {
      get: {
        tags: ["Rooms"],
        summary: "Lista sal",
        security: secured,
        responses: { 200: json({ type: "array", items: ref("Room") }, "Lista sal"), ...authErrors },
      },
      post: {
        tags: ["Rooms"],
        summary: "Dodanie sali (ADMIN)",
        security: secured,
        requestBody: body("RoomCreate"),
        responses: {
          201: json(ref("Room"), "Utworzono salę"),
          400: resp("BadRequest"),
          ...adminErrors,
          404: resp("NotFound"),
          409: resp("Conflict"),
        },
      },
    },
    "/api/rooms/{id}": {
      parameters: [idParam],
      get: {
        tags: ["Rooms"],
        summary: "Sala z budynkiem",
        security: secured,
        responses: { 200: json(ref("Room"), "Sala"), 400: resp("BadRequest"), ...authErrors, 404: resp("NotFound") },
      },
      patch: {
        tags: ["Rooms"],
        summary: "Zmiana sali (ADMIN)",
        security: secured,
        requestBody: body("RoomUpdate"),
        responses: {
          200: json(ref("Room"), "Zmieniono salę"),
          400: resp("BadRequest"),
          ...adminErrors,
          404: resp("NotFound"),
          409: resp("Conflict"),
        },
      },
      delete: {
        tags: ["Rooms"],
        summary: "Usunięcie sali (ADMIN) - tylko sala bez rezerwacji",
        security: secured,
        responses: {
          204: { description: "Usunięto salę" },
          400: resp("BadRequest"),
          ...adminErrors,
          404: resp("NotFound"),
          409: resp("Conflict"),
        },
      },
    },
    "/api/reservations": {
      get: {
        tags: ["Reservations"],
        summary: "Lista rezerwacji (USER widzi tylko swoje, ADMIN wszystkie)",
        security: secured,
        parameters: [
          { name: "roomId", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "buildingId", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "userId", in: "query", description: "Tylko ADMIN; USER z cudzym userId dostaje 403", schema: { type: "integer", minimum: 1 } },
          { name: "status", in: "query", schema: { type: "string", enum: ["CONFIRMED", "CANCELLED"] } },
          { name: "from", in: "query", description: "Początek przedziału [from, to)", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", description: "Koniec przedziału [from, to)", schema: { type: "string", format: "date-time" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          {
            name: "sort",
            in: "query",
            schema: {
              type: "string",
              enum: ["startTime", "-startTime", "createdAt", "-createdAt", "participants", "-participants"],
              default: "startTime",
            },
          },
        ],
        responses: {
          200: json(ref("ReservationPage"), "Strona rezerwacji"),
          400: resp("BadRequest"),
          ...authErrors,
          403: resp("Forbidden"),
        },
      },
      post: {
        tags: ["Reservations"],
        summary: "Utworzenie rezerwacji (właściciel = zalogowany użytkownik)",
        security: secured,
        requestBody: body("ReservationCreate"),
        responses: {
          201: json(ref("Reservation"), "Utworzono rezerwację"),
          400: resp("BadRequest"),
          ...authErrors,
          404: resp("NotFound"),
          409: resp("Conflict"),
        },
      },
    },
    "/api/reservations/{id}": {
      parameters: [idParam],
      get: {
        tags: ["Reservations"],
        summary: "Szczegóły rezerwacji (właściciel albo ADMIN; cudza → 404)",
        security: secured,
        responses: { 200: json(ref("Reservation"), "Rezerwacja"), 400: resp("BadRequest"), ...authErrors, 404: resp("NotFound") },
      },
    },
    "/api/reservations/{id}/cancel": {
      parameters: [idParam],
      patch: {
        tags: ["Reservations"],
        summary: "Anulowanie rezerwacji (właściciel albo ADMIN; cudza → 404)",
        security: secured,
        responses: {
          200: json(ref("Reservation"), "Anulowana rezerwacja (ponowne anulowanie zwraca ją bez zmian)"),
          400: resp("BadRequest"),
          ...authErrors,
          404: resp("NotFound"),
          409: resp("Conflict"),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    parameters: {
      Id: { name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message", "requestId"],
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Validation failed" },
              details: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    location: { type: "string", enum: ["params", "query", "body"] },
                    field: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
              requestId: { type: "string", format: "uuid" },
            },
          },
        },
      },
      RegisterRequest: {
        type: "object",
        additionalProperties: false,
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "Jan.Kowalski2@example.com" },
          password: { type: "string", minLength: 10, maxLength: 72, example: "bardzo-dlugie-haslo" },
        },
      },
      LoginRequest: {
        type: "object",
        additionalProperties: false,
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "jan.kowalski@example.com" },
          password: { type: "string", example: "jan-password-123" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          tokenType: { type: "string", example: "Bearer" },
          expiresIn: { type: "string", example: "15m" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["USER", "ADMIN"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Building: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          address: { type: "string" },
          roomsCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      BuildingCreate: {
        type: "object",
        additionalProperties: false,
        required: ["name", "address"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100, example: "Budynek D" },
          address: { type: "string", minLength: 3, maxLength: 200, example: "ul. Nowa 5, Kraków" },
        },
      },
      BuildingUpdate: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100 },
          address: { type: "string", minLength: 3, maxLength: 200 },
        },
      },
      Room: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          capacity: { type: "integer" },
          building: { $ref: "#/components/schemas/BuildingRef" },
        },
      },
      BuildingRef: {
        type: "object",
        properties: { id: { type: "integer" }, name: { type: "string" } },
      },
      RoomCreate: {
        type: "object",
        additionalProperties: false,
        required: ["buildingId", "name", "capacity"],
        properties: {
          buildingId: { type: "integer", minimum: 1, example: 1 },
          name: { type: "string", minLength: 1, maxLength: 50, example: "301" },
          capacity: { type: "integer", minimum: 1, example: 40 },
        },
      },
      RoomUpdate: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          name: { type: "string", minLength: 1, maxLength: 50 },
          capacity: { type: "integer", minimum: 1 },
        },
      },
      Reservation: {
        type: "object",
        properties: {
          id: { type: "integer" },
          room: {
            type: "object",
            properties: { id: { type: "integer" }, name: { type: "string" }, building: { $ref: "#/components/schemas/BuildingRef" } },
          },
          user: { type: "object", properties: { id: { type: "integer" }, email: { type: "string", format: "email" } } },
          participants: { type: "integer" },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
          status: { type: "string", enum: ["CONFIRMED", "CANCELLED"] },
          createdAt: { type: "string", format: "date-time" },
          cancelledAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      ReservationCreate: {
        type: "object",
        additionalProperties: false,
        required: ["roomId", "participants", "startTime", "endTime"],
        properties: {
          roomId: { type: "integer", minimum: 1, example: 3 },
          participants: { type: "integer", minimum: 1, example: 10 },
          startTime: { type: "string", format: "date-time", example: "2026-12-01T10:00:00Z" },
          endTime: { type: "string", format: "date-time", example: "2026-12-01T12:00:00Z" },
        },
      },
      ReservationPage: {
        type: "object",
        properties: {
          data: { type: "array", items: ref("Reservation") },
          meta: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
    },
    responses: {
      BadRequest: json(ref("Error"), "Niepoprawne dane (VALIDATION_ERROR, INVALID_JSON)"),
      Unauthorized: json(ref("Error"), "Brak lub niepoprawny token (UNAUTHORIZED, INVALID_TOKEN, TOKEN_EXPIRED, INVALID_CREDENTIALS)"),
      Forbidden: json(ref("Error"), "Brak uprawnień (FORBIDDEN)"),
      NotFound: json(ref("Error"), "Nie znaleziono (NOT_FOUND)"),
      Conflict: json(ref("Error"), "Konflikt (EMAIL_TAKEN, ROOM_ALREADY_BOOKED, ROOM_CAPACITY_EXCEEDED, RESOURCE_IN_USE, ...)"),
    },
  },
};
