// controllers/orderController.js
import db from "../config/db.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import SuccessHandler from "../utils/SuccessHandler.js";
import { Query } from 'node-appwrite';

// Valid options for enums (from your Appwrite schema)
const VALID_MATERIALS = ['pla', 'abs', 'petg', 'nylon'];
const VALID_COLOURS = ['black', 'white', 'orange', 'blue'];

// Validation helper
function validateOrderData(customerData, stlFiles, orderDetails) {
  console.log('🔍 ORDER CONTROLLER - Starting validation');
  
  // Validate customer data
  if (!customerData) {
    throw new ErrorHandler('Customer data is required', 400);
  }

  const requiredCustomerFields = ['first_name', 'last_name', 'email', 'phone', 'delivery_address'];
  const missingCustomerFields = requiredCustomerFields.filter(field => !customerData[field]);
  
  if (missingCustomerFields.length > 0) {
    throw new ErrorHandler(`Missing required customer fields: ${missingCustomerFields.join(', ')}`, 400);
  }

  // Validate phone is a valid number
  const phoneAsInt = parseInt(customerData.phone.toString().replace(/\D/g, ''));
  if (isNaN(phoneAsInt)) {
    throw new ErrorHandler('Phone number must be a valid number', 400);
  }

  // Validate delivery address length
  if (customerData.delivery_address.length > 255) {
    throw new ErrorHandler('Delivery address must be 255 characters or less', 400);
  }

  // Validate STL files
  if (!stlFiles || !Array.isArray(stlFiles) || stlFiles.length === 0) {
    throw new ErrorHandler('At least one STL file is required', 400);
  }

  for (const [index, file] of stlFiles.entries()) {
    if (!file.stl_file) {
      throw new ErrorHandler(`STL file ${index + 1} must have stl_file field`, 400);
    }
    if (!file.material) {
      throw new ErrorHandler(`STL file ${index + 1} must have material specified`, 400);
    }
    if (!VALID_MATERIALS.includes(file.material)) {
      throw new ErrorHandler(`Invalid material for STL file ${index + 1}: "${file.material}". Must be one of: ${VALID_MATERIALS.join(', ')}`, 400);
    }
    if (!file.colour) {
      throw new ErrorHandler(`STL file ${index + 1} must have colour specified`, 400);
    }
    if (!VALID_COLOURS.includes(file.colour)) {
      throw new ErrorHandler(`Invalid colour for STL file ${index + 1}: "${file.colour}". Must be one of: ${VALID_COLOURS.join(', ')}`, 400);
    }
    if (!file.scale && file.scale !== 0) {
      throw new ErrorHandler(`STL file ${index + 1} must have scale specified`, 400);
    }
    if (!file.cost && file.cost !== 0) {
      throw new ErrorHandler(`STL file ${index + 1} must have cost specified`, 400);
    }
  }

  // Validate order details
  if (!orderDetails) {
    throw new ErrorHandler('Order details are required', 400);
  }
  if (!orderDetails.price) {
    throw new ErrorHandler('Order price is required', 400);
  }
  if (!orderDetails.delivery_type) {
    throw new ErrorHandler('Delivery type is required', 400);
  }

  console.log('✅ ORDER CONTROLLER - Validation passed');
}

