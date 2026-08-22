const { getDB } = require("../config/db");

const dbCollection = (collectionName) => {
  const db = getDB();
  const parcelCollection = db.collection(`${collectionName}`);
  return { parcelCollection };
};

module.exports = { dbCollection };
