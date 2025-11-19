import db from "../config/db.js"
import appwrite from "../config/appwrite.js"
import { ID } from "node-appwrite"
import SuccessHandler from "../utils/SuccessHandler.js";
import ErrorHandler from "../utils/ErrorHandler.js";

const saveUserToDB = async (first_name,last_name,email,phone,delivery_adress) => {
  try {
    const newUser = await db.CUSTOMERS.create({
      first_name,
      last_name,
      email,
      phone,
      delivery_adress
    });

    return newUser;
  } catch (error) {
    console.error("Error saving user to database:", error);
  }
};

const registerUser = async (req, res) => {
  // #swagger.tags = ['AUTH']
  const { first_name,last_name,email,phone,delivery_adress } = req.body;

  if (!first_name || !last_name || !email || !phone || !delivery_adress) {
    return ErrorHandler("All fields are required", 400, req, res);
  }

  try {
    const user = await appwrite.account.create({
      userId: ID.unique(),
      first_name,
      last_name,
      email,
      phone,
      delivery_adress
    });

    // const avatarUrl = `https://cloud.appwrite.io/v1/avatars/initials?name=${encodeURIComponent(
    //   user.name
    // )}`;
    // console.log("Avatar URL generated:", avatarUrl);

    const session = await appwrite.account.createEmailPasswordSession({
      email,
      password: "password",
    });

    res.cookie(`a_session_${process.env.APPWRITE_PROJECT_ID}`, session.secret, {
      // use the session secret as the cookie value
      httpOnly: true,
      secure: false, // set to true if using HTTPS
      sameSite: "lax",
      expires: new Date(session.expire),
      path: "/",
    });

    const savedUser = await saveUserToDB(user.$id, name, email, role);
    return SuccessHandler("User registered successfully", 201, res, savedUser);
  } catch (error) {
    console.error("Registration failed:", error);
    return ErrorHandler("Failed to register user", 500, req, res);
  }
};

const  authController = {
    registerUser
}

export default authController