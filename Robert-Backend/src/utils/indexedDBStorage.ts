export interface PrintOptions {
  material: string;
  color: string;
  scale: number;
  quantity: number;
  infill: number;
  quality: string;
  shipping: string;
  price: number;
}

export interface StoredFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  data: ArrayBuffer;
  blobUrl: string;
  printOptions: PrintOptions;
  session_id: string;
  status: 'local' | 'uploaded' | 'failed';
  created_at: string;
  expires_at: string;
}

export const storeFileInIndexedDB = (
  file: File, 
  printOptions: PrintOptions,
  sessionId?: string
): Promise<{id: string, url: string}> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('STL_Files_DB', 2);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('stl_files')) {
        const store = db.createObjectStore('stl_files', { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
        store.createIndex('expires_at', 'expires_at', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('session_id', 'session_id', { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['stl_files'], 'readwrite');
      const store = transaction.objectStore('stl_files');
      
      const reader = new FileReader();
      
      reader.onload = () => {
        const fileId = `stl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const arrayBuffer = reader.result as ArrayBuffer;
        const blob = new Blob([arrayBuffer], { type: file.type });
        const blobUrl = URL.createObjectURL(blob);
        
        const fileData: StoredFile = {
          id: fileId,
          name: file.name,
          originalName: file.name,
          size: file.size,
          type: file.type,
          data: arrayBuffer,
          blobUrl: blobUrl,
          printOptions: printOptions,
          session_id: sessionId || `session_${Date.now()}`,
          status: 'local',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        store.add(fileData);
        
        transaction.oncomplete = () => {
          resolve({ id: fileId, url: blobUrl });
        };
        
        transaction.onerror = () => {
          reject(transaction.error);
        };
      };
      
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    };
    
    request.onerror = () => reject(request.error);
  });
};

export const getFileFromIndexedDB = (fileId: string): Promise<{file: File, metadata: StoredFile}> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('STL_Files_DB', 2);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['stl_files'], 'readonly');
      const store = transaction.objectStore('stl_files');
      const getRequest = store.get(fileId);
      
      getRequest.onsuccess = () => {
        const fileData = getRequest.result as StoredFile;
        if (!fileData) {
          reject(new Error('File not found'));
          return;
        }
        
        const blob = new Blob([fileData.data], { type: fileData.type });
        const file = new File([blob], fileData.name, { 
          type: fileData.type,
          lastModified: Date.now()
        });
        
        resolve({
          file,
          metadata: fileData
        });
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
};

export const updateFileStatus = (fileId: string, status: StoredFile['status'], appwriteId?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('STL_Files_DB', 2);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['stl_files'], 'readwrite');
      const store = transaction.objectStore('stl_files');
      const getRequest = store.get(fileId);
      
      getRequest.onsuccess = () => {
        const fileData = getRequest.result as StoredFile;
        if (!fileData) {
          reject(new Error('File not found'));
          return;
        }
        
        fileData.status = status;
        if (appwriteId) {
          (fileData as any).appwrite_file_id = appwriteId;
        }
        
        const updateRequest = store.put(fileData);
        
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
};

export const cleanupExpiredFiles = async (): Promise<number> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('STL_Files_DB', 2);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['stl_files'], 'readwrite');
      const store = transaction.objectStore('stl_files');
      const expiresAtIndex = store.index('expires_at');
      
      const now = new Date().toISOString();
      const range = IDBKeyRange.upperBound(now);
      const cursorRequest = expiresAtIndex.openCursor(range);
      
      let deletedCount = 0;
      
      cursorRequest.onsuccess = (cursorEvent) => {
        const cursor = (cursorEvent.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const fileData = cursor.value as StoredFile;
          
          // Only delete local files (not uploaded)
          if (fileData.status === 'local') {
            // Release blob URL
            if (fileData.blobUrl) {
              URL.revokeObjectURL(fileData.blobUrl);
            }
            
            cursor.delete();
            deletedCount++;
          }
          
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      
      cursorRequest.onerror = () => reject(cursorRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
};