import db from "../config/db.js";
import appwrite from "../config/appwrite.js";
import { ID } from "node-appwrite";
import SuccessHandler from "../utils/SuccessHandler.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";

const saveUserToDB = async (userId, first_name, last_name, email, phone, delivery_address) => {
  try {
    const newUser = await db.CUSTOMERS.create({
      userId: userId,
      first_name,
      last_name,
      email,
      phone,
      delivery_address,
      role: 'customer',
      createdAt: new Date().toISOString()
    });

    return newUser;
  } catch (error) {
    console.error("Error saving user to database:", error);
    throw error;
  }
};

const registerUser = async (req, res, next) => {
  const { first_name, last_name, email, phone, delivery_address, password } = req.body;

  if (!first_name || !last_name || !email || !phone || !delivery_address || !password) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  try {
    // 1. Create user in Appwrite Auth
    const user = await appwrite.account.create(
      ID.unique(),
      email,
      password,
      `${first_name} ${last_name}`
    );

    // 2. Save user to CUSTOMERS collection
    const savedUser = await saveUserToDB(
      user.$id,
      first_name,
      last_name,
      email,
      phone,
      delivery_address
    );

    // 3. Create session (login the user)
    const session = await appwrite.account.createEmailPasswordSession(email, password);

    // 4. Set session cookie
    res.cookie(`a_session_${process.env.APPWRITE_PROJECT_ID}`, session.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    // 5. Return success response
    return SuccessHandler(
      "User registered successfully", 
      201, 
      res, 
      {
        user: {
          $id: user.$id,
          email: user.email,
          name: user.name,
          first_name: first_name,
          last_name: last_name
        },
        session: session
      }
    );

  } catch (error) {
    console.error("Registration failed:", error);
    return next(new ErrorHandler(error.message || "Failed to register user", 500));
  }
};

const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Email and password are required", 400));
  }

  try {
    const session = await appwrite.account.createEmailPasswordSession(email, password);
    const user = await appwrite.account.get();

    res.cookie(`a_session_${process.env.APPWRITE_PROJECT_ID}`, session.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return SuccessHandler(
      "Login successful", 
      200, 
      res, 
      {
        user: user,
        session: session
      }
    );

  } catch (error) {
    console.error("Login failed:", error);
    return next(new ErrorHandler("Invalid credentials", 401));
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await appwrite.account.get();
    return SuccessHandler("User fetched successfully", 200, res, { user });
  } catch (error) {
    return next(new ErrorHandler("Not authenticated", 401));
  }
};

const logoutUser = async (req, res, next) => {
  try {
    await appwrite.account.deleteSession('current');
    res.clearCookie(`a_session_${process.env.APPWRITE_PROJECT_ID}`);
    return SuccessHandler("Logout successful", 200, res);
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
};

const authController = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser
};

export default authController;