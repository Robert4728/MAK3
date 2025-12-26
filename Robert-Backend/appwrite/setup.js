// setup.js - UPDATED FOR node-appwrite v20.3.0 (Tables API)
import { databases, ID, DATABASE_ID } from './config.js';

export class DatabaseSetup {
    static async initializeDatabase() {
        console.log('🚀 Initializing Appwrite Database for 3D Printing Service...');
        
        try {
            // Create tables in correct order
            await this.createCustomersTable();
            await this.createSTLSTable();
            await this.createOrdersTable();
            
            console.log('✅ Database setup completed successfully!');
            return { success: true, message: 'Database setup completed' };
        } catch (error) {
            console.error('❌ Database setup failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async createCustomersTable() {
        console.log('🔧 Creating CUSTOMERS table...');
        
        try {
            // Check if table exists - USING listTables
            const response = await databases.listTables(DATABASE_ID);
            const tables = response.tables || [];
            const existing = tables.find(t => t.name === 'CUSTOMERS');
            
            if (existing) {
                console.log('✅ CUSTOMERS table already exists');
                return { exists: true };
            }
            
            // Create CUSTOMERS table - USING createTable
            const table = await databases.createTable(
                DATABASE_ID,
                'customers', // tableId (lowercase, no spaces)
                'CUSTOMERS'  // name (display name)
            );
            
            console.log(`✅ Created CUSTOMERS table: ${table.$id}`);
            
            // Wait for table to be ready
            await this.delay(2000);
            
            // Add attributes (columns)
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'first_name',
                255,
                true
            );
            
            await this.delay(500);
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'last_name',
                255,
                true
            );
            
            await this.delay(500);
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'email',
                255,
                true
            );
            
            await this.delay(500);
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'phone',
                20,
                false
            );
            
            await this.delay(500);
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'delivery_address',
                255,
                true
            );
            
            // Add indexes for better query performance
            await this.delay(1000);
            try {
                await databases.createIndex(
                    DATABASE_ID,
                    table.$id,
                    'email_index',
                    'key',
                    ['email'],
                    ['ASC']
                );
                console.log('✅ Created email index for CUSTOMERS');
            } catch (indexError) {
                console.log('⚠️ Email index may already exist:', indexError.message);
            }
            
            console.log('✅ CUSTOMERS table setup complete');
            return { created: true, tableId: table.$id };
            
        } catch (error) {
            console.error('❌ Failed to create CUSTOMERS table:', error);
            throw error;
        }
    }
    
    static async createSTLSTable() {
        console.log('🔧 Creating STLS table...');
        
        try {
            const response = await databases.listTables(DATABASE_ID);
            const tables = response.tables || [];
            const existing = tables.find(t => t.name === 'STLS');
            
            if (existing) {
                console.log('✅ STLS table already exists');
                return { exists: true };
            }
            
            const table = await databases.createTable(
                DATABASE_ID,
                'stls',
                'STLS'
            );
            
            console.log(`✅ Created STLS table: ${table.$id}`);
            
            await this.delay(2000);
            
            // Add attributes
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'stl_file',
                500,
                true
            );
            
            await this.delay(500);
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'material',
                50,
                true
            );
            
            await this.delay(500);
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'colour',
                50,
                true
            );
            
            await this.delay(500);
            await databases.createFloatAttribute(
                DATABASE_ID,
                table.$id,
                'scale',
                true,
                null,
                null,
                null,
                false  // not required for testing
            );
            
            await this.delay(500);
            await databases.createIntegerAttribute(
                DATABASE_ID,
                table.$id,
                'cost',
                true,
                null,
                null,
                null,
                false
            );
            
            await this.delay(500);
            await databases.createFloatAttribute(
                DATABASE_ID,
                table.$id,
                'weight',
                false,
                null,
                null,
                null,
                false
            );
            
            // Add indexes
            await this.delay(1000);
            try {
                await databases.createIndex(
                    DATABASE_ID,
                    table.$id,
                    'material_index',
                    'key',
                    ['material'],
                    ['ASC']
                );
                console.log('✅ Created material index for STLS');
            } catch (indexError) {
                console.log('⚠️ Material index may already exist:', indexError.message);
            }
            
            console.log('✅ STLS table setup complete');
            return { created: true, tableId: table.$id };
            
        } catch (error) {
            console.error('❌ Failed to create STLS table:', error);
            throw error;
        }
    }
    
    static async createOrdersTable() {
        console.log('🔧 Creating ORDERS table...');
        
        try {
            const response = await databases.listTables(DATABASE_ID);
            const tables = response.tables || [];
            const existing = tables.find(t => t.name === 'ORDERS');
            
            if (existing) {
                console.log('✅ ORDERS table already exists');
                return { exists: true };
            }
            
            const table = await databases.createTable(
                DATABASE_ID,
                'orders',
                'ORDERS'
            );
            
            console.log(`✅ Created ORDERS table: ${table.$id}`);
            
            await this.delay(2000);
            
            // Add attributes
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'customer_id',
                36,
                true
            );
            
            await this.delay(500);
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'first_name',
                255,
                true
            );
            
            await this.delay(500);
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'last_name',
                255,
                true
            );
            
            await this.delay(500);
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'stl_id',
                36,
                true
            );
            
            await this.delay(500);
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'stl_file',
                500,
                true
            );
            
            await this.delay(500);
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'status',
                50,
                true
            );
            
            await this.delay(500);
            await databases.createDatetimeAttribute(
                DATABASE_ID,
                table.$id,
                'time_of_placement',
                true
            );
            
            await this.delay(500);
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'drop_off_location',
                255,
                true
            );
            
            await this.delay(500);
            await databases.createStringAttribute(
                DATABASE_ID,
                table.$id,
                'delivery_type',
                50,
                true
            );
            
            await this.delay(500);
            await databases.createFloatAttribute(
                DATABASE_ID,
                table.$id,
                'price',
                true,
                null,
                null,
                null,
                false
            );
            
            // Add indexes
            await this.delay(1000);
            try {
                await databases.createIndex(
                    DATABASE_ID,
                    table.$id,
                    'customer_id_index',
                    'key',
                    ['customer_id'],
                    ['ASC']
                );
                
                await databases.createIndex(
                    DATABASE_ID,
                    table.$id,
                    'status_index',
                    'key',
                    ['status'],
                    ['ASC']
                );
                
                console.log('✅ Created indexes for ORDERS table');
            } catch (indexError) {
                console.log('⚠️ Indexes may already exist:', indexError.message);
            }
            
            console.log('✅ ORDERS table setup complete');
            return { created: true, tableId: table.$id };
            
        } catch (error) {
            console.error('❌ Failed to create ORDERS table:', error);
            throw error;
        }
    }
    
    static async verifySetup() {
        console.log('🔍 Verifying database setup...');
        
        try {
            const response = await databases.listTables(DATABASE_ID);
            const tables = response.tables || [];
            const expectedTables = ['CUSTOMERS', 'ORDERS', 'STLS'];
            
            console.log('📁 Available tables:');
            tables.forEach(table => {
                console.log(`  - ${table.name} (${table.$id})`);
            });
            
            let allGood = true;
            for (const expected of expectedTables) {
                const exists = tables.some(t => t.name === expected);
                if (!exists) {
                    console.log(`❌ Missing table: ${expected}`);
                    allGood = false;
                } else {
                    console.log(`✅ Found table: ${expected}`);
                }
            }
            
            // Check attributes for each table
            if (allGood) {
                for (const table of tables) {
                    if (expectedTables.includes(table.name)) {
                        try {
                            const attributes = await databases.listAttributes(DATABASE_ID, table.$id);
                            console.log(`  Attributes for ${table.name}: ${attributes.total} attributes found`);
                        } catch (attrError) {
                            console.log(`  ⚠️ Could not fetch attributes for ${table.name}:`, attrError.message);
                        }
                    }
                }
            }
            
            return {
                success: allGood,
                tables: tables.map(t => ({ id: t.$id, name: t.name })),
                message: allGood ? 'All tables verified' : 'Some tables missing'
            };
        } catch (error) {
            console.error('❌ Database verification failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    static async cleanupDatabase() {
        console.log('🧹 Cleaning up database...');
        
        try {
            const response = await databases.listTables(DATABASE_ID);
            const tables = response.tables || [];
            
            for (const table of tables) {
                try {
                    await databases.deleteTable(DATABASE_ID, table.$id);
                    console.log(`🗑️ Deleted table: ${table.name}`);
                    await this.delay(500);
                } catch (error) {
                    console.log(`⚠️ Could not delete table ${table.name}:`, error.message);
                }
            }
            
            console.log('✅ Database cleanup completed');
            return { success: true };
        } catch (error) {
            console.error('❌ Database cleanup failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    static async seedSampleData() {
        console.log('🌱 Seeding sample data...');
        
        try {
            const response = await databases.listTables(DATABASE_ID);
            const tables = response.tables || [];
            
            const customersTable = tables.find(t => t.name === 'CUSTOMERS');
            const stlsTable = tables.find(t => t.name === 'STLS');
            const ordersTable = tables.find(t => t.name === 'ORDERS');
            
            if (customersTable) {
                // Seed sample customer
                try {
                    await databases.createRow(DATABASE_ID, customersTable.$id, ID.unique(), {
                        first_name: 'John',
                        last_name: 'Doe',
                        email: 'john@example.com',
                        phone: '+1234567890',
                        delivery_address: '123 Main St, City, Country'
                    });
                    console.log('✅ Seeded sample customer');
                } catch (error) {
                    console.log('⚠️ Could not seed customer:', error.message);
                }
            }
            
            if (stlsTable) {
                // Seed sample STL
                try {
                    await databases.createRow(DATABASE_ID, stlsTable.$id, ID.unique(), {
                        stl_file: 'https://example.com/models/sample.stl',
                        material: 'PLA',
                        colour: 'White',
                        scale: 1.0,
                        cost: 25,
                        weight: 150.5
                    });
                    console.log('✅ Seeded sample STL');
                } catch (error) {
                    console.log('⚠️ Could not seed STL:', error.message);
                }
            }
            
            console.log('✅ Sample data seeding completed');
            return { success: true };
        } catch (error) {
            console.error('❌ Sample data seeding failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Updated initialization function
export const initializeAppwriteDatabase = async () => {
    try {
        console.log('🔧 Starting database initialization...');
        console.log('📊 Database ID:', DATABASE_ID);
        
        // First, verify if database exists
        try {
            const dbInfo = await databases.get(DATABASE_ID);
            console.log('✅ Database exists:', dbInfo.name);
        } catch (error) {
            if (error.code === 404 || error.type === 'database_not_found') {
                console.log('❌ Database not found. Please create it in Appwrite Console first.');
                console.log('\n📋 Steps to create database:');
                console.log('1. Go to Appwrite Console → Databases');
                console.log('2. Click "Create Database"');
                console.log('3. Set Database ID in your .env file as APPWRITE_DATABASE_ID');
                console.log('4. Run this script again');
                return { 
                    success: false, 
                    error: 'Database not found. Create it in Appwrite Console first.' 
                };
            }
            throw error;
        }
        
        // Then run setup
        const result = await DatabaseSetup.initializeDatabase();
        
        if (result.success) {
            console.log('\n🎉 Database initialization complete!');
            console.log('\n📋 Available commands:');
            console.log('• DatabaseSetup.verifySetup() - Check if tables are properly set up');
            console.log('• DatabaseSetup.cleanupDatabase() - Delete all tables (clean slate)');
            console.log('• DatabaseSetup.seedSampleData() - Add sample data for testing');
        }
        
        return result;
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        console.error('Error details:', error);
        return { success: false, error: error.message };
    }
};

// Helper function to run setup from command line
if (process.argv[1] === new URL(import.meta.url).pathname) {
    console.log('🚀 Running database setup from command line...\n');
    initializeAppwriteDatabase()
        .then(result => {
            if (result.success) {
                console.log('\n✅ Setup completed successfully!');
                process.exit(0);
            } else {
                console.log('\n❌ Setup failed:', result.error);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Unexpected error:', error);
            process.exit(1);
        });
}

export default DatabaseSetup;