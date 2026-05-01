// Phase 2 — Handles agent turns during pre-visit intake conversation
exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'intake-conversation: coming in Phase 2' })
  };
};
