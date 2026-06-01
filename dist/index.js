import express, {} from "express";
import cors from "cors";
import { conn, DbConnection } from "./db/DB.js";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rd } from "./db/redis.js";
// routes
import authRoutes from "./routes/auth.route.js";
import githubRoutes from "./routes/github.route.js";
import repositoryRoutes from "./routes/repository.route.js";
const app = express();
const PORT = Number(process.env.PORT);
const db = new DbConnection();
const cookieSecret = process.env.COOKIE_SECRET;
if (!cookieSecret) {
    throw new Error("Missing environment variable: COOKIE_SECRET");
}
app.use(cookieParser(cookieSecret));
app.use(cors({
    origin: process.env.CORS_ORIGIN ?? false,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));
app.use(helmet());
app.use(express.json());
app.get("/health", async (req, res) => {
    const health = await db.healthCheck();
    res.status(health.message === "healthy" ? 200 : 500).json(health);
});
app.use("/api/auth", authRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/repositories", repositoryRoutes);
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
});
const server = app.listen(PORT, () => {
    console.log("Server is running on port 4020");
});
async function shutDown() {
    server.close(async () => {
        await conn.$disconnect();
        await rd.quit();
        process.exit(0);
    });
}
process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
//# sourceMappingURL=index.js.map