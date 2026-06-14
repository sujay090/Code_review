import crypto from "node:crypto";
const ALGORITHM = "aes-256-gcm";
let keyCache = null;
function getEncryptionKey() {
    if (keyCache)
        return keyCache;
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error("ENCRYPTION_KEY environment variable is missing.");
    }
    const buffer = Buffer.from(key, "hex");
    if (buffer.length !== 32) {
        throw new Error("ENCRYPTION_KEY must be a 32-byte hex string (64 hex characters).");
    }
    keyCache = buffer;
    return keyCache;
}
export function encrypt(text) {
    const iv = crypto.randomBytes(12); // 12 bytes is standard for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}
export function decrypt(encryptedData) {
    const parts = encryptedData.split(":");
    if (parts.length !== 3) {
        throw new Error("Invalid encrypted data format");
    }
    const ivHex = parts[0];
    const authTagHex = parts[1];
    const encryptedText = parts[2];
    if (!ivHex || !authTagHex || !encryptedText) {
        throw new Error("Invalid encrypted data format");
    }
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}
//# sourceMappingURL=encryption.js.map