// Customer management
async function createOrFindCustomer(customerData) {
  try {
    console.log('🔍 CUSTOMER - Checking for existing customer:', customerData.email);
    
    // Check if customer already exists
    const existingCustomer = await db.CUSTOMERS.findOne([
      Query.equal('email', customerData.email)
    ]);

    if (existingCustomer) {
      console.log('✅ CUSTOMER - Found existing customer:', existingCustomer.$id);
      return {
        customerId: existingCustomer.$id,
        firstName: existingCustomer.first_name,
        lastName: existingCustomer.last_name,
        phone: existingCustomer.phone,
        deliveryAddress: existingCustomer.delivery_address
      };
    }

    // Create new customer
    console.log('🔍 CUSTOMER - Creating new customer');
    const phoneNumber = parseInt(customerData.phone.toString().replace(/\D/g, '')) || 0;
    const deliveryAddress = customerData.delivery_address.toString().substring(0, 255);

    const newCustomer = await db.CUSTOMERS.create({
      first_name: customerData.first_name,
      last_name: customerData.last_name,
      email: customerData.email,
      phone: phoneNumber,
      delivery_address: deliveryAddress
    });

    console.log('✅ CUSTOMER - Created new customer:', newCustomer.$id);
    return {
      customerId: newCustomer.$id,
      firstName: newCustomer.first_name,
      lastName: newCustomer.last_name,
      phone: newCustomer.phone,
      deliveryAddress: newCustomer.delivery_address
    };
  } catch (error) {
    console.error('❌ CUSTOMER - Processing failed:', error.message);
    throw new ErrorHandler(`Customer processing failed: ${error.message}`, 400);
  }
}

// STL file creation
async function createSTLFile(fileData) {
  try {
    console.log('🔍 STL - Creating STL file with data:', fileData);

    // Prepare STL data with proper types
    const stlData = {
      stl_file: fileData.stl_file, // Required URL
      material: fileData.material, // Required enum
      colour: fileData.colour, // Required enum
      scale: parseFloat(fileData.scale) || 1.0, // Required double
      cost: parseInt(fileData.cost) || 0, // Required integer
      weight: parseFloat(fileData.weight) || 0 // Optional double
    };

    console.log('🔍 STL - Final STL data:', stlData);

    const stlFile = await db.STLS.create(stlData);
    console.log('✅ STL - Created STL file:', stlFile.$id);
    return stlFile.$id;
  } catch (error) {
    console.error('❌ STL - Creation failed:', error.message);
    throw new ErrorHandler(`STL file creation failed: ${error.message}`, 400);
  }
}

// Order record creation - UPDATED: Only send fields that exist in ORDERS collection
async function createOrderRecord({ customer, stlId, orderDetails, deliveryAddress, stlFileUrl }) {
  try {
    console.log('🔍 ORDER - Creating order record');
    
    const orderData = {
      // ONLY fields that exist in ORDERS collection
      customer_id: customer.customerId,
      first_name: customer.firstName,
      last_name: customer.lastName,
      stl_id: stlId,
      stl_file: stlFileUrl,
      status: 'order_made',
      time_of_placement: new Date().toISOString(),
      drop_off_location: deliveryAddress,
      delivery_type: orderDetails.delivery_type,
      price: parseFloat(orderDetails.price),
      
      // REMOVED: phone, total_amount, notes, shipping_address (they don't exist in ORDERS)
    };

    console.log('🔍 ORDER - Final order data:', orderData);
    const order = await db.ORDERS.create(orderData);
    console.log('✅ ORDER - Created order:', order.$id);
    return order;
  } catch (error) {
    console.error('❌ ORDER - Record creation failed:', error.message);
    throw new ErrorHandler(`Order creation failed: ${error.message}`, 400);
  }
}

// Main order creation function
async function createOrder(req, res, next) {
  try {
    const { customerData, stlFiles, orderDetails } = req.body;

    console.log('🎯 ORDER - Starting order creation process');
    console.log('📦 ORDER - Customer Data:', customerData);
    console.log('📦 ORDER - STL Files:', stlFiles);
    console.log('📦 ORDER - Order Details:', orderDetails);

    // 1. Validate all required data exists
    validateOrderData(customerData, stlFiles, orderDetails);

    // 2. Create or find customer
    const customer = await createOrFindCustomer(customerData);
    console.log('✅ ORDER - Customer processed:', customer.customerId);

    // 3. Create STL records
    const stlIds = [];
    const stlFileUrls = [];
    
    for (const file of stlFiles) {
      const stlId = await createSTLFile(file);
      stlIds.push(stlId);
      stlFileUrls.push(file.stl_file); // Store the URL for order creation
      console.log('✅ ORDER - STL file created:', stlId);
    }

    // 4. Create orders (one order per STL file)
    const orders = [];
    for (let i = 0; i < stlIds.length; i++) {
      const stlId = stlIds[i];
      const stlFileUrl = stlFileUrls[i];
      
      console.log('🔍 ORDER - Creating order for STL:', stlId);
      
      const order = await createOrderRecord({
        customer,
        stlId,
        orderDetails,
        deliveryAddress: customer.deliveryAddress,
        stlFileUrl: stlFileUrl // Pass the STL file URL
      });
      
      orders.push(order);
      console.log('✅ ORDER - Order created:', order.$id);
    }

    console.log('🎉 ORDER - All orders created successfully');
    return SuccessHandler(
      'Order created successfully', 
      201, 
      res, 
      { 
        message: `Created ${orders.length} order(s) successfully`,
        orders: orders.map(order => ({
          id: order.$id,
          customer_id: order.customer_id,
          stl_id: order.stl_id,
          status: order.status
        }))
      }
    );
  } catch (error) {
    console.error('❌ ORDER - Creation failed:', error.message);
    next(error);
  }
}

