const request = require('supertest');
const app = require('../server');
const prisma = require('../db/index');
const jwt = require('jsonwebtoken');

describe('=== SoundClown Songs & Interactions API Integration Tests ===', () => {
  const creatorEmail = 'test_song_creator@example.com';
  const listenerEmail = 'test_song_listener@example.com';
  
  let creator = null;
  let listener = null;
  let creatorToken = '';
  let listenerToken = '';
  
  let approvedSong = null;
  let pendingSong = null;

  beforeAll(async () => {
    // 1. Dọn dẹp dữ liệu cũ (nếu có)
    await prisma.interaction.deleteMany({
      where: { user: { email: { in: [creatorEmail, listenerEmail] } } }
    });
    await prisma.songLike.deleteMany({
      where: { user: { email: { in: [creatorEmail, listenerEmail] } } }
    });
    await prisma.song.deleteMany({
      where: { title: { startsWith: 'TEST_SONG_' } }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [creatorEmail, listenerEmail] } }
    });

    // 2. Tạo test users và sinh JWT tokens
    creator = await prisma.user.create({
      data: {
        email: creatorEmail,
        username: 'test_song_creator',
        password: 'Password123!',
        isActive: true,
        role: 'user'
      }
    });
    creatorToken = jwt.sign({ userId: creator.id }, process.env.JWT_SECRET || 'secret');

    listener = await prisma.user.create({
      data: {
        email: listenerEmail,
        username: 'test_song_listener',
        password: 'Password123!',
        isActive: true,
        role: 'user'
      }
    });
    listenerToken = jwt.sign({ userId: listener.id }, process.env.JWT_SECRET || 'secret');

    // 3. Tạo test songs
    approvedSong = await prisma.song.create({
      data: {
        title: 'TEST_SONG_APPROVED',
        audioUrl: '/uploads/songs/test_approved.mp3',
        durationMs: 100000,
        status: 'approved',
        uploadedById: creator.id,
        isDeleted: false
      }
    });

    pendingSong = await prisma.song.create({
      data: {
        title: 'TEST_SONG_PENDING',
        audioUrl: '/uploads/songs/test_pending.mp3',
        durationMs: 200000,
        status: 'pending',
        uploadedById: creator.id,
        isDeleted: false
      }
    });
  });

  afterAll(async () => {
    // Dọn dẹp sạch sẽ
    await prisma.interaction.deleteMany({
      where: { user: { email: { in: [creatorEmail, listenerEmail] } } }
    });
    await prisma.songLike.deleteMany({
      where: { user: { email: { in: [creatorEmail, listenerEmail] } } }
    });
    await prisma.song.deleteMany({
      where: { title: { startsWith: 'TEST_SONG_' } }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [creatorEmail, listenerEmail] } }
    });
    await prisma.$disconnect();
  });

  // 1. GET /api/songs
  it('1. GET /api/songs - Lấy danh sách nhạc công khai', async () => {
    const res = await request(app).get('/api/songs');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    
    // Bài hát approved phải xuất hiện trong list
    const found = res.body.find(s => s.id === approvedSong.id);
    expect(found).toBeDefined();
    expect(found.title).toBe('TEST_SONG_APPROVED');

    // Bài hát pending KHÔNG được phép xuất hiện
    const notFound = res.body.find(s => s.id === pendingSong.id);
    expect(notFound).toBeUndefined();
  });

  // 2. GET /api/songs/:id (Approved)
  it('2. GET /api/songs/:id - Lấy chi tiết bài hát đã duyệt (Mọi người đều xem được)', async () => {
    const res = await request(app).get(`/api/songs/${approvedSong.id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', approvedSong.id);
    expect(res.body).toHaveProperty('title', approvedSong.title);
  });

  // 3. GET /api/songs/:id (Pending - Quyền xem)
  it('3. GET /api/songs/:id - Không cho phép listener xem bài hát pending', async () => {
    const res = await request(app)
      .get(`/api/songs/${pendingSong.id}`)
      .set('Authorization', `Bearer ${listenerToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('4. GET /api/songs/:id - Cho phép owner xem bài hát pending của mình', async () => {
    const res = await request(app)
      .get(`/api/songs/${pendingSong.id}`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', pendingSong.id);
  });

  // 4. POST /api/interactions/listen (Nghe nhạc)
  it('5. POST /api/interactions/listen - Ghi nhận tương tác nghe nhạc và tăng playCount', async () => {
    // Trước khi nghe, playCount = 0
    const beforeSong = await prisma.song.findUnique({ where: { id: approvedSong.id } });
    const initialPlayCount = beforeSong.playCount;

    // Listener nghe bài hát với durationPlayed = 40000ms (40% durationMs = 100000ms, không skip)
    const res = await request(app)
      .post('/api/interactions/listen')
      .set('Authorization', `Bearer ${listenerToken}`)
      .send({
        songId: approvedSong.id,
        durationPlayed: 40000,
        isSkipped: false
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã ghi nhận tương tác');
    expect(res.body.data.completionRate).toBeCloseTo(0.4, 2);

    // Sau khi nghe >= 30%, playCount phải tăng lên 1
    const afterSong = await prisma.song.findUnique({ where: { id: approvedSong.id } });
    expect(afterSong.playCount).toBe(initialPlayCount + 1);
  });

  it('6. POST /api/interactions/listen - Nghe nhạc bị skip hoặc dưới 30% không tăng playCount', async () => {
    const beforeSong = await prisma.song.findUnique({ where: { id: approvedSong.id } });
    const initialPlayCount = beforeSong.playCount;

    // Listener nghe bài hát nhưng skip
    await request(app)
      .post('/api/interactions/listen')
      .set('Authorization', `Bearer ${listenerToken}`)
      .send({
        songId: approvedSong.id,
        durationPlayed: 50000,
        isSkipped: true
      });

    const afterSong = await prisma.song.findUnique({ where: { id: approvedSong.id } });
    expect(afterSong.playCount).toBe(initialPlayCount);
  });

  // 5. POST /api/interactions/like (Thích)
  it('7. POST /api/interactions/like - Toggle Like bài hát', async () => {
    // 1. Thích bài hát
    let res = await request(app)
      .post('/api/interactions/like')
      .set('Authorization', `Bearer ${listenerToken}`)
      .send({ songId: approvedSong.id });

    expect(res.statusCode).toBe(200);
    expect(res.body.isLiked).toBe(true);

    // 2. Kiểm tra danh sách đã thích
    res = await request(app)
      .get('/api/interactions/liked')
      .set('Authorization', `Bearer ${listenerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find(s => s.id === approvedSong.id)).toBeDefined();

    // 3. Batch check like status
    res = await request(app)
      .post('/api/interactions/like-status-batch')
      .set('Authorization', `Bearer ${listenerToken}`)
      .send({ songIds: [approvedSong.id, pendingSong.id] });

    expect(res.statusCode).toBe(200);
    expect(res.body[approvedSong.id]).toBe(true);
    expect(res.body[pendingSong.id]).toBe(false);

    // 4. Bỏ thích bài hát
    res = await request(app)
      .post('/api/interactions/like')
      .set('Authorization', `Bearer ${listenerToken}`)
      .send({ songId: approvedSong.id });

    expect(res.statusCode).toBe(200);
    expect(res.body.isLiked).toBe(false);
  });
});
