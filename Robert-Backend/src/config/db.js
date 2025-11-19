import { ID } from "node-appwrite";
import constants from "./constants.js";
import appwrite from "./appwrite.js";

const db = {};

Object.keys(constants.TABLES).forEach((key) => {
  const tableId = constants.TABLES[key];

  db[key] = {
    list: (queries = []) => {
      return appwrite.tablesDB.listRows({
        databaseId: constants.DB_ID,
        tableId: tableId,
        queries,
      });
    },
    get: (rowId) => {
      return appwrite.tablesDB.getRow({
        databaseId: constants.DB_ID,
        tableId: tableId,
        rowId,
      });
    },
    create: (data) => {
      return appwrite.tablesDB.createRow({
        databaseId: constants.DB_ID,
        tableId: tableId,
        rowId: ID.unique(),
        data,
      });
    },
    update: (rowId, data) => {
      return appwrite.tablesDB.updateRow({
        databaseId: constants.DB_ID,
        tableId: tableId,
        rowId,
        data,
      });
    },
    delete: (rowId) => {
      return appwrite.tablesDB.deleteRow({
        databaseId: constants.DB_ID,
        tableId: tableId,
        rowId,
      });
    },
    findOne: async (queries = []) => {
      const result = await appwrite.tablesDB.listRows({
        databaseId: constants.DB_ID,
        tableId: tableId,
        queries,
      });
      return result.rows.length > 0 ? result.rows[0] : null;
    },
  };
});

export default db;