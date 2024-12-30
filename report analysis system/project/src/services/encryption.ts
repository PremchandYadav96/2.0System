import * as openpgp from 'openpgp';

export const generateKeys = async () => {
  const { privateKey, publicKey } = await openpgp.generateKey({
    type: 'rsa',
    rsaBits: 4096,
    userIDs: [{ name: 'Medical Report Analyzer User' }],
  });
  return { privateKey, publicKey };
};

export const encryptData = async (data: string, publicKey: string) => {
  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: data }),
    encryptionKeys: await openpgp.readKey({ armoredKey: publicKey }),
  });
  return encrypted;
};

export const decryptData = async (encryptedData: string, privateKey: string) => {
  const message = await openpgp.readMessage({ armoredMessage: encryptedData });
  const decrypted = await openpgp.decrypt({
    message,
    decryptionKeys: await openpgp.readKey({ armoredKey: privateKey }),
  });
  return decrypted.data;
};