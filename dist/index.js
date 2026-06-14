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
import webhookRoutes from "./routes/webhook.route.js";
import reviewRoutes from "./routes/review.route.js";
// workers — start BullMQ workers in this process
import { worker as reviewWorker } from "./workers/review.worker.js";
import { emailWorker } from "./workers/email.worker.js";
import { reportWorker } from "./workers/report.worker.js";
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
// Webhook route needs raw body for HMAC signature verification —
// must be mounted BEFORE express.json() so it receives a Buffer.
app.use("/api/webhooks", express.raw({ type: "application/json" }), webhookRoutes);
app.use(express.json());
app.get("/health", async (req, res) => {
    const health = await db.healthCheck();
    res.status(health.message === "healthy" ? 200 : 500).json(health);
});
app.use("/api/auth", authRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/repositories", repositoryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
});
const server = app.listen(PORT, () => {
    console.log("Server is running on port 4020");
    console.log("Workers started: review (×3), email (×5), report (×2)");
});
async function shutDown() {
    console.log("Shutting down...");
    await Promise.all([
        reviewWorker.close(),
        emailWorker.close(),
        reportWorker.close(),
    ]);
    server.close(async () => {
        await conn.$disconnect();
        rd.disconnect();
        process.exit(0);
    });
}
process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
//# sourceMappingURL=index.js.map