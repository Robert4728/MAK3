import { Client, Account, Databases, Storage, ID, Query } from 'appwrite.js';

// Safe environment variable access with fallbacks
const getEnvVar = (key, defaultValue = '') => {
  // Check for Vite environment variables
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  // Check for Node.js environment variables (if applicable)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return defaultValue;
};

// Initialize SDK with safe defaults
const client = new Client()
    .setEndpoint(getEnvVar('VITE_APPWRITE_ENDPOINT', 'https://cloud.appwrite.io/v1'))
    .setProject(getEnvVar('VITE_APPWRITE_PROJECT_ID', 'default-project-id'));

// Export services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export { ID, Query };

// Safe database and bucket constants
export const DATABASE_ID = getEnvVar('VITE_APPWRITE_DATABASE_ID', 'main');
export const STORAGE_BUCKET_ID = getEnvVar('VITE_APPWRITE_STORAGE_BUCKET_ID', 'stl_files_bucket');
export const CUSTOMERS_COLLECTION_ID = getEnvVar('VITE_APPWRITE_CUSTOMERS_COLLECTION_ID', 'customers');
export const ORDERS_COLLECTION_ID = getEnvVar('VITE_APPWRITE_ORDERS_COLLECTION_ID', 'orders');
export const STL_FILES_COLLECTION_ID = getEnvVar('VITE_APPWRITE_STL_FILES_COLLECTION_ID', 'stl_files');

// Debug helper (remove in production)
if (getEnvVar('VITE_APPWRITE_DEBUG') === 'true') {
  console.log('Appwrite Config:', {
    endpoint: getEnvVar('VITE_APPWRITE_ENDPOINT'),
    projectId: getEnvVar('VITE_APPWRITE_PROJECT_ID'),
    databaseId: DATABASE_ID,
    storageBucketId: STORAGE_BUCKET_ID
  });
}