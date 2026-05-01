// Phase 3 — Returns dashboard data for doctor view
exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'doctor-feed: coming in Phase 3' })
  };
};
