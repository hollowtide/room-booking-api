const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ConflictError, UnauthorizedError } = require("../../errors/AppError");

const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 10);

function createAuthService({ runInTransaction, jwtSecret, jwtExpiresIn, bcryptRounds }) {
  async function register({ email, password }) {
    const passwordHash = await bcrypt.hash(password, bcryptRounds);
    return runInTransaction(async ({ users }) => {
      const existing = await users.findByEmail(email);
      if (existing) throw new ConflictError("Email already registered", "EMAIL_TAKEN");
      return users.create({ email, passwordHash, role: "USER" });
    });
  }

  async function login({ email, password }) {
    const user = await runInTransaction(({ users }) => users.findByEmail(email));
    const passwordOk = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !passwordOk) {
      throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");
    }

    const accessToken = jwt.sign({ role: user.role }, jwtSecret, {
      subject: String(user.id),
      expiresIn: jwtExpiresIn,
      algorithm: "HS256",
    });

    return { accessToken, tokenType: "Bearer", expiresIn: jwtExpiresIn };
  }

  async function me(currentUser) {
    const user = await runInTransaction(({ users }) => users.findById(currentUser.id));
    if (!user) throw new UnauthorizedError("User no longer exists");
    return user;
  }

  return { register, login, me };
}

module.exports = { createAuthService };
