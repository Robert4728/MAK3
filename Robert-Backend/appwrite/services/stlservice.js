import { databases, storage, ID, Query, DATABASE_ID, STORAGE_BUCKET_ID, STL_FILES_COLLECTION_ID } from '../config.js';

export class STLService {
    static async uploadSTLFile(file, orderId, customerId, stlData) {
        // 1. Upload file to storage
        const uploadedFile = await storage.createFile(
            STORAGE_BUCKET_ID,
            ID.unique(),
            file
        );
        
        // 2. Create document in database
        return await databases.createDocument(
            DATABASE_ID,
            STL_FILES_COLLECTION_ID,
            ID.unique(),
            {
                order_id: orderId,
                customer_id: customerId,
                file_name: stlData.fileName || file.name,
                file_url: `https://cloud.appwrite.io/v1/storage/buckets/${STORAGE_BUCKET_ID}/files/${uploadedFile.$id}/view`,
                weight: stlData.weight || 0,
                material: stlData.material || 'PLA',
                color: stlData.color || 'Black',
                scale: stlData.scale || 1.0
            }
        );
    }

    static async getSTLFilesByOrder(orderId) {
        return await databases.listDocuments(
            DATABASE_ID,
            STL_FILES_COLLECTION_ID,
            [Query.equal('order_id', orderId)]
        );
    }

    static async getSTLFilesByCustomer(customerId) {
        return await databases.listDocuments(
            DATABASE_ID,
            STL_FILES_COLLECTION_ID,
            [Query.equal('customer_id', customerId)]
        );
    }

    static async deleteSTLFile(stlFileId) {
        const stlFile = await databases.getDocument(DATABASE_ID, STL_FILES_COLLECTION_ID, stlFileId);
        
        // Delete from database
        await databases.deleteDocument(DATABASE_ID, STL_FILES_COLLECTION_ID, stlFileId);
        
        // Extract file ID from URL and delete from storage
        const fileId = stlFile.file_url.split('/files/')[1]?.split('/view')[0];
        if (fileId) {
            await storage.deleteFile(STORAGE_BUCKET_ID, fileId);
        }
    }
}