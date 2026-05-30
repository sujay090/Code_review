import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
type HealtCheckResponse = {
    message: string;
    database: string;
    error?: unknown;
};
interface IDbConnection {
    healthCheck(): Promise<HealtCheckResponse>;
}
declare class DbConnection implements IDbConnection {
    private static conn;
    static getConn(): PrismaClient;
    healthCheck(): Promise<HealtCheckResponse>;
}
declare const conn: PrismaClient;
export { conn, DbConnection };
//# sourceMappingURL=DB.d.ts.map