const request = require('supertest');
const app = require('../server');
const prisma = require('../db/index');
const jwt = require('jsonwebtoken');

describe('=== SoundClown Album API Integration Tests ===', () => {
  const artistEmail = 'test_alb_artist@example.com';
  const listenerEmail = 'test_alb_listener@example.com';

  let artistUser = null;
  let listenerUser = null;
  let artistToken = '';
  let listenerToken = '';

  let songA = null;
  let songB = null;
  let album = null;

  beforeAll(async () => {
    // 1. Dọn dẹp dữ liệu test cũ (nếu có)
    await prisma.albumSong.deleteMany({
      where: { album: { artist: { user: { email: { in: [artistEmail, listenerEmail] } } } } }
    });
    await prisma.album.deleteMany({
      where: { artist: { user: { email: { in: [artistEmail, listenerEmail] } } } }
    });
    await prisma.song.deleteMany({
      where: { title: { startsWith: 'TEST_ALB_SONG_' } }
    });
    await prisma.artist.deleteMany({
      where: { user: { email: { in: [artistEmail, listenerEmail] } } }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [artistEmail, listenerEmail] } }
    });

    // 2. Tạo test users & tokens
    artistUser = await prisma.user.create({
      data: {
        email: artistEmail,
        username: 'test_alb_artist',
        password: 'Password123!',
        isActive: true,
        role: 'artist'
      }
    });
    artistToken = jwt.sign({ userId: artistUser.id }, process.env.JWT_SECRET || 'secret');

    // Tạo Artist record
    await prisma.artist.create({
      data: {
        userId: artistUser.id,
        verifiedTick: true,
        status: 'active'
      }
    });

    listenerUser = await prisma.user.create({
      data: {
        email: listenerEmail,
        username: 'test_alb_listener',
        password: 'Password123!',
        isActive: true
      }
    });
    listenerToken = jwt.sign({ userId: listenerUser.id }, process.env.JWT_SECRET || 'secret');

    // 3. Tạo test songs
    songA = await prisma.song.create({
      data: {
        title: 'TEST_ALB_SONG_A',
        audioUrl: '/uploads/songs/test_alb_a.mp3',
        durationMs: 120000,
        status: 'approved',
        uploadedById: artistUser.id,
        isDeleted: false
      }
    });

    songB = await prisma.song.create({
      data: {
        title: 'TEST_ALB_SONG_B',
        audioUrl: '/uploads/songs/test_alb_b.mp3',
        durationMs: 180000,
        status: 'approved',
        uploadedById: artistUser.id,
        isDeleted: false
      }
    });
  });

  afterAll(async () => {
    // Dọn dẹp sạch sẽ
    await prisma.albumSong.deleteMany({
      where: { album: { artist: { user: { email: { in: [artistEmail, listenerEmail] } } } } }
    });
    await prisma.album.deleteMany({
      where: { artist: { user: { email: { in: [artistEmail, listenerEmail] } } } }
    });
    await prisma.song.deleteMany({
      where: { title: { startsWith: 'TEST_ALB_SONG_' } }
    });
    await prisma.artist.deleteMany({
      where: { user: { email: { in: [artistEmail, listenerEmail] } } }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [artistEmail, listenerEmail] } }
    });
    await prisma.$disconnect();
  });

  // 1. Tạo album mới dạng nháp (Draft)
  it('1. POST /api/albums - Nghệ sĩ tạo album nháp mới', async () => {
    const res = await request(app)
      .post('/api/albums')
      .set('Authorization', `Bearer ${artistToken}`)
      .send({
        title: 'TEST_ALBUM_TITLE',
        type: 'album'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.album).toHaveProperty('title', 'TEST_ALBUM_TITLE');
    expect(res.body.album.status).toBe('draft');

    album = res.body.album;
  });

  // 2. Lấy danh sách album nháp của bản thân
  it('2. GET /api/artists/:artistId/albums/all - Nghệ sĩ xem danh sách album của mình (gồm cả nháp)', async () => {
    const res = await request(app)
      .get(`/api/artists/${artistUser.id}/albums/all`)
      .set('Authorization', `Bearer ${artistToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.albums)).toBe(true);
    expect(res.body.albums.find(a => a.id === album.id)).toBeDefined();
  });

  // 3. Thêm bài hát vào album nháp
  it('3. POST /api/albums/:albumId/songs - Thêm bài hát vào album nháp', async () => {
    // Thêm bài hát thứ nhất
    let res = await request(app)
      .post(`/api/albums/${album.id}/songs`)
      .set('Authorization', `Bearer ${artistToken}`)
      .send({ songId: songA.id });

    expect(res.statusCode).toBe(201);
    expect(res.body.albumSong.songId).toBe(songA.id);

    // Thêm bài hát thứ hai
    res = await request(app)
      .post(`/api/albums/${album.id}/songs`)
      .set('Authorization', `Bearer ${artistToken}`)
      .send({ songId: songB.id });

    expect(res.statusCode).toBe(201);
    expect(res.body.albumSong.songId).toBe(songB.id);
  });

  // 4. Lấy chi tiết quản lý của album
  it('4. GET /api/albums/:albumId/manage - Nghệ sĩ xem trang quản lý album', async () => {
    const res = await request(app)
      .get(`/api/albums/${album.id}/manage`)
      .set('Authorization', `Bearer ${artistToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.album.id).toBe(album.id);
    expect(res.body.tracks.length).toBe(2);
    expect(res.body.tracks[0].id).toBe(songA.id);
  });

  // 5. Thay đổi thứ tự bài hát (Reorder)
  it('5. PUT /api/albums/:albumId/reorder - Thay đổi thứ tự bài hát trong album nháp', async () => {
    const res = await request(app)
      .put(`/api/albums/${album.id}/reorder`)
      .set('Authorization', `Bearer ${artistToken}`)
      .send({ songIds: [songB.id, songA.id] });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã cập nhật thứ tự');

    // Xác nhận thứ tự mới
    const manageRes = await request(app)
      .get(`/api/albums/${album.id}/manage`)
      .set('Authorization', `Bearer ${artistToken}`);
    expect(manageRes.body.tracks[0].id).toBe(songB.id);
    expect(manageRes.body.tracks[1].id).toBe(songA.id);
  });

  // 6. Lên lịch phát hành (Schedule)
  it('6. POST /api/albums/:albumId/schedule - Lên lịch phát hành album', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const res = await request(app)
      .post(`/api/albums/${album.id}/schedule`)
      .set('Authorization', `Bearer ${artistToken}`)
      .send({ scheduledAt: futureDate.toISOString() });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã lên lịch phát hành!');
    
    const updated = await prisma.album.findUnique({ where: { id: album.id } });
    expect(updated.status).toBe('scheduled');
  });

  // 7. Hủy lịch phát hành quay về nháp (Unschedule)
  it('7. POST /api/albums/:albumId/unschedule - Hủy lịch phát hành quay về bản nháp', async () => {
    const res = await request(app)
      .post(`/api/albums/${album.id}/unschedule`)
      .set('Authorization', `Bearer ${artistToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã hủy lịch, album quay về bản nháp');

    const updated = await prisma.album.findUnique({ where: { id: album.id } });
    expect(updated.status).toBe('draft');
  });

  // 8. Phát hành ngay lập tức (Release)
  it('8. POST /api/albums/:albumId/release - Phát hành album ngay lập tức', async () => {
    const res = await request(app)
      .post(`/api/albums/${album.id}/release`)
      .set('Authorization', `Bearer ${artistToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Album đã được phát hành!');

    const updated = await prisma.album.findUnique({ where: { id: album.id } });
    expect(updated.status).toBe('released');
  });

  // 9. Lấy chi tiết album công khai
  it('9. GET /api/albums/:albumId - Người dùng bình thường lấy chi tiết album đã phát hành', async () => {
    const res = await request(app)
      .get(`/api/albums/${album.id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.album.id).toBe(album.id);
    expect(res.body.tracks.length).toBe(2);
  });

  // 10. Chặn sửa đổi khi đã phát hành
  it('10. POST /api/albums/:albumId/songs - Chặn thêm bài hát vào album đã phát hành (400)', async () => {
    const res = await request(app)
      .post(`/api/albums/${album.id}/songs`)
      .set('Authorization', `Bearer ${artistToken}`)
      .send({ songId: songA.id });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Không thể chỉnh sửa album đã phát hành');
  });

  // 11. Xóa album
  it('11. DELETE /api/albums/:albumId - Nghệ sĩ xóa album của mình', async () => {
    const res = await request(app)
      .delete(`/api/albums/${album.id}`)
      .set('Authorization', `Bearer ${artistToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã xóa album');

    const deleted = await prisma.album.findUnique({ where: { id: album.id } });
    expect(deleted).toBeNull();
  });
});
