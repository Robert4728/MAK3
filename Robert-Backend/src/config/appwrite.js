import {
  Client,
  TablesDB,
  Avatars,
  Storage,
  Account,
  Users,
  Teams,
} from "node-appwrite";

import dotenv from "dotenv";
dotenv.config({ path: "./src/config/config.env"});

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_SECRET_KEY);

const sessionClient = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID);

const users = new Users(client);
const tablesDB = new TablesDB(client);
const account = new Account(client);
const storage = new Storage(client);
const avatars = new Avatars(client);
const teams = new Teams(client);


const appwrite =  {
  client,
  sessionClient,
  tablesDB,
  account,
  storage,
  avatars,
  users,
  teams,
};

export default appwrite