// controllers/orderController.js
import appwrite from "../config/appwrite.js";
import { ID, Query } from 'node-appwrite';

console.log("🔄 ORDER CONTROLLER - Loading...");

const { databases } = appwrite;

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '690ca284001cca2edff9';
const CUSTOMERS_COLLECTION = 'CUSTOMERS';
const ORDERS_COLLECTION = 'ORDERS';
const STLS_COLLECTION = 'STLS';

// Valid delivery address values (from your Appwrite enum)
const VALID_DELIVERY_ADDRESSES = ['South C', 'Nairobi Town', 'Kikuyu', 'Roasters', 'Ruaka', 'Outer Ring'];

console.log("🔧 ORDER CONTROLLER - Using Database ID:", DATABASE_ID);

function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD_${timestamp}_${random}`;
}

export const createOrder = async (req, res) => {
  console.log('🎯 ORDER CONTROLLER - createOrder called');
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { customerData, stlFiles = [], orderDetails = {} } = req.body;

    if (!customerData || !customerData.email) {
      return res.status(400).json({
        success: false,
        error: 'Customer email is required'
      });
    }

    console.log('✅ Valid customer data received:', customerData.email);
    
    // 1. Validate and prepare delivery address
    const deliveryAddress = orderDetails.delivery_address || 'Nairobi Town';
    
    if (!VALID_DELIVERY_ADDRESSES.includes(deliveryAddress)) {
      return res.status(400).json({
        success: false,
        error: `Invalid delivery address. Must be one of: ${VALID_DELIVERY_ADDRESSES.join(', ')}`
      });
    }

    // 2. Create or find customer
    console.log('🔍 Looking for existing customer:', customerData.email);
    
    let customerId;
    try {
      const existingCustomers = await databases.listDocuments(
        DATABASE_ID,
        CUSTOMERS_COLLECTION,
        [Query.equal('email', customerData.email.trim())]
      );

      if (existingCustomers.total > 0) {
        customerId = existingCustomers.documents[0].$id;
        console.log('✅ Found existing customer:', customerId);
      } else {
        customerId = ID.unique();
        const customerDoc = {
          first_name: customerData.first_name || '',
          last_name: customerData.last_name || '',
          email: customerData.email.trim(),
          phone: parseInt(customerData.phone?.replace(/\D/g, '') || '0') || 0,
          delivery_address: orderDetails.delivery_address || 'Not specified' // Customer's actual address, not pickup location
        };
        
        console.log('📝 Creating customer with data:', customerDoc);
        
        await databases.createDocument(
          DATABASE_ID,
          CUSTOMERS_COLLECTION,
          customerId,
          customerDoc
        );
        console.log('✅ Created new customer:', customerId);
      }
    } catch (customerError) {
      console.error('❌ Customer processing failed:', customerError);
      return res.status(500).json({
        success: false,
        error: `Customer processing failed: ${customerError.message}`
      });
    }

    // 3. Generate order ID
    const orderId = generateOrderId();
    console.log('📋 Generated Order ID:', orderId);
    
    try {
      const createdOrders = [];
      const linkedSTLs = [];
      let totalOrderPrice = 0;

      // 4a. Create orders for STL files (one per STL)
      if (stlFiles && stlFiles.length > 0) {
        console.log(`🔄 Creating ${stlFiles.length} order(s) for STL files...`);
        
        for (const stlFile of stlFiles) {
          try {
            const orderDocId = ID.unique();
            const stlPrice = parseFloat(stlFile.price) || 0;
            totalOrderPrice += stlPrice;
            
          const orderData = {
            order_id: orderId,
            customer_id: customerId,
            status: 'order_made',
            price: stlPrice,
            delivery_type: orderDetails.delivery_type || 'standard',
            drop_off_location: deliveryAddress,
            payment_method: orderDetails.payment_method || 'pending', // ADD THIS
            stl_id: stlFile.metadata_id || 'unknown',
          };

            console.log(`📝 Creating order for STL ${stlFile.metadata_id}`);
            
            const order = await databases.createDocument(
              DATABASE_ID,
              ORDERS_COLLECTION,
              orderDocId,
              orderData
            );
            
            createdOrders.push(order);
            
            // Update STL file with order ID
            if (stlFile.metadata_id) {
              try {
                await databases.updateDocument(
                  DATABASE_ID,
                  STLS_COLLECTION,
                  stlFile.metadata_id,
                  {
                    stl_order: orderId
                  }
                );
                linkedSTLs.push({
                  metadata_id: stlFile.metadata_id,
                  stl_id: stlFile.stl_id || stlFile.file_id || 'unknown'
                });
                console.log(`✅ Linked STL ${stlFile.metadata_id} to order ${orderId}`);
              } catch (stlError) {
                console.warn(`⚠️ Could not link STL ${stlFile.metadata_id}:`, stlError.message);
              }
            }
            
          } catch (fileOrderError) {
            console.error(`❌ Failed to create order for STL:`, fileOrderError);
          }
        }
      }

      // 4b. Create order for regular items (if any)
      // Note: This assumes regular items are included in orderDetails.price
      // If you need separate handling, you'll need to send regular items from frontend
      const orderPriceFromDetails = parseFloat(orderDetails.price) || 0;
      
      // Only create a regular item order if there are no STL files OR if price differs
      if (stlFiles.length === 0 || orderPriceFromDetails > totalOrderPrice) {
        const orderDocId = ID.unique();
        const regularItemsPrice = stlFiles.length === 0 ? orderPriceFromDetails : (orderPriceFromDetails - totalOrderPrice);
        
        if (regularItemsPrice > 0) {
          const orderData = {
            order_id: orderId,
            customer_id: customerId,
            status: 'order_made',
            price: regularItemsPrice,
            delivery_type: orderDetails.delivery_type || 'standard',
            drop_off_location: deliveryAddress,
            payment_method: orderDetails.payment_method || 'pending',
            stl_id: 'tax_and_shipping',
          };

          console.log('📝 Creating order for regular items');
          
          const order = await databases.createDocument(
            DATABASE_ID,
            ORDERS_COLLECTION,
            orderDocId,
            orderData
          );
          
          createdOrders.push(order);
          totalOrderPrice += regularItemsPrice;
        }
      }

      // Check if any orders were created
      if (createdOrders.length === 0) {
        throw new Error('No orders were created');
      }

      console.log(`✅ Created ${createdOrders.length} order document(s) for order ${orderId}`);
      console.log(`💰 Total order price: $${totalOrderPrice.toFixed(2)}`);

      // 5. Return success response
      return res.status(201).json({
        success: true,
        message: `Order created successfully with ${createdOrders.length} item(s)`,
        order: {
          id: createdOrders[0].$id, // Return first order ID
          order_id: orderId,
          customer_id: customerId,
          customer_name: `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim(),
          customer_email: customerData.email,
          total: totalOrderPrice,
          status: 'order_made',
          delivery_type: orderDetails.delivery_type || 'standard',
          created_at: new Date().toISOString(),
          stl_files: linkedSTLs,
          order_count: createdOrders.length
        }
      });

    } catch (orderError) {
      console.error('❌ Order creation failed:', orderError);
      return res.status(500).json({
        success: false,
        error: `Order creation failed: ${orderError.message}`
      });
    }

  } catch (error) {
    console.error('🔥 ORDER CONTROLLER ERROR:', error.message);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};

