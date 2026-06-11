const request = require('supertest');
const app = require('../server');
const prisma = require('../db/index');
const jwt = require('jsonwebtoken');

describe('=== SoundClown Artist & Request API Integration Tests ===', () => {
  const applicantEmail = 'test_art_app@example.com';
  const listenerEmail = 'test_art_listener@example.com';
  const adminEmail = 'test_art_admin@example.com';
  const rejectedEmail = 'test_art_rej@example.com';

  let applicant = null;
  let listener = null;
  let admin = null;
  let rejectedUser = null;

  let applicantToken = '';
  let listenerToken = '';
  let adminToken = '';

  let artistRequest = null;
  let rejectRequestRecord = null;
  let testSong = null;

  beforeAll(async () => {
    // 1. Dọn dẹp dữ liệu test cũ (nếu có)
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { follower: { email: { in: [applicantEmail, listenerEmail, adminEmail, rejectedEmail] } } },
          { followee: { email: { in: [applicantEmail, listenerEmail, adminEmail, rejectedEmail] } } }
        ]
      }
    });
    await prisma.artistRequest.deleteMany({
      where: { user: { email: { in: [applicantEmail, listenerEmail, adminEmail, rejectedEmail] } } }
    });
    await prisma.artist.deleteMany({
      where: { user: { email: { in: [applicantEmail, listenerEmail, adminEmail, rejectedEmail] } } }
    });
    await prisma.song.deleteMany({
      where: { title: 'TEST_ARTIST_PIN_SONG' }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [applicantEmail, listenerEmail, adminEmail, rejectedEmail] } }
    });

    // 2. Tạo test users
    applicant = await prisma.user.create({
      data: {
        email: applicantEmail,
        username: 'test_art_app',
        password: 'Password123!',
        isActive: true
      }
    });
    applicantToken = jwt.sign({ userId: applicant.id }, process.env.JWT_SECRET || 'secret');

    listener = await prisma.user.create({
      data: {
        email: listenerEmail,
        username: 'test_art_listener',
        password: 'Password123!',
        isActive: true
      }
    });
    listenerToken = jwt.sign({ userId: listener.id }, process.env.JWT_SECRET || 'secret');

    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: 'test_art_admin',
        password: 'Password123!',
        isActive: true,
        isAdmin: true,
        role: 'admin'
      }
    });
    adminToken = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET || 'secret');

    rejectedUser = await prisma.user.create({
      data: {
        email: rejectedEmail,
        username: 'test_art_rej',
        password: 'Password123!',
        isActive: true
      }
    });

    // 3. Tạo test song của applicant
    testSong = await prisma.song.create({
      data: {
        title: 'TEST_ARTIST_PIN_SONG',
        audioUrl: '/uploads/songs/test_pin.mp3',
        durationMs: 150000,
        status: 'approved',
        uploadedById: applicant.id,
        isDeleted: false
      }
    });
  });

  afterAll(async () => {
    // Dọn dẹp tất cả dữ liệu test
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { follower: { email: { in: [applicantEmail, listenerEmail, adminEmail, rejectedEmail] } } },
          { followee: { email: { in: [applicantEmail, listenerEmail, adminEmail, rejectedEmail] } } }
        ]
      }
    });
    await prisma.artistRequest.deleteMany({
      where: { user: { email: { in: [applicantEmail, listenerEmail, adminEmail, rejectedEmail] } } }
    });
    await prisma.artist.deleteMany({
      where: { user: { email: { in: [applicantEmail, listenerEmail, adminEmail, rejectedEmail] } } }
    });
    await prisma.song.deleteMany({
      where: { title: 'TEST_ARTIST_PIN_SONG' }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [applicantEmail, listenerEmail, adminEmail, rejectedEmail] } }
    });
    await prisma.$disconnect();
  });

  // 1. Kiểm tra trạng thái yêu cầu ban đầu (chưa có)
  it('1. GET /api/artist-requests/my-status - Kiểm tra trạng thái chưa gửi đơn', async () => {
    const res = await request(app)
      .get('/api/artist-requests/my-status')
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('NO_REQUEST');
  });

  // 2. Tạo đơn đăng ký làm nghệ sĩ
  it('2. Seed đơn đăng ký và kiểm tra trạng thái PENDING', async () => {
    artistRequest = await prisma.artistRequest.create({
      data: {
        userId: applicant.id,
        artistName: 'TEST_ARTIST_OG',
        idCardUrl: '/private_uploads/id_cards/test-id-card.jpg',
        demoTrackUrl: '/uploads/songs/test-demo.mp3',
        status: 'PENDING'
      }
    });

    const res = await request(app)
      .get('/api/artist-requests/my-status')
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.artistName).toBe('TEST_ARTIST_OG');
  });

  // 3. Admin lấy danh sách đơn PENDING
  it('3. GET /api/artist-requests/admin/pending - Admin xem danh sách đơn đang chờ duyệt', async () => {
    const res = await request(app)
      .get('/api/artist-requests/artist-requests/admin/pending') // Note: routes mounted at app.use('/api/artist-requests', artistRequestRoutes) -> /api/artist-requests/admin/pending
      .set('Authorization', `Bearer ${adminToken}`);

    // Let's verify the exact mounted path. In server.js: app.use('/api/artist-requests', artistRequestRoutes)
    // In artistRequestRoutes.js: router.get('/admin/pending', requireAdmin, ...)
    // So the final path is indeed /api/artist-requests/admin/pending. Let's fix that in test.
    const pathCorrect = '/api/artist-requests/admin/pending';
    const resCorrect = await request(app)
      .get(pathCorrect)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resCorrect.statusCode).toBe(200);
    expect(Array.isArray(resCorrect.body)).toBe(true);
    expect(resCorrect.body.find(r => r.id === artistRequest.id)).toBeDefined();
  });

  // 4. Admin duyệt đơn nghệ sĩ
  it('4. PUT /api/artist-requests/admin/:id/approve - Admin duyệt đơn thành công', async () => {
    const res = await request(app)
      .put(`/api/artist-requests/admin/${artistRequest.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã duyệt yêu cầu thành công!');
    expect(res.body.artist.userId).toBe(applicant.id);

    // Xác nhận vai trò của applicant đã được nâng cấp trong DB
    const updatedUser = await prisma.user.findUnique({ where: { id: applicant.id } });
    expect(updatedUser.role).toBe('artist');
    expect(updatedUser.isVerified).toBe(true);
    expect(updatedUser.displayName).toBe('TEST_ARTIST_OG');

    // Xác nhận trạng thái Artist Request
    const updatedReq = await prisma.artistRequest.findUnique({ where: { id: artistRequest.id } });
    expect(updatedReq.status).toBe('APPROVED');
  });

  // 5. User B follow User A
  it('5. POST /api/artists/:id/follow - Listener follow nghệ sĩ mới', async () => {
    const res = await request(app)
      .post(`/api/artists/${applicant.id}/follow`)
      .set('Authorization', `Bearer ${listenerToken}`);

    expect(res.statusCode).toBe(201);
    expect(res.body.following).toBe(true);

    const artist = await prisma.artist.findUnique({ where: { userId: applicant.id } });
    expect(artist.followerCount).toBe(1);
  });

  // 6. Lấy danh sách followers
  it('6. GET /api/artists/:id/followers - Xem danh sách follower của nghệ sĩ', async () => {
    const res = await request(app)
      .get(`/api/artists/${applicant.id}/followers`)
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.followers)).toBe(true);
    expect(res.body.followers.find(f => f.id === listener.id)).toBeDefined();
  });

  // 7. Ghim bài hát (Pin Song)
  it('7. POST /api/artists/:id/pin - Nghệ sĩ ghim bài hát', async () => {
    const res = await request(app)
      .post(`/api/artists/${applicant.id}/pin`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({ songId: testSong.id });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã cập nhật bài hát ghim');

    const artist = await prisma.artist.findUnique({ where: { userId: applicant.id } });
    expect(artist.pinnedSongId).toBe(testSong.id);
  });

  // 8. Lấy analytics
  it('8. GET /api/artists/analytics - Nghệ sĩ xem thống kê phân tích', async () => {
    const res = await request(app)
      .get('/api/artists/analytics')
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('playTrend');
    expect(res.body).toHaveProperty('averageCompletionRate');
    expect(res.body).toHaveProperty('skipRate');
  });

  // 9. User B unfollow User A
  it('9. DELETE /api/artists/:id/follow - Listener unfollow nghệ sĩ', async () => {
    const res = await request(app)
      .delete(`/api/artists/${applicant.id}/follow`)
      .set('Authorization', `Bearer ${listenerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.following).toBe(false);

    const artist = await prisma.artist.findUnique({ where: { userId: applicant.id } });
    expect(artist.followerCount).toBe(0);
  });

  // 10. Admin từ chối đơn đăng ký nghệ sĩ
  it('10. PUT /api/artist-requests/admin/:id/reject - Admin từ chối đơn', async () => {
    // Seed đơn PENDING mới cho rejectedUser
    rejectRequestRecord = await prisma.artistRequest.create({
      data: {
        userId: rejectedUser.id,
        artistName: 'TEST_ARTIST_REJ',
        idCardUrl: '/private_uploads/id_cards/test-rej.jpg',
        demoTrackUrl: '/uploads/songs/test-demo-rej.mp3',
        status: 'PENDING'
      }
    });

    const res = await request(app)
      .put(`/api/artist-requests/admin/${rejectRequestRecord.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rejectionReason: 'Demo track quality is low.' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã từ chối yêu cầu!');

    const updatedReq = await prisma.artistRequest.findUnique({ where: { id: rejectRequestRecord.id } });
    expect(updatedReq.status).toBe('REJECTED');
    expect(updatedReq.rejectionReason).toBe('Demo track quality is low.');
  });
});
