import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
class DbConnection {
    static conn;
    static getConn() {
        if (!DbConnection.conn) {
            DbConnection.conn = new PrismaClient({ adapter });
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