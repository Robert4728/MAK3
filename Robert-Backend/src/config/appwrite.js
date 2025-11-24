import {
  Client,
  Databases,  // This is the correct import for Tables API in v20
  Storage,
  Account,
  Users,
} from "node-appwrite";

import dotenv from "dotenv";
dotenv.config({ path: "./src/config/config.env"});

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const account = new Account(client);
const storage = new Storage(client);
const users = new Users(client);

const appwrite = {
  client,
  databases,  // This handles both traditional databases and tables
  account,
  storage,
  users
};

export default appwrite;