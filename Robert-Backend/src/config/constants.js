// constants.js
const constants = {
  DB_ID: "690ca284001cca2edff9",
  TABLES: {
    CUSTOMERS: "customers",
    STLS: "stls", 
    ORDERS: "orders",
    TEMPLATES: "690ca2a70034262b244c",
  },
  
  COLLECTION_SCHEMAS: {
    CUSTOMERS: {
      required: ['first_name', 'last_name', 'email', 'phone', 'delivery_address'],
      optional: []
    },
    STLS: {
      required: ['stl_file', 'material', 'colour', 'scale','cost'],
      optional: ['weight'] // Only fields that actually exist
    },
    ORDERS: {
      required: ['customer_id', 'first_name', 'last_name', 'stl_id','stl_file', 'status', 'time_of_placement', 'drop_off_location', 'delivery_type', 'price'],
      optional: ['total_amount', 'notes', 'shipping_address', 'phone']
    },
    TEMPLATES: {
      required: ['name', 'content'],
      optional: ['description', 'category']
    }
  }
};

export default constants;