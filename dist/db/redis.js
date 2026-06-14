import { Redis } from "ioredis";
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
    throw new Error("Missing environment variable: REDIS_URL");
}
const rd = new Redis(redisUrl);
rd.on("error", (error) => {
    console.error("Redis Error", error);
});
export { rd };
//# sourceMappingURL=redis.js.map