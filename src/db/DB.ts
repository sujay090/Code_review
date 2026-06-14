import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

import { encrypt, decrypt } from "../utils/encryption.js";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

type HealtCheckResponse = {
    message: string;
    database: string;
    error?: unknown;
};

interface IDbConnection {
    healthCheck(): Promise<HealtCheckResponse>;
}

class DbConnection implements IDbConnection {
    private static conn: ReturnType<typeof DbConnection.createPrismaClient>;

    private static createPrismaClient() {
        const baseClient = new PrismaClient({ adapter });

        // We extend the Prisma Client to automatically encrypt/decrypt tokens seamlessly.
        // This allows the rest of the application to interact with `accessToken` normally.
        return baseClient.$extends({
            // 1. The QUERY extension intercepts database WRITES before they happen
            query: {
                user: {
                    async $allOperations({ operation, args, query }) {
                        const anyArgs = args as any;

                        // Check if we are doing an operation that writes to the database
                        if (["create", "update", "upsert", "createMany"].includes(operation)) {

                            // Encrypt normal data payloads (used in create and update)
                            if (anyArgs.data?.accessToken && typeof anyArgs.data.accessToken === "string") {
                                anyArgs.data.accessToken = encrypt(anyArgs.data.accessToken);
                            }
                            if (anyArgs.data?.refreshToken && typeof anyArgs.data.refreshToken === "string") {
                                anyArgs.data.refreshToken = encrypt(anyArgs.data.refreshToken);
                            }

                            // Encrypt specific upsert payloads (which are nested)
                            if (operation === "upsert" && anyArgs.create) {
                                if (anyArgs.create.accessToken && typeof anyArgs.create.accessToken === "string") {
                                    anyArgs.create.accessToken = encrypt(anyArgs.create.accessToken);
                                }
                                if (anyArgs.create.refreshToken && typeof anyArgs.create.refreshToken === "string") {
                                    anyArgs.create.refreshToken = encrypt(anyArgs.create.refreshToken);
                                }
                            }
                            if (operation === "upsert" && anyArgs.update) {
                                if (anyArgs.update.accessToken && typeof anyArgs.update.accessToken === "string") {
                                    anyArgs.update.accessToken = encrypt(anyArgs.update.accessToken);
                                }
                                if (anyArgs.update.refreshToken && typeof anyArgs.update.refreshToken === "string") {
                                    anyArgs.update.refreshToken = encrypt(anyArgs.update.refreshToken);
                                }
                            }
                        }

                        // Execute the actual database query with the modified (encrypted) arguments
                        return query(args);
                    },
                },
            },

            // 2. The RESULT extension intercepts database READS after they return
            result: {
                user: {
                    // Tell Prisma to automatically compute the `accessToken` field when returning a User
                    accessToken: {
                        needs: { accessToken: true }, // We need the raw encrypted token from the DB
                        compute(user) {
                            if (!user.accessToken) return user.accessToken;
                            try {
                                // Try to decrypt it so the application code sees the plain-text token
                                return decrypt(user.accessToken);
                            } catch (error) {
                                // Fallback: If it's not encrypted (e.g., old legacy data), just return it as is
                                return user.accessToken;
                            }
                        },
                    },
                    // Do the exact same thing for refreshToken
                    refreshToken: {
                        needs: { refreshToken: true },
                        compute(user) {
                            if (!user.refreshToken) return user.refreshToken;
                            try {
                                return decrypt(user.refreshToken);
                            } catch (error) {
                                return user.refreshToken;
                            }
                        },
                    },
                },
            },
        });
    }

    public static getConn() {
        if (!DbConnection.conn) {
            DbConnection.conn = DbConnection.createPrismaClient();
        }
        return DbConnection.conn;
    }

    async healthCheck(): Promise<HealtCheckResponse> {
        try {
            await DbConnection.getConn().$queryRaw`select 1`;
            return {
                message: "healthy",
                database: "connected",
            };
        } catch (error) {
            return {
                error,
                message: "unhealthy",
                database: "disconnected",
            };
        }
    }
}

const conn = DbConnection.getConn();

export { conn, DbConnection };
