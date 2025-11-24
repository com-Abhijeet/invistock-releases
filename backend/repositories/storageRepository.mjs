// import db from "../db/db.mjs";

export const createStorageLocation = async ({ name }) => {
  return db
    .prepare("INSERT INTO storage_locations (name) VALUES (?)")
    .run(name);
};
