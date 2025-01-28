declare module 'electron-store' {
  interface ElectronStoreOptions<T> {
    defaults?: Partial<T>;
    name?: string;
    cwd?: string;
    fileExtension?: string;
    clearInvalidConfig?: boolean;
    accessPropertiesByDotNotation?: boolean;
    watch?: boolean;
    encryptionKey?: string | Buffer;
    serialize?: (value: any) => string;
    deserialize?: (text: string) => any;
  }

  class ElectronStore<T> {
    constructor(options?: ElectronStoreOptions<T>);
    get<K extends keyof T>(key: K): T[K];
    get(key: string): any;
    set<K extends keyof T>(key: K, value: T[K]): void;
    set(key: string, value: any): void;
    has(key: string): boolean;
    delete(key: string): void;
    clear(): void;
  }

  export default ElectronStore;
}
