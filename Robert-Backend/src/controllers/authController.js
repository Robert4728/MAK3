import db from "../config/db.js";
import appwrite from "../config/appwrite.js";
import { ID, Query } from "node-appwrite";
import SuccessHandler from "../utils/SuccessHandler.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";

// Check if customer with email already exists
const checkExistingCustomer = async (email) => {
  try {
    console.log("🔍 AUTH - Checking for existing customer with email:", email);
    
    const existingCustomers = await db.CUSTOMERS.list([
      Query.equal('email', email)
    ]);

    if (existingCustomers.total > 0) {
      console.log("✅ AUTH - Found existing customer:", existingCustomers.documents[0].$id);
      return {
        exists: true,
        customer: existingCustomers.documents[0]
      };
    }
    
    console.log("🆕 AUTH - No existing customer found");
    return {
      exists: false,
      customer: null
    };
  } catch (error) {
    console.error("❌ AUTH - Error checking existing customer:", error);
    return {
      exists: false,
      customer: null,
      error: error.message
    };
  }
};

// Simple customer creation (for checkout without Appwrite auth)
const createCustomerForCheckout = async (customerData) => {
  try {
    console.log("🔍 AUTH - Creating customer for checkout:", customerData.email);
    
    const existingCheck = await checkExistingCustomer(customerData.email);
    
    if (existingCheck.exists) {
      console.log("✅ AUTH - Customer already exists, returning existing");
      return existingCheck.customer;
    }
    
    console.log("🆕 AUTH - Creating new checkout customer");
    
    const phoneNumber = parseInt(customerData.phone.toString().replace(/\D/g, '')) || 0;
    const deliveryAddress = customerData.delivery_address.toString().substring(0, 255);
    
    const newCustomer = await db.CUSTOMERS.create({
      first_name: customerData.first_name,
      last_name: customerData.last_name,
      email: customerData.email,
      phone: phoneNumber,
      delivery_address: deliveryAddress,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    console.log("✅ AUTH - New checkout customer created:", newCustomer.$id);
    return newCustomer;
  } catch (error) {
    console.error("❌ AUTH - Create customer for checkout failed:", error);
    throw error;
  }
};

// Check email endpoint (for checkout flow)
const checkEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return next(new ErrorHandler("Email is required", 400));
    }
    
    console.log("🔍 AUTH - Checking email:", email);
    
    const result = await checkExistingCustomer(email);
    
    console.log("✅ AUTH - Email check complete");
    
    return SuccessHandler("Email check completed", 200, res, {
      email: email,
      exists: result.exists,
      customer_id: result.exists ? result.customer.$id : null,
      message: result.exists 
        ? "Customer already exists" 
        : "Customer not found"
    });
  } catch (error) {
    console.error("❌ AUTH - Email check failed:", error);
    return next(new ErrorHandler("Failed to check email", 500));
  }
};

