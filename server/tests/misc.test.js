const request = require('supertest');
const app = require('../server');
const prisma = require('../db/index');
const jwt = require('jsonwebtoken');

describe('=== SoundClown Notifications, Search & Browse API Integration Tests ===', () => {
  const userEmail = 'test_misc_user@example.com';
  
  let testUser = null;
  let userToken = '';
  
  let notifA = null;
  let notifB = null;
  let testGenre = null;

  beforeAll(async () => {
    // 1. Dọn dẹp dữ liệu test cũ (nếu có)
    await prisma.notification.deleteMany({
      where: { user: { email: userEmail } }
    });
    await prisma.songGenre.deleteMany({
      where: { genre: { genreTag: 'TEST_MISC_GENRE' } }
    });
    await prisma.genre.deleteMany({
      where: { genreTag: 'TEST_MISC_GENRE' }
    });
    await prisma.user.deleteMany({
      where: { email: userEmail }
    });

    // 2. Tạo test user & token
    testUser = await prisma.user.create({
      data: {
        email: userEmail,
        username: 'test_misc_user',
        password: 'Password123!',
        isActive: true
      }
    });
    userToken = jwt.sign({ userId: testUser.id }, process.env.JWT_SECRET || 'secret');

    // 3. Tạo test notifications
    notifA = await prisma.notification.create({
      data: {
        userId: testUser.id,
        message: 'TEST_NOTIF_MESSAGE_A',
        type: 'info',
        isRead: false
      }
    });

    notifB = await prisma.notification.create({
      data: {
        userId: testUser.id,
        message: 'TEST_NOTIF_MESSAGE_B',
        type: 'new_song',
        isRead: false
      }
    });

    // 4. Tạo test genre
    testGenre = await prisma.genre.create({
      data: {
        genreTag: 'TEST_MISC_GENRE'
      }
    });
  });

  afterAll(async () => {
    // Dọn dẹp sạch sẽ
    await prisma.notification.deleteMany({
      where: { user: { email: userEmail } }
    });
    await prisma.songGenre.deleteMany({
      where: { genre: { genreTag: 'TEST_MISC_GENRE' } }
    });
    await prisma.genre.deleteMany({
      where: { genreTag: 'TEST_MISC_GENRE' }
    });
    await prisma.user.deleteMany({
      where: { email: userEmail }
    });
    await prisma.$disconnect();
  });

  // 1. GET /api/notifications - Lấy danh sách thông báo
  it('1. GET /api/notifications - Lấy danh sách thông báo của người dùng', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('notifications');
    expect(res.body).toHaveProperty('unreadCount');
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(res.body.notifications.find(n => n.id === notifA.id)).toBeDefined();
    expect(res.body.notifications.find(n => n.id === notifB.id)).toBeDefined();
  });

  // 2. PUT /api/notifications/:id/read - Đánh dấu 1 thông báo đã đọc
  it('2. PUT /api/notifications/:id/read - Đánh dấu một thông báo đã đọc', async () => {
    const res = await request(app)
      .put(`/api/notifications/${notifA.id}/read`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã đánh dấu đã đọc');

    const updated = await prisma.notification.findUnique({ where: { id: notifA.id } });
    expect(updated.isRead).toBe(true);
  });

  // 3. PUT /api/notifications/read-all - Đánh dấu tất cả đã đọc
  it('3. PUT /api/notifications/read-all - Đánh dấu tất cả thông báo đã đọc', async () => {
    const res = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã đánh dấu tất cả đã đọc');

    const notifs = await prisma.notification.findMany({ where: { userId: testUser.id } });
    notifs.forEach(n => {
      expect(n.isRead).toBe(true);
    });
  });

  // 4. GET /api/search - Tìm kiếm tổng hợp
  it('4. GET /api/search - Tìm kiếm tổng hợp bài hát/album/nghệ sĩ', async () => {
    const res = await request(app)
      .get('/api/search')
      .query({ q: 'TEST' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('songs');
    expect(res.body).toHaveProperty('albums');
    expect(res.body).toHaveProperty('artists');
  });

  // 5. GET /api/browse/genre/:genreId - Tìm kiếm theo thể loại
  it('5. GET /api/browse/genre/:genreId - Lấy danh sách nhạc theo thể loại', async () => {
    const res = await request(app)
      .get(`/api/browse/genre/${testGenre.id}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.songs)).toBe(true);
  });
});
