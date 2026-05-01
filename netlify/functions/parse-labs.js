// Phase 4 — Parses uploaded lab PDFs via Claude
exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'parse-labs: coming in Phase 4' })
  };
};
