const request = require('supertest');
const app = require('../server');
const prisma = require('../db/index');
const jwt = require('jsonwebtoken');

describe('=== SoundClown Report & AdminReport API Integration Tests ===', () => {
  const reporterEmail = 'test_rep_reporter@example.com';
  const creatorEmail = 'test_rep_creator@example.com';
  const adminEmail = 'test_rep_admin@example.com';

  let reporter = null;
  let creator = null;
  let admin = null;

  let reporterToken = '';
  let creatorToken = '';
  let adminToken = '';

  let testSong = null;
  let warnReportId = null;
  let rejectReportId = null;
  let resolveReportId = null;

  beforeAll(async () => {
    // 1. Dọn dẹp dữ liệu test cũ (nếu có)
    await prisma.notification.deleteMany({
      where: { user: { email: { in: [reporterEmail, creatorEmail, adminEmail] } } }
    });
    await prisma.report.deleteMany({
      where: { reporter: { email: { in: [reporterEmail, creatorEmail, adminEmail] } } }
    });
    await prisma.song.deleteMany({
      where: { title: 'TEST_REPORT_SONG' }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [reporterEmail, creatorEmail, adminEmail] } }
    });

    // 2. Tạo test users & tokens
    reporter = await prisma.user.create({
      data: {
        email: reporterEmail,
        username: 'test_rep_reporter',
        password: 'Password123!',
        isActive: true
      }
    });
    reporterToken = jwt.sign({ userId: reporter.id }, process.env.JWT_SECRET || 'secret');

    creator = await prisma.user.create({
      data: {
        email: creatorEmail,
        username: 'test_rep_creator',
        password: 'Password123!',
        isActive: true
      }
    });
    creatorToken = jwt.sign({ userId: creator.id }, process.env.JWT_SECRET || 'secret');

    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: 'test_rep_admin',
        password: 'Password123!',
        isActive: true,
        isAdmin: true,
        role: 'admin'
      }
    });
    adminToken = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET || 'secret');

    // 3. Tạo bài hát của creator
    testSong = await prisma.song.create({
      data: {
        title: 'TEST_REPORT_SONG',
        audioUrl: '/uploads/songs/test_rep.mp3',
        durationMs: 120000,
        status: 'approved',
        uploadedById: creator.id,
        isDeleted: false
      }
    });
  });

  afterAll(async () => {
    // Dọn dẹp sạch sẽ toàn bộ bản ghi
    await prisma.notification.deleteMany({
      where: { user: { email: { in: [reporterEmail, creatorEmail, adminEmail] } } }
    });
    await prisma.report.deleteMany({
      where: { reporter: { email: { in: [reporterEmail, creatorEmail, adminEmail] } } }
    });
    await prisma.song.deleteMany({
      where: { title: 'TEST_REPORT_SONG' }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [reporterEmail, creatorEmail, adminEmail] } }
    });
    await prisma.$disconnect();
  });

  // 1. User tạo báo cáo
  it('1. POST /api/reports - Tạo báo cáo vi phạm bài hát', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        targetType: 'SONG',
        targetId: testSong.id,
        reason: 'COPYRIGHT',
        description: 'Sao chép bản quyền bài hát của tôi.',
        proofUrl: 'http://youtube.com/my-original-song'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toContain('Báo cáo của bạn đã được gửi thành công');
    expect(res.body.report.targetType).toBe('SONG');
    expect(res.body.report.targetId).toBe(testSong.id);
    
    warnReportId = res.body.report.id;
  });

  // 2. Chặn tự báo cáo bài hát của mình
  it('2. POST /api/reports - Ngăn chặn người dùng báo cáo chính mình', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        targetType: 'SONG',
        targetId: testSong.id,
        reason: 'COPYRIGHT',
        description: 'Tự báo cáo mình'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Bạn không thể báo cáo nội dung của chính mình.');
  });

  // 3. Chặn duplicate report
  it('3. POST /api/reports - Ngăn chặn gửi nhiều báo cáo trùng lặp khi chưa xử lý', async () => {
    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        targetType: 'SONG',
        targetId: testSong.id,
        reason: 'COPYRIGHT',
        description: 'Báo cáo trùng lặp'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Bạn đã báo cáo nội dung này rồi. Vui lòng chờ admin xử lý.');
  });

  // 4. Admin lấy danh sách báo cáo
  it('4. GET /api/admin/reports - Admin xem danh sách tất cả báo cáo', async () => {
    const res = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.reports)).toBe(true);
    expect(res.body.reports.find(r => r.id === warnReportId)).toBeDefined();
  });

  // 5. Admin cảnh cáo (WARN)
  it('5. PUT /api/admin/reports/:id/warn - Admin gửi cảnh cáo cho creator', async () => {
    const res = await request(app)
      .put(`/api/admin/reports/${warnReportId}/warn`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã gửi cảnh cáo thành công.');

    const updatedReport = await prisma.report.findUnique({ where: { id: warnReportId } });
    expect(updatedReport.status).toBe('WARNED');

    // Kiểm tra xem creator có nhận được thông báo cảnh cáo không
    const warnNotif = await prisma.notification.findFirst({
      where: { userId: creator.id, type: 'report_warning' }
    });
    expect(warnNotif).not.toBeNull();
    expect(warnNotif.message).toContain('Cảnh cáo: Nội dung "TEST_REPORT_SONG" của bạn đã bị báo cáo');
  });

  // 6. Admin bác bỏ báo cáo (REJECT)
  it('6. PUT /api/admin/reports/:id/reject - Admin bác bỏ báo cáo vi phạm', async () => {
    // Tạo thêm 1 báo cáo mới
    const newReportRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        targetType: 'SONG',
        targetId: testSong.id,
        reason: 'SPAM',
        description: 'Spam'
      });
    rejectReportId = newReportRes.body.report.id;

    const res = await request(app)
      .put(`/api/admin/reports/${rejectReportId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã bác bỏ báo cáo.');

    const updatedReport = await prisma.report.findUnique({ where: { id: rejectReportId } });
    expect(updatedReport.status).toBe('REJECTED');
  });

  // 7. Admin xử lý vi phạm (RESOLVE - Takedown)
  it('7. PUT /api/admin/reports/:id/resolve - Admin phê duyệt và gỡ bài hát vi phạm', async () => {
    // Tạo thêm 1 báo cáo mới
    const newReportRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({
        targetType: 'SONG',
        targetId: testSong.id,
        reason: 'COPYRIGHT',
        description: 'Bản quyền'
      });
    resolveReportId = newReportRes.body.report.id;

    const res = await request(app)
      .put(`/api/admin/reports/${resolveReportId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã xử lý vi phạm thành công.');

    const updatedReport = await prisma.report.findUnique({ where: { id: resolveReportId } });
    expect(updatedReport.status).toBe('RESOLVED');

    // Xác nhận bài hát đã bị chuyển trạng thái thành "rejected" (gỡ bỏ)
    const updatedSong = await prisma.song.findUnique({ where: { id: testSong.id } });
    expect(updatedSong.status).toBe('rejected');
  });
});
