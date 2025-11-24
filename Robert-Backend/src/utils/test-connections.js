// src/utils/test-connection.js
import { Client, Databases, Query } from 'node-appwrite';

// Create client
const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('690ca284001cca2edff9') // Your project ID
  .setKey(process.env.APPWRITE_API_KEY); // Make sure this is set

async function testConnection() {
  console.log('🚀 Starting Appwrite Connection Test...\n');
  
  try {
    // Test 1: Basic fetch to Appwrite
    console.log('1. Testing basic network connectivity...');
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://cloud.appwrite.io/v1', {
      method: 'GET',
      timeout: 10000
    });
    console.log('✅ Basic connection successful - Status:', response.status, '\n');

    // Test 2: Appwrite client initialization
    console.log('2. Testing Appwrite client...');
    const databases = new Databases(client);
    console.log('✅ Appwrite client initialized\n');

    // Test 3: List databases
    console.log('3. Testing database access...');
    const dbList = await databases.list();
    console.log('✅ Database access successful');
    console.log('   Available databases:', dbList.databases.length, '\n');

    // Test 4: List collections in your database
    console.log('4. Testing collection access...');
    const collections = await databases.listCollections('690ca284001cca2edff9');
    console.log('✅ Collection access successful');
    console.log('   Available collections:', collections.collections.length);
    collections.collections.forEach(col => {
      console.log('   -', col.name, `(${col.$id})`);
    });
    console.log('');

    // Test 5: Try to list customers (if collection exists)
    console.log('5. Testing customer collection...');
    try {
      const customers = await databases.listDocuments(
        '690ca284001cca2edff9',
        'customers',
        [],
        1
      );
      console.log('✅ Customer collection accessible');
      console.log('   Total customers:', customers.total, '\n');
    } catch (error) {
      console.log('⚠️  Customer collection test failed (might not exist yet):', error.message, '\n');
    }

    console.log('🎉 All tests passed! Your connection to Appwrite is working correctly.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('\n🔧 Troubleshooting tips:');
    
    if (error.message.includes('fetch failed') || error.message.includes('Network')) {
      console.log('   • Check your internet connection');
      console.log('   • Try switching to a different network (mobile hotspot)');
      console.log('   • Check if firewall/antivirus is blocking the connection');
    } else if (error.message.includes('API key')) {
      console.log('   • Check your APPWRITE_API_KEY environment variable');
      console.log('   • Make sure the API key has proper permissions');
    } else if (error.message.includes('Project')) {
      console.log('   • Check your project ID is correct');
    }
    
    console.log('\n📋 Error details:', error);
  }
}

// Check if environment variables are set
console.log('🔍 Checking environment variables...');
console.log('   APPWRITE_PROJECT_ID:', process.env.APPWRITE_PROJECT_ID ? 'Set' : 'Missing');
console.log('   APPWRITE_API_KEY:', process.env.APPWRITE_API_KEY ? `Set (first 5 chars: ${process.env.APPWRITE_API_KEY.substring(0,5)}...)` : 'Missing');
console.log('');

// Run the test
testConnection();