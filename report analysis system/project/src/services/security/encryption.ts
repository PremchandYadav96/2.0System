import * as openpgp from 'openpgp';

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

interface EncryptedData {
  data: string;
  signature: string;
  timestamp: number;
}

export class SecurityManager {
  private static instance: SecurityManager;
  private keyPair: KeyPair | null = null;

  private constructor() {}

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.keyPair) return;

    try {
      // Try to load existing keys from secure storage
      const storedKeys = await this.loadKeysFromStorage();
      if (storedKeys) {
        this.keyPair = storedKeys;
        return;
      }

      // Generate new keys if none exist
      const { privateKey, publicKey } = await openpgp.generateKey({
        type: 'rsa',
        rsaBits: 4096,
        userIDs: [{ name: 'Medical Report Analyzer User' }],
        format: 'armored'
      });

      this.keyPair = {
        publicKey,
        privateKey
      };

      // Store keys securely
      await this.storeKeysSecurely(this.keyPair);
    } catch (error) {
      console.error('Failed to initialize security manager:', error);
      throw error;
    }
  }

  private async loadKeysFromStorage(): Promise<KeyPair | null> {
    try {
      const storedPublicKey = localStorage.getItem('medical_analyzer_public_key');
      const storedPrivateKey = localStorage.getItem('medical_analyzer_private_key');

      if (!storedPublicKey || !storedPrivateKey) {
        return null;
      }

      // Verify key integrity
      try {
        await openpgp.readKey({ armoredKey: storedPublicKey });
        await openpgp.readPrivateKey({ armoredKey: storedPrivateKey });
      } catch {
        return null;
      }

      return {
        publicKey: storedPublicKey,
        privateKey: storedPrivateKey
      };
    } catch {
      return null;
    }
  }

  private async storeKeysSecurely(keyPair: KeyPair): Promise<void> {
    try {
      localStorage.setItem('medical_analyzer_public_key', keyPair.publicKey);
      localStorage.setItem('medical_analyzer_private_key', keyPair.privateKey);
    } catch (error) {
      console.error('Failed to store keys:', error);
      throw error;
    }
  }

  async encryptData(data: string): Promise<EncryptedData> {
    if (!this.keyPair) {
      await this.initialize();
    }

    try {
      const message = await openpgp.createMessage({ text: data });
      const publicKey = await openpgp.readKey({ armoredKey: this.keyPair!.publicKey });
      const privateKey = await openpgp.readPrivateKey({ armoredKey: this.keyPair!.privateKey });

      // Encrypt the data
      const encrypted = await openpgp.encrypt({
        message,
        encryptionKeys: publicKey,
        signingKeys: privateKey
      });

      // Create a detached signature
      const signature = await openpgp.sign({
        message: await openpgp.createMessage({ text: encrypted }),
        signingKeys: privateKey,
        detached: true
      });

      return {
        data: encrypted,
        signature,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  async decryptData(encryptedData: EncryptedData): Promise<string> {
    if (!this.keyPair) {
      await this.initialize();
    }

    try {
      const message = await openpgp.readMessage({ armoredMessage: encryptedData.data });
      const publicKey = await openpgp.readKey({ armoredKey: this.keyPair!.publicKey });
      const privateKey = await openpgp.readPrivateKey({ armoredKey: this.keyPair!.privateKey });

      // Verify signature
      const verificationResult = await openpgp.verify({
        message: await openpgp.createMessage({ text: encryptedData.data }),
        signature: await openpgp.readSignature({ armoredSignature: encryptedData.signature }),
        verificationKeys: publicKey
      });

      if (!verificationResult.signatures[0].verified) {
        throw new Error('Signature verification failed');
      }

      // Decrypt the data
      const decrypted = await openpgp.decrypt({
        message,
        decryptionKeys: privateKey,
        verificationKeys: publicKey
      });

      return decrypted.data as string;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    this.keyPair = null;
  }
}