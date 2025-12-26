import { databases, ID, Query, DATABASE_ID, ORDERS_COLLECTION_ID } from '../config.js';

export class OrderService {
    static async createOrder(orderData) {
        return await databases.createDocument(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            ID.unique(),
            {
                customer_id: orderData.customer_id,
                customer_name: orderData.customer_name,
                order_time: new Date().toISOString(),
                status: orderData.status || 'pending',
                dropoff_location: orderData.dropoff_location,
                delivery_type: orderData.delivery_type || 'standard',
                delivery_price: orderData.delivery_price || 0,
                part_price: orderData.part_price || 0,
                total_price: orderData.total_price || 0
            }
        );
    }

    static async getOrder(orderId) {
        return await databases.getDocument(DATABASE_ID, ORDERS_COLLECTION_ID, orderId);
    }

    static async getOrdersByCustomer(customerId) {
        return await databases.listDocuments(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            [Query.equal('customer_id', customerId)]
        );
    }

    static async updateOrderStatus(orderId, newStatus) {
        return await databases.updateDocument(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            orderId,
            { status: newStatus }
        );
    }

    static async getAllOrders(limit = 50) {
        return await databases.listDocuments(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            [
                Query.orderDesc('order_time'),
                Query.limit(limit)
            ]
        );
    }

    static async getOrdersByStatus(status) {
        return await databases.listDocuments(
            DATABASE_ID,
            ORDERS_COLLECTION_ID,
            [Query.equal('status', status)]
        );
    }
}