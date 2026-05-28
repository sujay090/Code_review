import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

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
  private static conn: PrismaClient;
  public static getConn(): PrismaClient {
    if (!DbConnection.conn) {
      DbConnection.conn = new PrismaClient({ adapter });
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
