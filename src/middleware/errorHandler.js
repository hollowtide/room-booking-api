const { AppError } = require("../errors/AppError");

const PG_CONSTRAINTS = {
  users_email_unique: { status: 409, code: "EMAIL_TAKEN", message: "Email already registered" },
  rooms_building_id_name_unique: { status: 409, code: "ROOM_NAME_TAKEN", message: "Room with this name already exists in the building" },
  buildings_name_unique: { status: 409, code: "BUILDING_NAME_TAKEN", message: "Building with this name already exists" },
};

const PG_ERRORS = {
  "23505": { status: 409, code: "ALREADY_EXISTS", message: "Resource already exists" },
  "23503": { status: 409, code: "RESOURCE_IN_USE", message: "Resource is referenced by other data" },
  "23P01": { status: 409, code: "ROOM_ALREADY_BOOKED", message: "Room is already booked in this time range" },
  "23514": { status: 400, code: "CONSTRAINT_VIOLATION", message: "Data violates a database constraint" },
};

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId: req.id,
      },
    });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "Request body is not valid JSON", requestId: req.id },
    });
  }

  const pg = PG_CONSTRAINTS[err.constraint] ?? PG_ERRORS[err.code];
  if (pg) {
    return res.status(pg.status).json({
      error: { code: pg.code, message: pg.message, requestId: req.id },
    });
  }

  console.error(`[${req.id}]`, err);
  res.status(500).json({
    error: { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong", requestId: req.id },
  });
}

module.exports = errorHandler;
