import { createClient } from "redis";
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
    throw new Error("Missing environment variable: REDIS_URL");
}
const rd = createClient({ url: redisUrl });
rd.on("error", (error) => {
    console.error("Redis Error", error);
});
await rd.connect();
export { rd };
//# sourceMappingURL=redis.js.map