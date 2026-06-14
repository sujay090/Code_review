import "dotenv/config";
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
    private static createPrismaClient;
    static getConn(): import("@prisma/client/runtime/client").DynamicClientExtensionThis<import("../generated/prisma/internal/prismaNamespace.js").TypeMap<import("@prisma/client/runtime/client").InternalArgs & {
        result: {
            user: {
                accessToken: () => {
                    needs: {
                        accessToken: true;
                    };
                    compute(user: {
                        accessToken: string;
                    }): string;
                };
                refreshToken: () => {
                    needs: {
                        refreshToken: true;
                    };
                    compute(user: {
                        refreshToken: string;
                    }): string;
                };
            };
        };
        model: {};
        query: {};
        client: {};
    }, import("../generated/prisma/internal/prismaNamespace.js").GlobalOmitConfig | undefined>, import("../generated/prisma/internal/prismaNamespace.js").TypeMapCb<import("../generated/prisma/internal/prismaNamespace.js").GlobalOmitConfig | undefined>, {
        result: {
            user: {
                accessToken: () => {
                    needs: {
                        accessToken: true;
                    };
                    compute(user: {
                        accessToken: string;
                    }): string;
                };
                refreshToken: () => {
                    needs: {
                        refreshToken: true;
                    };
                    compute(user: {
                        refreshToken: string;
                    }): string;
                };
            };
        };
        model: {};
        query: {};
        client: {};
    }>;
    healthCheck(): Promise<HealtCheckResponse>;
}
declare const conn: import("@prisma/client/runtime/client").DynamicClientExtensionThis<import("../generated/prisma/internal/prismaNamespace.js").TypeMap<import("@prisma/client/runtime/client").InternalArgs & {
    result: {
        user: {
            accessToken: () => {
                needs: {
                    accessToken: true;
                };
                compute(user: {
                    accessToken: string;
                }): string;
            };
            refreshToken: () => {
                needs: {
                    refreshToken: true;
                };
                compute(user: {
                    refreshToken: string;
                }): string;
            };
        };
    };
    model: {};
    query: {};
    client: {};
}, import("../generated/prisma/internal/prismaNamespace.js").GlobalOmitConfig | undefined>, import("../generated/prisma/internal/prismaNamespace.js").TypeMapCb<import("../generated/prisma/internal/prismaNamespace.js").GlobalOmitConfig | undefined>, {
    result: {
        user: {
            accessToken: () => {
                needs: {
                    accessToken: true;
                };
                compute(user: {
                    accessToken: string;
                }): string;
            };
            refreshToken: () => {
                needs: {
                    refreshToken: true;
                };
                compute(user: {
                    refreshToken: string;
                }): string;
            };
        };
    };
    model: {};
    query: {};
    client: {};
}>;
export { conn, DbConnection };
//# sourceMappingURL=DB.d.ts.map