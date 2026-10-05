// import PrismClient
import { PrismaClient } from "../../generated/prisma/client.ts";

const prisma = new PrismaClient();

export async function checkDatabaseConnection() {
  try {
    // Forces Prisma Client to establish a connection with the database
    await prisma.$connect();
    console.log("✅ Successfully connected to the database.");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    // Handle error (e.g., exit process, trigger alerts)
    process.exit(1);
  } finally {
    // Always disconnect after a manual health check script to free up the pool
    await prisma.$disconnect();
  }
}