// Register user (with Appwrite Auth)
const registerUser = async (req, res, next) => {
  const { first_name, last_name, email, phone, delivery_address, password } = req.body;

  console.log("🎯 AUTH - Registration attempt for:", email);

  if (!first_name || !last_name || !email || !phone || !delivery_address || !password) {
    console.log("❌ AUTH - Missing required fields");
    return next(new ErrorHandler("All fields are required", 400));
  }

  try {
    // 1. Check if customer already exists
    const existingCheck = await checkExistingCustomer(email);
    
    if (existingCheck.exists) {
      console.log("❌ AUTH - Customer already has an account");
      return next(new ErrorHandler("An account with this email already exists", 409));
    }

    // 2. Create user in Appwrite Auth
    console.log("🔐 AUTH - Creating user in Appwrite Auth");
    const user = await appwrite.account.create(
      ID.unique(),
      email,
      password,
      `${first_name} ${last_name}`
    );

    console.log("✅ AUTH - Appwrite user created:", user.$id);

    // 3. Save user to CUSTOMERS collection
    console.log("💾 AUTH - Saving customer to database");
    const phoneNumber = parseInt(phone.toString().replace(/\D/g, '')) || 0;
    const deliveryAddress = delivery_address.toString().substring(0, 255);

    const savedUser = await db.CUSTOMERS.create({
      userId: user.$id,
      first_name,
      last_name,
      email,
      phone: phoneNumber,
      delivery_address: deliveryAddress,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    console.log("✅ AUTH - Customer saved to database:", savedUser.$id);

    // 4. Create session (login the user)
    const session = await appwrite.account.createEmailPasswordSession(email, password);

    // 5. Set session cookie
    res.cookie(`a_session_${process.env.APPWRITE_PROJECT_ID}`, session.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    console.log("✅ AUTH - Session created and cookie set");

    // 6. Return success response
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
        session: session,
        customer_id: savedUser.$id
      }
    );

  } catch (error) {
    console.error("❌ AUTH - Registration failed:", error);
    
    // Handle duplicate email error from Appwrite
    if (error.message && error.message.includes('already registered')) {
      return next(new ErrorHandler("An account with this email already exists", 409));
    }
    
    return next(new ErrorHandler(error.message || "Failed to register user", 500));
  }
};

// Login user
const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  console.log("🔐 AUTH - Login attempt for:", email);

  if (!email || !password) {
    console.log("❌ AUTH - Email and password required");
    return next(new ErrorHandler("Email and password are required", 400));
  }

  try {
    // 1. Create session in Appwrite
    const session = await appwrite.account.createEmailPasswordSession(email, password);
    const user = await appwrite.account.get();

    console.log("✅ AUTH - Appwrite login successful for:", user.email);

    // 2. Check if customer exists in database, create if not
    const existingCheck = await checkExistingCustomer(email);
    
    if (!existingCheck.exists) {
      console.log("ℹ️ AUTH - Customer not found in database, creating...");
      
      // Extract first and last name from user name
      const nameParts = user.name ? user.name.split(' ') : ['', ''];
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';
      
      const customer = await db.CUSTOMERS.create({
        userId: user.$id,
        first_name: first_name,
        last_name: last_name,
        email: user.email,
        phone: 0,
        delivery_address: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      console.log("✅ AUTH - New customer created during login:", customer.$id);
    }

    // 3. Set session cookie
    res.cookie(`a_session_${process.env.APPWRITE_PROJECT_ID}`, session.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    console.log("✅ AUTH - Session cookie set");

    // 4. Return success response
    return SuccessHandler(
      "Login successful", 
      200, 
      res, 
      {
        user: user,
        session: session,
        customer_id: existingCheck.exists ? existingCheck.customer.$id : null
      }
    );

  } catch (error) {
    console.error("❌ AUTH - Login failed:", error);
    
    // More specific error messages
    if (error.message && error.message.includes('Invalid credentials')) {
      return next(new ErrorHandler("Invalid email or password", 401));
    }
    
    return next(new ErrorHandler("Login failed. Please try again.", 401));
  }
};

// Get current user
const getCurrentUser = async (req, res, next) => {
  try {
    console.log("👤 AUTH - Getting current user");
    
    const user = await appwrite.account.get();
    
    // Also get customer details from database
    const existingCheck = await checkExistingCustomer(user.email);
    
    console.log("✅ AUTH - User fetched successfully");
    
    return SuccessHandler("User fetched successfully", 200, res, { 
      user: user,
      customer: existingCheck.exists ? existingCheck.customer : null
    });
  } catch (error) {
    console.error("❌ AUTH - Get current user failed:", error);
    return next(new ErrorHandler("Not authenticated", 401));
  }
};

// Logout user
const logoutUser = async (req, res, next) => {
  try {
    console.log("🚪 AUTH - Logging out user");
    
    await appwrite.account.deleteSession('current');
    res.clearCookie(`a_session_${process.env.APPWRITE_PROJECT_ID}`);
    
    console.log("✅ AUTH - Logout successful");
    
    return SuccessHandler("Logout successful", 200, res);
  } catch (error) {
    console.error("❌ AUTH - Logout failed:", error);
    return next(new ErrorHandler(error.message, 500));
  }
};

const authController = {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  checkEmail,
  createCustomerForCheckout
};

export default authController;