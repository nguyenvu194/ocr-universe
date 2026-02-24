// src/config/prisma.ts
import { PrismaClient } from '../generated/prisma/client'

const prismaClientSingleton = () => {
    return new (PrismaClient as any)()
}

type PrismaClientInstance = InstanceType<typeof PrismaClient>

declare global {
    var prisma: undefined | PrismaClientInstance
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma as PrismaClientInstance

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma