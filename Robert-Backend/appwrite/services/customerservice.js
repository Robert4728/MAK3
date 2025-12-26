import { databases, ID, Query, DATABASE_ID, CUSTOMERS_COLLECTION_ID } from '../config.js';

export class CustomerService {
    static async createCustomer(customerData) {
        return await databases.createDocument(
            DATABASE_ID,
            CUSTOMERS_COLLECTION_ID,
            ID.unique(),
            {
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone || '',
                delivery_address: customerData.delivery_address
            }
        );
    }

    static async getCustomer(customerId) {
        return await databases.getDocument(DATABASE_ID, CUSTOMERS_COLLECTION_ID, customerId);
    }

    static async findCustomerByEmail(email) {
        return await databases.listDocuments(
            DATABASE_ID,
            CUSTOMERS_COLLECTION_ID,
            [Query.equal('email', email)]
        );
    }

    static async updateCustomer(customerId, updateData) {
        return await databases.updateDocument(
            DATABASE_ID,
            CUSTOMERS_COLLECTION_ID,
            customerId,
            updateData
        );
    }

    static async searchCustomers(searchTerm) {
        return await databases.listDocuments(
            DATABASE_ID,
            CUSTOMERS_COLLECTION_ID,
            [Query.search('name', searchTerm)]
        );
    }
}