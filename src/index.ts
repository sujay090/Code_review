import express, {
  type Response,
  type Request,
  type NextFunction,
} from "express";
import cors from "cors";
import { conn, DbConnection } from "./db/DB.js";
import helmet from "helmet";
import cookieParser from "cookie-parser";
// routes

import authRoutes from "./routes/auth.route.js";

const app = express();

const PORT = Number(process.env.PORT!);
const db = new DbConnection();
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(cors({ origin: process.env.CORS_ORIGIN ?? false }));
app.use(helmet());
app.use(express.json());

app.get("/health", async (req: Request, res: Response) => {
  const health = await db.healthCheck();
  res.status(health.message === "healthy" ? 200 : 500).json(health);
});

app.use("/api/auth", authRoutes);

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal Server Error" });
});

const server = app.listen(PORT, () => {
  console.log("Server is running on port 4020");
});

async function shutDown() {
  server.close(async () => {
    await conn.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
