import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding NANGGROE OS AI v1.0.0 database...");

  // Seed default system configuration
  const systemConfigs = [
    {
      key: "system.name",
      value: "NANGGROE OS AI",
      category: "general",
    },
    {
      key: "system.version",
      value: "1.0.0",
      category: "general",
    },
    {
      key: "system.author",
      value: "Mulky Malikul Dhaher",
      category: "general",
    },
    {
      key: "system.description",
      value: "Modular Autonomous Robotics Operating System Platform",
      category: "general",
    },
    {
      key: "hardware.auto_detect",
      value: "true",
      category: "hardware",
    },
    {
      key: "hardware.scan_interval_ms",
      value: "5000",
      category: "hardware",
    },
    {
      key: "agent.hermes_enabled",
      value: "true",
      category: "agent",
    },
    {
      key: "agent.picoclaw_enabled",
      value: "true",
      category: "agent",
    },
    {
      key: "mission.default_altitude",
      value: "50",
      category: "mission",
    },
    {
      key: "mission.default_speed",
      value: "5",
      category: "mission",
    },
    {
      key: "network.cloud_sync_enabled",
      value: "false",
      category: "network",
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, category: config.category },
      create: config,
    });
  }

  console.log(`✅ Seeded ${systemConfigs.length} system configurations`);
  console.log("🎉 NANGGROE OS AI seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
