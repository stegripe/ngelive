import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    // Create admin user
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10);
    
    await prisma.user.upsert({
        where: { email: process.env.ADMIN_EMAIL || "admin@stegripe.org" },
        update: {},
        create: {
            email: process.env.ADMIN_EMAIL || "admin@stegripe.org",
            username: "admin",
            password: adminPassword,
            role: "ADMIN",
            rtmpQuota: -1, // -1 means unlimited for admin
        },
    });

    // Create sample user
    const userPassword = await bcrypt.hash("user123", 10);
    
    await prisma.user.upsert({
        where: { email: "user@stegripe.org" },
        update: {},
        create: {
            email: "user@stegripe.org",
            username: "user",
            password: userPassword,
            role: "USER",
            rtmpQuota: 2, // Default quota for regular users
        },
    });

    console.info("Database seeded successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