export const debugDatabase = async (req, res) => {
  try {
    console.log('🔍 ORDER DEBUG - Checking database...');
    
    const [customers, orders, stls] = await Promise.all([
      databases.listDocuments(DATABASE_ID, CUSTOMERS_COLLECTION, [Query.limit(2)]),
      databases.listDocuments(DATABASE_ID, ORDERS_COLLECTION, [Query.limit(2)]),
      databases.listDocuments(DATABASE_ID, STLS_COLLECTION, [Query.limit(5)])
    ]);
    
    console.log('📊 Database status:', {
      customers: customers.total,
      orders: orders.total,
      stls: stls.total
    });
    
    return res.json({
      success: true,
      database: DATABASE_ID,
      valid_delivery_addresses: VALID_DELIVERY_ADDRESSES,
      collections: {
        customers: { 
          count: customers.total,
          sample: customers.documents.map(c => ({
            id: c.$id,
            name: `${c.first_name} ${c.last_name}`,
            email: c.email,
            delivery_address: c.delivery_address
          }))
        },
        orders: { 
          count: orders.total,
          sample: orders.documents.map(o => ({
            id: o.$id,
            order_id: o.order_id,
            customer_id: o.customer_id,
            stl_id: o.stl_id,
            price: o.price || 'N/A'
          }))
        },
        stls: { 
          count: stls.total,
          sample: stls.documents.map(s => ({
            id: s.$id,
            stl_id: s.stl_id,
            stl_order: s.stl_order,
            price: s.price ? `$${(s.price / 100).toFixed(2)}` : 'N/A'
          }))
        }
      }
    });
    
  } catch (error) {
    console.error('❌ DEBUG failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Debug failed',
      message: error.message
    });
  }
};

console.log("✅ ORDER CONTROLLER - Loaded successfully");