declare global {
    // entrypoint for Crestron's JSInterface. May or may not actually exist.
    var JSInterface: Object | undefined;
}

 /**
 * LocalStorage polyfill backed by IndexedDB with sessionStorage as the only cache
 * 
 * This polyfill provides a localStorage-compatible API that stores data in IndexedDB.
 * It uses sessionStorage as the only cache for synchronous operations.
 * All changes are synchronized back to IndexedDB for persistence.
 */
export class IndexedDBLocalStorage implements Storage {
  private readonly STORE_NAME: string;
  private readonly CACHE_KEY: string;
  
  private db: IDBDatabase | null = null;
  private initialized: boolean = false;
  private pendingOperations: Array<() => Promise<void>> = [];
  private processingOperations: boolean = false;
  private externalDb: boolean = false;

  /**
   * Create a new IndexedDBLocalStorage using either a database name or an existing database
   * @param dbNameOrInstance Database name or IDBDatabase instance
   * @param storeName Name of the object store to use (defaults to 'localStorageShim')
   */
  constructor(dbNameOrInstance: string | IDBDatabase, storeName: string) {
    this.STORE_NAME = storeName;
    
    // Determine if we're using an existing database or creating a new one
    if (dbNameOrInstance instanceof IDBDatabase) {
      this.db = dbNameOrInstance;
      this.externalDb = true;
      
      // Verify the store exists in the database
      if (!this.db.objectStoreNames.contains(this.STORE_NAME)) {
        throw new Error(`The object store "${this.STORE_NAME}" does not exist in the provided database.`);
      }
      
      // Create a unique cache key based on the database and store names
      this.CACHE_KEY = `__indexedDBLocalStorageCache_${this.db.name}_${this.STORE_NAME}`;
    } else {
      this.externalDb = false;
      
      // Create a unique cache key based on the database and store names
      this.CACHE_KEY = `__indexedDBLocalStorageCache_${dbNameOrInstance}_${this.STORE_NAME}`;
      
      // Initialize the database (background)
      this.initializeDatabase(dbNameOrInstance);
    }
  }

