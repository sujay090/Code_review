import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { encrypt, decrypt } from "../utils/encryption.js";
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
class DbConnection {
    static conn;
    static createPrismaClient() {
        const baseClient = new PrismaClient({ adapter });
        return baseClient.$extends({
            query: {
                user: {
                    async $allOperations({ operation, args, query }) {
                        const anyArgs = args;
                        if (["create", "update", "upsert", "createMany"].includes(operation)) {
                            if (anyArgs.data?.accessToken && typeof anyArgs.data.accessToken === "string") {
                                anyArgs.data.accessToken = encrypt(anyArgs.data.accessToken);
                            }
                            if (anyArgs.data?.refreshToken && typeof anyArgs.data.refreshToken === "string") {
                                anyArgs.data.refreshToken = encrypt(anyArgs.data.refreshToken);
                            }
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
                        return query(args);
                    },
                },
            },
            result: {
                user: {
                    accessToken: {
                        needs: { accessToken: true },
                        compute(user) {
                            if (!user.accessToken)
                                return user.accessToken;
                            try {
                                return decrypt(user.accessToken);
                            }
                            catch (error) {
                                return user.accessToken;
                            }
                        },
                    },
                    refreshToken: {
                        needs: { refreshToken: true },
                        compute(user) {
                            if (!user.refreshToken)
                                return user.refreshToken;
                            try {
                                return decrypt(user.refreshToken);
                            }
                            catch (error) {
                                return user.refreshToken;
                            }
                        },
                    },
                },
            },
        });
    }
    static getConn() {
        if (!DbConnection.conn) {
            DbConnection.conn = DbConnection.createPrismaClient();
        }
        return DbConnection.conn;
    }
    async healthCheck() {
        try {
            await DbConnection.getConn().$queryRaw `select 1`;
            return {
                message: "healthy",
                database: "connected",
            };
        }
        catch (error) {
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
//# sourceMappingURL=DB.js.map