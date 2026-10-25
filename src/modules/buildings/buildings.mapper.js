function toBuildingResponse(b) {
  return {
    id: b.id,
    name: b.name,
    address: b.address,
    roomsCount: b.roomsCount,
    createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : null,
  };
}

module.exports = { toBuildingResponse };
