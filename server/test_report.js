const prisma = require('./db/index');
async function test() {
  const req = {
    body: { targetType: 'SONG', targetId: 1, reason: 'SPAM', description: 'test notification', proofUrl: '' },
    user: { id: 7 } // Assuming user 7 is a normal user
  };
  
  const { targetType, targetId, reason, description, proofUrl } = req.body;
  const reporterId = req.user.id;
  const normalizedType = targetType.toUpperCase();
  const parsedTargetId = parseInt(targetId);

  const report = await prisma.report.create({
    data: { reporterId, targetType: normalizedType, targetId: parsedTargetId, reason, description, proofUrl },
  });
  console.log("Report created:", report.id);

  const notif = await prisma.notification.create({
    data: {
      userId: reporterId,
      type: 'report_received',
      message: 'Báo cáo test.',
      targetType: 'REPORT',
      targetId: report.id,
      actionUrl: '/profile',
    },
  });
  console.log("Notif created:", notif.id);
}
test().catch(console.error).finally(() => prisma.$disconnect());