// Get order with full details
async function getOrderWithDetails(req, res, next) {
  try {
    const { id } = req.params;
    console.log('📄 ORDER - Getting order details:', id);
    
    const order = await db.ORDERS.get(id);
    const customer = await db.CUSTOMERS.get(order.customer_id);
    const stlFile = await db.STLS.get(order.stl_id);

    const orderWithDetails = {
      ...order,
      customer: {
        id: customer.$id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone: customer.phone,
        delivery_address: customer.delivery_address,
        created_at: customer.created_at,
        updated_at: customer.updated_at
      },
      stl_file: {
        id: stlFile.$id,
        stl_file: stlFile.stl_file,
        material: stlFile.material,
        colour: stlFile.colour,
        scale: stlFile.scale,
        weight: stlFile.weight,
        cost: stlFile.cost
      }
    };

    console.log('✅ ORDER - Details fetched successfully');
    return SuccessHandler(
      'Order details fetched successfully',
      200,
      res,
      { order: orderWithDetails }
    );
  } catch (error) {
    console.error('❌ ORDER - Get details failed:', error.message);
    next(new ErrorHandler('Order not found', 404));
  }
}

// Get all orders for a customer
async function getCustomerOrders(req, res, next) {
  try {
    const { customerId } = req.params;
    console.log('📋 ORDER - Getting orders for customer:', customerId);
    
    const orders = await db.ORDERS.list([
      Query.equal('customer_id', customerId)
    ]);
    
    const ordersWithDetails = await Promise.all(
      orders.documents.map(async (order) => {
        const customer = await db.CUSTOMERS.get(order.customer_id);
        const stlFile = await db.STLS.get(order.stl_id);
        
        return {
          ...order,
          customer_name: `${customer.first_name} ${customer.last_name}`,
          customer_email: customer.email,
          stl_file_url: stlFile.stl_file,
          stl_material: stlFile.material,
          stl_colour: stlFile.colour
        };
      })
    );

    console.log('✅ ORDER - Customer orders fetched:', ordersWithDetails.length);
    return SuccessHandler(
      'Customer orders fetched successfully',
      200,
      res,
      { 
        orders: ordersWithDetails,
        total: orders.total
      }
    );
  } catch (error) {
    console.error('❌ ORDER - Get customer orders failed:', error.message);
    next(error);
  }
}

// Get valid options for frontend dropdowns
async function getSTLOptions(req, res, next) {
  try {
    console.log('⚙️ ORDER - Getting STL options');
    
    return SuccessHandler(
      'STL options fetched successfully',
      200,
      res,
      {
        materials: VALID_MATERIALS,
        colours: VALID_COLOURS
      }
    );
  } catch (error) {
    console.error('❌ ORDER - Get STL options failed:', error.message);
    next(error);
  }
}

// Export all functions
export {
  createOrder,
  getOrderWithDetails,
  getCustomerOrders,
  getSTLOptions
};

// Export default for backward compatibility
export default {
  createOrder,
  getOrderWithDetails,
  getCustomerOrders,
  getSTLOptions
};