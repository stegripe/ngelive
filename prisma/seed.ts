import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import nodeProcess from "node:process";

const prisma = new PrismaClient();

async function main() {
    const adminPassword = await bcrypt.hash(nodeProcess.env.ADMIN_PASSWORD || "admin123", 10);

    await prisma.user.upsert({
        where: { email: nodeProcess.env.ADMIN_EMAIL || "admin@ngelive.stegripe.org" },
        update: {},
        create: {
            email: nodeProcess.env.ADMIN_EMAIL || "admin@ngelive.stegripe.org",
            username: "admin",
            password: adminPassword,
            role: "ADMIN",
            rtmpQuota: -1,
        },
    });

    const userPassword = await bcrypt.hash("user123", 10);

    await prisma.user.upsert({
        where: { email: "user@ngelive.stegripe.org" },
        update: {},
        create: {
            email: "user@ngelive.stegripe.org",
            username: "user",
            password: userPassword,
            role: "USER",
            rtmpQuota: 2,
        },
    });

    console.info("Database seeded successfully!");
}

main()
    .catch((e) => {
        console.error(e);
        nodeProcess.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
