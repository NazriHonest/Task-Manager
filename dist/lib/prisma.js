"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// prisma.ts (or wherever you initialize Prisma)
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../generated/prisma/client");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
}
// For Neon: Ensure SSL is required
let finalConnectionString = connectionString;
if (connectionString.includes('neon.tech')) {
    if (!connectionString.includes('sslmode=require')) {
        if (!connectionString.includes('?')) {
            finalConnectionString = `${connectionString}?sslmode=require`;
        }
        else {
            finalConnectionString = `${connectionString}&sslmode=require`;
        }
    }
    // Recommend pooled connection
    if (!connectionString.includes('-pooler')) {
        console.warn('⚠️  Consider using pooled connection for Neon: Add -pooler to hostname');
    }
}
const adapter = new adapter_pg_1.PrismaPg({ connectionString: finalConnectionString });
const prisma = new client_1.PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error']
});
exports.prisma = prisma;
// import "dotenv/config";
// import { PrismaPg } from '@prisma/adapter-pg'
// import { PrismaClient } from '../generated/prisma/client'
// const connectionString = `${process.env.DATABASE_URL}`
// const adapter = new PrismaPg({ connectionString })
// const prisma = new PrismaClient({ adapter })
// export { prisma }
//# sourceMappingURL=prisma.js.map