  /**
   * Initialize the IndexedDB database in the background
   */
  private initializeDatabase(dbName: string): void {
    // Start the async initialization process
    (async () => {
      try {
        if (!window.indexedDB) {
          throw new Error('IndexedDB is not supported in this browser');
        }

        // Open IndexedDB
        const openRequest = indexedDB.open(dbName);

        openRequest.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.STORE_NAME)) {
            db.createObjectStore(this.STORE_NAME);
          }
        };

        this.db = await new Promise<IDBDatabase>((resolve, reject) => {
          openRequest.onsuccess = () => resolve(openRequest.result);
          openRequest.onerror = () => reject(openRequest.error);
        });

        // Load all data from IndexedDB into sessionStorage
        await this.syncFromIndexedDB();
        
        // Mark as initialized and process any operations that were queued
        this.initialized = true;
        this.processOperationQueue();
      } catch (error) {
        console.error('Failed to initialize IndexedDB localStorage polyfill:', error);
        // Even if initialization fails, we still mark as initialized to prevent blocking
        this.initialized = true;
        this.processOperationQueue();
      }
    })().catch(err => {
      console.error('Unexpected error during initialization:', err);
    });
  }

  /**
   * Add an operation to the queue and process it
   */
  private queueOperation(operation: () => Promise<void>): void {
    this.pendingOperations.push(operation);
    
    // If we're already initialized, start processing the queue
    if (this.initialized) {
      this.processOperationQueue();
    }
    // If not initialized, the queue will be processed after initialization completes
  }

  /**
   * Process the operation queue
   */
  private async processOperationQueue(): Promise<void> {
    // Don't start processing if we're already processing or not initialized
    if (this.processingOperations || !this.initialized) {
      return;
    }

    this.processingOperations = true;
    
    try {
      while (this.pendingOperations.length > 0) {
        const operation = this.pendingOperations.shift();
        if (operation) {
          await operation().catch(err => {
            console.error('Error in queued operation:', err);
          });
        }
      }
    } catch (error) {
      console.error('Error processing IndexedDB operations:', error);
    } finally {
      this.processingOperations = false;
      
      // Check if new operations were added while we were processing
      if (this.pendingOperations.length > 0) {
        this.processOperationQueue();
      }
    }
  }

  /**
   * Get the cache from sessionStorage
   */
  private getCache(): Record<string, string> {
    try {
      if (window.sessionStorage) {
        const cachedData = sessionStorage.getItem(this.CACHE_KEY);
        if (cachedData) {
          try {
            const data = JSON.parse(cachedData);
            if (data && typeof data === 'object') {
              return data;
            }
          } catch (e) {
            console.error('Failed to parse cached localStorage data', e);
          }
        }
      }
    } catch (e) {
      console.error('Error accessing sessionStorage', e);
    }
    return {};
  }

  /**
   * Update the cache in sessionStorage
   */
  private setCache(cache: Record<string, string>): void {
    try {
      if (window.sessionStorage) {
        sessionStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      }
    } catch (e) {
      console.error('Error updating sessionStorage cache', e);
    }
  }

  /**
   * Sync all data from IndexedDB to sessionStorage
   * This is internal and only used during initialization
   */
  private async syncFromIndexedDB(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      
      // Get all keys
      const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
        const request = store.getAllKeys();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      // Get all values
      const values = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      // Build the cache
      const cache: Record<string, string> = this.getCache(); // Start with existing cache
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i].toString();
        const value = values[i]?.toString() || '';
        cache[key] = value;
      }
      
      // Update sessionStorage
      this.setCache(cache);
    } catch (error) {
      console.error('Error syncing from IndexedDB to sessionStorage', error);
    }
  }

  /**
   * Store a value in IndexedDB
   * This doesn't need to be awaited because we update the cache first
   */
  private storeInDB(key: string, value: string): void {
    if (!this.db) {
      // Queue the operation for when the DB is ready
      this.queueOperation(async () => {
        if (this.db) {
          await this.storeValueInDB(key, value);
        }
      });
      return;
    }

    // If DB is already available, queue the operation directly
    this.queueOperation(async () => {
      await this.storeValueInDB(key, value);
    });
  }

  /**
   * Actual implementation of storing a value in IndexedDB
   */
  private async storeValueInDB(key: string, value: string): Promise<void> {
    if (!this.db) return;

    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.put(value, key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Remove a value from IndexedDB
   * This doesn't need to be awaited because we update the cache first
   */
  private removeFromDB(key: string): void {
    if (!this.db) {
      // Queue the operation for when the DB is ready
      this.queueOperation(async () => {
        if (this.db) {
          await this.removeValueFromDB(key);
        }
      });
      return;
    }

    // If DB is already available, queue the operation directly
    this.queueOperation(async () => {
      await this.removeValueFromDB(key);
    });
  }

  /**
   * Actual implementation of removing a value from IndexedDB
   */
  private async removeValueFromDB(key: string): Promise<void> {
    if (!this.db) return;

    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.delete(key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clear all values from IndexedDB
   * This doesn't need to be awaited because we update the cache first
   */
  private clearDB(): void {
    if (!this.db) {
      // Queue the operation for when the DB is ready
      this.queueOperation(async () => {
        if (this.db) {
          await this.clearAllFromDB();
        }
      });
      return;
    }

    // If DB is already available, queue the operation directly
    this.queueOperation(async () => {
      await this.clearAllFromDB();
    });
  }

  /**
   * Actual implementation of clearing all values from IndexedDB
   */
  private async clearAllFromDB(): Promise<void> {
    if (!this.db) return;

    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Flush pending operations and close the database
   * This should be called on page unload
   */
  public async flushAndClose(): Promise<void> {
    // Try to force process any pending operations
    if (this.pendingOperations.length > 0 && this.db) {
      try {
        // Process critical pending operations synchronously if possible
        for (const operation of this.pendingOperations) {
          try {
            await operation();
          } catch (e) {
            console.error('Error flushing operation during page unload', e);
          }
        }
      } catch (e) {
        console.error('Error flushing operations', e);
      }
    }
    
    // Close the database connection
    if (this.db && !this.externalDb) {
      this.db.close();
      this.db = null;
    }
  }

  // Storage interface implementation - FULLY Synchronous API

  /**
   * Get the number of items in storage
   */
  get length(): number {
    const cache = this.getCache();
    return Object.keys(cache).length;
  }

  /**
   * Get an item from storage by key
   */
  getItem(key: string): string | null {
    const cache = this.getCache();
    const stringKey = String(key);
    return stringKey in cache ? cache[stringKey] : null;
  }

  /**
   * Set an item in storage
   * This method is completely synchronous
   */
  setItem(key: string, value: string): void {
    const stringKey = String(key);
    const stringValue = String(value);
    
    // Update sessionStorage cache immediately
    const cache = this.getCache();
    cache[stringKey] = stringValue;
    this.setCache(cache);
    
    // Queue the background update to IndexedDB (fire and forget)
    this.storeInDB(stringKey, stringValue);
  }

  /**
   * Remove an item from storage
   * This method is completely synchronous
   */
  removeItem(key: string): void {
    const stringKey = String(key);
    
    // Update sessionStorage cache immediately
    const cache = this.getCache();
    if (stringKey in cache) {
      delete cache[stringKey];
      this.setCache(cache);
      
      // Queue the background update to IndexedDB (fire and forget)
      this.removeFromDB(stringKey);
    }
  }

  /**
   * Clear all items from storage
   * This method is completely synchronous
   */
  clear(): void {
    // Update sessionStorage cache immediately
    this.setCache({});
    
    // Queue the background update to IndexedDB (fire and forget)
    this.clearDB();
  }

  /**
   * Get the key at the specified index
   */
  key(index: number): string | null {
    if (index < 0) {
      return null;
    }
    
    const cache = this.getCache();
    const keys = Object.keys(cache);
    
    return index < keys.length ? keys[index] : null;
  }
}

/**
 * Create a localStorage-like interface
 * @param dbNameOrInstance Database name or IDBDatabase instance
 * @param storeName Name of the object store to use (defaults to 'localStorageShim')
 * @returns A Storage instance that behaves like localStorage
 */
export function createLocalStorage(
  dbNameOrInstance: string | IDBDatabase,
  storeName: string = 'localStorageShim'
): Storage {
  // Create the storage instance
  const storage = new IndexedDBLocalStorage(dbNameOrInstance, storeName);

  // Set up cleanup handler for page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      // Force processing of pending operations before closing
      storage.flushAndClose();
    });
  }
  
  // Create a proper localStorage interface with bound methods
  const localStorage: Storage = {
    // Bind methods to ensure correct 'this' context
    getItem: storage.getItem.bind(storage),
    setItem: storage.setItem.bind(storage),
    removeItem: storage.removeItem.bind(storage),
    clear: storage.clear.bind(storage),
    key: storage.key.bind(storage),
    
    // Use getter for 'length' property
    get length() {
      return storage.length;
    }
  };
  
  // Store a reference to the storage instance for potential use
  Object.defineProperty(localStorage, '__storage', {
    value: storage,
    enumerable: false,
    writable: false,
    configurable: false
  });
  
  // Create a proxy for direct property access and assignment
  return new Proxy(localStorage, {
    get(target, prop) {
      if (typeof prop === 'string') {
        // Handle standard methods and properties
        if (prop in target) {
          return target[prop as keyof typeof target];
        }
        
        // Handle direct property access (like storage.myKey)
        return storage.getItem(prop);
      }
      return Reflect.get(target, prop);
    },
    
    set(target, prop, value) {
      if (typeof prop === 'string' && !(prop in target)) {
        // Handle direct property assignment (like storage.myKey = 'value')
        storage.setItem(prop, value);
        return true;
      }
      return Reflect.set(target, prop, value);
    },
    
    deleteProperty(target, prop) {
      if (typeof prop === 'string' && !(prop in target)) {
        // Handle property deletion (like delete storage.myKey)
        storage.removeItem(prop);
        return true;
      }
      return Reflect.deleteProperty(target, prop);
    },
    
    // Support for 'in' operator
    has(target, prop) {
      if (typeof prop === 'string' && !(prop in target)) {
        return storage.getItem(prop) !== null;
      }
      return Reflect.has(target, prop);
    },
    
    // Support for Object.keys() and similar methods
    ownKeys() {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key !== null) {
          keys.push(key);
        }
      }
      // Add the standard Storage interface properties
      return [...keys, 'length', 'getItem', 'setItem', 'removeItem', 'clear', 'key'];
    },
    
    getOwnPropertyDescriptor(target, prop) {
      if (typeof prop === 'string') {
        if (prop in target) {
          return Reflect.getOwnPropertyDescriptor(target, prop);
        }
        
        const value = storage.getItem(prop);
        if (value !== null) {
          return {
            value,
            writable: true,
            enumerable: true,
            configurable: true
          };
        }
      }
      return undefined;
    }
  });
}

/**
 * Create and install the localStorage polyfill
 * @param dbNameOrInstance Database name or IDBDatabase instance
 * @param storeName Name of the object store to use (defaults to 'localStorageShim')
 */
export function installLocalStoragePolyfill(
  dbNameOrInstance: string | IDBDatabase,
  storeName: string = 'localStorageShim'
): void {
  if (window.localStorage) {
    console.warn("LocalStorage is already present in this environment!");
    return;
  }
  
  // Create the storage instance using createLocalStorage
  const localStorageProxy = createLocalStorage(dbNameOrInstance, storeName);
  
  // Define localStorage on the window object
  Object.defineProperty(window, 'localStorage', {
    value: localStorageProxy,
    writable: false,
    configurable: true
  });
}

if (typeof window !== 'undefined' && !window.localStorage && typeof (JSInterface) !== 'undefined') {
  installLocalStoragePolyfill('ch5_mqtt_bridge');
}