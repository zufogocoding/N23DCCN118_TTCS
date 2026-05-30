const prisma = require('./db/index');

async function testAdminNotifications() {
  try {
    // Tìm các admin
    const admins = await prisma.user.findMany({
      where: { OR: [{ role: 'admin' }, { isAdmin: true }] }
    });

    if (admins.length === 0) {
      console.log("❌ Không tìm thấy tài khoản admin nào trong CSDL.");
      return;
    }

    console.log(`✅ Tìm thấy ${admins.length} tài khoản admin.`);
    const admin = admins[0];

    // Lấy số lượng thông báo hiện tại của admin này
    const initialNotifCount = await prisma.notification.count({
      where: { userId: admin.id }
    });

    console.log(`Số thông báo ban đầu của admin ${admin.id} (${admin.username || admin.email}): ${initialNotifCount}`);

    // Tạo một report giả mạo
    const report = await prisma.report.create({
      data: {
        reporterId: admin.id, // Dùng tạm admin làm reporter để tránh lỗi thiếu user
        targetType: 'SONG',
        targetId: 9999, // ID bài hát không cần thiết phải tồn tại để test tạo thông báo (tùy vào schema)
        reason: 'SPAM',
        description: 'Test notification system for admin',
      }
    });

    console.log(`✅ Đã tạo Report mới có ID: ${report.id}`);

    // Giả lập đoạn code tạo thông báo cho toàn bộ admin như trong reportController
    const adminNotifs = admins.map(a => ({
      userId: a.id,
      type: 'report_received',
      targetType: 'REPORT',
      targetId: report.id,
      actionUrl: '/admin/reports',
      message: `Có báo cáo mới về SONG #${report.targetId}. Vui lòng kiểm tra.`
    }));

    const createdNotifs = await prisma.notification.createMany({ data: adminNotifs });
    console.log(`✅ Đã tạo ${createdNotifs.count} thông báo cho admin.`);

    // Lấy thông báo mới nhất của admin
    const latestNotifs = await prisma.notification.findMany({
      where: { userId: admin.id },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    console.log("\n📬 Thông báo mới nhất của admin:");
    console.log(latestNotifs);

  } catch (err) {
    console.error("Lỗi:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminNotifications();
