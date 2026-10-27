function toUserResponse(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
  };
}

module.exports = { toUserResponse };
