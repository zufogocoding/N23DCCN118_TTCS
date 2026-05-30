const prisma = require('./db/index');
async function check() {
  const recentReports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.log("Recent reports:", recentReports);

  const recentNotifs = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent notifications:", recentNotifs);
}
check().catch(console.error).finally(() => prisma.$disconnect());
