// config/db.js
import { ID, Query } from "node-appwrite";
import constants from "./constants.js";
import appwrite from "./appwrite.js";

class Database {
  constructor() {
    this.db = appwrite.databases;
    this.dbId = constants.DB_ID;
    this.collections = constants.TABLES;
    
    console.log('🔧 Database initialized with:');
    console.log('   - DB_ID:', this.dbId);
    console.log('   - Collections:', Object.keys(this.collections));
  }

  // Generic validation function
  validateData(collectionKey, data) {
    console.log(`🔍 VALIDATION - Validating data for ${collectionKey}`);
    console.log(`🔍 VALIDATION - Data received:`, data);
    
    const schema = constants.COLLECTION_SCHEMAS?.[collectionKey];
    console.log(`🔍 VALIDATION - Schema for ${collectionKey}:`, schema);
    
    if (!schema) {
      console.log(`⚠️ VALIDATION - No schema defined for ${collectionKey}, skipping validation`);
      return; // No schema defined, skip validation
    }
    
    const required = schema.required || [];
    console.log(`🔍 VALIDATION - Required fields for ${collectionKey}:`, required);
    
    const missing = required.filter(field => {
      const value = data[field];
      const isMissing = value === undefined || value === null || value === '';
      console.log(`🔍 VALIDATION - Field ${field}: value="${value}", missing=${isMissing}`);
      return isMissing;
    });
    
    console.log(`🔍 VALIDATION - Missing fields for ${collectionKey}:`, missing);
    
    if (missing.length > 0) {
      const errorMsg = `Invalid document structure: Missing required attributes: ${missing.join(', ')}`;
      console.error(`❌ VALIDATION FAILED for ${collectionKey}:`, errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log(`✅ VALIDATION PASSED for ${collectionKey}`);
  }

  // Apply ONLY defaults that exist in the schema
  applyDefaults(collectionKey, data) {
    console.log(`🔍 DEFAULTS - Applying defaults for ${collectionKey}`);
    console.log(`🔍 DEFAULTS - Original data:`, data);
    
    const defaults = {
      ORDERS: {
        status: 'pending',
      },
      CUSTOMERS: {
        // No defaults for customers
      },
      STLS: {
        // No defaults for STLS
      },
      TEMPLATES: {
        // No defaults for templates
      }
    };

    const collectionDefaults = defaults[collectionKey] || {};
    console.log(`🔍 DEFAULTS - Defaults for ${collectionKey}:`, collectionDefaults);
    
    // Only include defaults that are actually in the data (not auto-adding unknown fields)
    const safeDefaults = {};
    Object.keys(collectionDefaults).forEach(key => {
      if (data[key] === undefined) {
        safeDefaults[key] = collectionDefaults[key];
        console.log(`🔍 DEFAULTS - Adding default for ${key}:`, collectionDefaults[key]);
      }
    });

    const result = {
      ...safeDefaults,
      ...data
    };
    
    console.log(`🔍 DEFAULTS - Final data after defaults:`, result);
    return result;
  }

  // Get collection ID
  getCollectionId(collectionKey) {
    console.log(`🔍 COLLECTION - Looking up ID for ${collectionKey}`);
    const collectionId = this.collections[collectionKey];
    
    if (!collectionId) {
      const errorMsg = `Collection '${collectionKey}' not found in constants.TABLES`;
      console.error(`❌ COLLECTION ERROR:`, errorMsg);
      console.log(`🔍 COLLECTION - Available collections:`, Object.keys(this.collections));
      throw new Error(errorMsg);
    }
    
    console.log(`🔍 COLLECTION - Found ID for ${collectionKey}: ${collectionId}`);
    return collectionId;
  }

  // List documents with pagination and queries
  async list(collectionKey, queries = [], limit = 100, offset = 0, orderField = null, orderType = 'ASC') {
    try {
      console.log(`📋 LIST - Listing documents from ${collectionKey}`);
      console.log(`📋 LIST - Queries:`, queries);
      console.log(`📋 LIST - Limit: ${limit}, Offset: ${offset}`);
      
      const collectionId = this.getCollectionId(collectionKey);
      
      let options = { queries, limit, offset };
      
      if (orderField) {
        options.orderField = orderField;
        options.orderType = orderType;
        console.log(`📋 LIST - Order: ${orderField} ${orderType}`);
      }

      console.log(`📋 LIST - Calling Appwrite listDocuments...`);
      const result = await this.db.listDocuments(
        this.dbId,
        collectionId,
        options.queries,
        options.limit,
        options.offset,
        options.orderField,
        options.orderType
      );
      
      console.log(`✅ LIST - Successfully listed ${result.documents.length} documents from ${collectionKey}`);
      return result;
    } catch (error) {
      console.error(`❌ LIST ERROR - Failed to list documents from ${collectionKey}:`, error.message);
      throw error;
    }
  }

  // Get single document by ID
  async get(collectionKey, documentId) {
    try {
      console.log(`📄 GET - Getting document from ${collectionKey}`);
      console.log(`📄 GET - Document ID: ${documentId}`);
      
      const collectionId = this.getCollectionId(collectionKey);
      
      console.log(`📄 GET - Calling Appwrite getDocument...`);
      const result = await this.db.getDocument(
        this.dbId,
        collectionId,
        documentId
      );
      
      console.log(`✅ GET - Successfully retrieved document from ${collectionKey}`);
      return result;
    } catch (error) {
      console.error(`❌ GET ERROR - Failed to get document from ${collectionKey}:`, error.message);
      throw error;
    }
  }

  // Create document with validation and SAFE defaults
  async create(collectionKey, data) {
    try {
      console.log(`🆕 CREATE - Starting document creation in ${collectionKey}`);
      console.log(`🆕 CREATE - Raw data received:`, data);
      
      const collectionId = this.getCollectionId(collectionKey);
      
      // Validate data
      console.log(`🆕 CREATE - Running validation...`);
      this.validateData(collectionKey, data);
      
      // Apply safe defaults (only fields we're sure exist)
      console.log(`🆕 CREATE - Applying defaults...`);
      const documentData = this.applyDefaults(collectionKey, data);
      
      console.log(`🆕 CREATE - Final data to create:`, documentData);
      console.log(`🆕 CREATE - Calling Appwrite createDocument...`);
      
      const result = await this.db.createDocument(
        this.dbId,
        collectionId,
        ID.unique(),
        documentData
      );
      
      console.log(`✅ CREATE - Successfully created document in ${collectionKey}`);
      console.log(`✅ CREATE - New document ID: ${result.$id}`);
      return result;
    } catch (error) {
      console.error(`❌ CREATE ERROR - Failed to create document in ${collectionKey}:`, error.message);
      console.error(`❌ CREATE ERROR - Full error:`, error);
      throw error;
    }
  }

  // Update document - remove auto updated_at if it doesn't exist
  async update(collectionKey, documentId, data) {
    try {
      console.log(`✏️ UPDATE - Updating document in ${collectionKey}`);
      console.log(`✏️ UPDATE - Document ID: ${documentId}`);
      console.log(`✏️ UPDATE - Update data:`, data);
      
      const collectionId = this.getCollectionId(collectionKey);
      
      console.log(`✏️ UPDATE - Calling Appwrite updateDocument...`);
      const result = await this.db.updateDocument(
        this.dbId,
        collectionId,
        documentId,
        data
      );
      
      console.log(`✅ UPDATE - Successfully updated document in ${collectionKey}`);
      return result;
    } catch (error) {
      console.error(`❌ UPDATE ERROR - Failed to update document in ${collectionKey}:`, error.message);
      throw error;
    }
  }

  // Delete document
  async delete(collectionKey, documentId) {
    try {
      console.log(`🗑️ DELETE - Deleting document from ${collectionKey}`);
      console.log(`🗑️ DELETE - Document ID: ${documentId}`);
      
      const collectionId = this.getCollectionId(collectionKey);
      
      console.log(`🗑️ DELETE - Calling Appwrite deleteDocument...`);
      const result = await this.db.deleteDocument(
        this.dbId,
        collectionId,
        documentId
      );
      
      console.log(`✅ DELETE - Successfully deleted document from ${collectionKey}`);
      return result;
    } catch (error) {
      console.error(`❌ DELETE ERROR - Failed to delete document from ${collectionKey}:`, error.message);
      throw error;
    }
  }

  // Find single document by queries
  async findOne(collectionKey, queries = []) {
    try {
      console.log(`🔎 FIND ONE - Finding single document in ${collectionKey}`);
      console.log(`🔎 FIND ONE - Queries:`, queries);
      
      const collectionId = this.getCollectionId(collectionKey);
      
      console.log(`🔎 FIND ONE - Calling Appwrite listDocuments with limit 1...`);
      const result = await this.db.listDocuments(
        this.dbId,
        collectionId,
        queries,
        1
      );
      
      const found = result.documents.length > 0 ? result.documents[0] : null;
      console.log(`🔎 FIND ONE - ${found ? 'Found document' : 'No document found'}`);
      
      return found;
    } catch (error) {
      console.error(`❌ FIND ONE ERROR - Failed to find document in ${collectionKey}:`, error.message);
      throw error;
    }
  }

  // Find multiple documents by queries
  async find(collectionKey, queries = [], limit = 100) {
    try {
      console.log(`🔎 FIND - Finding documents in ${collectionKey}`);
      console.log(`🔎 FIND - Queries:`, queries);
      console.log(`🔎 FIND - Limit: ${limit}`);
      
      const collectionId = this.getCollectionId(collectionKey);
      
      console.log(`🔎 FIND - Calling Appwrite listDocuments...`);
      const result = await this.db.listDocuments(
        this.dbId,
        collectionId,
        queries,
        limit
      );
      
      console.log(`✅ FIND - Found ${result.documents.length} documents in ${collectionKey}`);
      return result.documents;
    } catch (error) {
      console.error(`❌ FIND ERROR - Failed to find documents in ${collectionKey}:`, error.message);
      throw error;
    }
  }

  // Count documents by queries
  async count(collectionKey, queries = []) {
    try {
      console.log(`🔢 COUNT - Counting documents in ${collectionKey}`);
      console.log(`🔢 COUNT - Queries:`, queries);
      
      const collectionId = this.getCollectionId(collectionKey);
      
      console.log(`🔢 COUNT - Calling Appwrite listDocuments with limit 1...`);
      const result = await this.db.listDocuments(
        this.dbId,
        collectionId,
        queries,
        1
      );
      
      console.log(`✅ COUNT - Total documents in ${collectionKey}: ${result.total}`);
      return result.total;
    } catch (error) {
      console.error(`❌ COUNT ERROR - Failed to count documents in ${collectionKey}:`, error.message);
      throw error;
    }
  }
}

// Create database instance
console.log('🚀 Initializing Database instance...');
const database = new Database();

// Legacy compatibility
console.log('🔧 Setting up legacy db interface...');
const legacyDb = {};
Object.keys(constants.TABLES).forEach((key) => {
  console.log(`🔧 Setting up legacy interface for ${key}`);
  legacyDb[key] = {
    list: (queries = [], limit = 100, offset = 0) => {
      console.log(`🔧 LEGACY - ${key}.list() called`);
      return database.list(key, queries, limit, offset);
    },
    
    get: (documentId) => {
      console.log(`🔧 LEGACY - ${key}.get() called for ID: ${documentId}`);
      return database.get(key, documentId);
    },
    
    create: (data) => {
      console.log(`🔧 LEGACY - ${key}.create() called`);
      console.log(`🔧 LEGACY - Data:`, data);
      return database.create(key, data);
    },
    
    update: (documentId, data) => {
      console.log(`🔧 LEGACY - ${key}.update() called for ID: ${documentId}`);
      return database.update(key, documentId, data);
    },
    
    delete: (documentId) => {
      console.log(`🔧 LEGACY - ${key}.delete() called for ID: ${documentId}`);
      return database.delete(key, documentId);
    },
    
    findOne: (queries = []) => {
      console.log(`🔧 LEGACY - ${key}.findOne() called`);
      return database.findOne(key, queries);
    }
  };
});

console.log('✅ Database setup complete');
export default legacyDb;
export { database as Database, Query };