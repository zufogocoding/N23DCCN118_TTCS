const request = require('supertest');
const app = require('../server');
const prisma = require('../db/index');
const jwt = require('jsonwebtoken');

describe('=== SoundClown Playlist API Integration Tests ===', () => {
  const ownerEmail = 'test_playlist_owner@example.com';
  const collabEmail = 'test_playlist_collab@example.com';

  let owner = null;
  let collab = null;
  let ownerToken = '';
  let collabToken = '';
  
  let testSong = null;
  let playlist = null;
  let clonedPlaylistId = null;

  beforeAll(async () => {
    // 1. Dọn dẹp dữ liệu cũ (nếu có)
    await prisma.playlistCollaborator.deleteMany({
      where: { user: { email: { in: [ownerEmail, collabEmail] } } }
    });
    await prisma.playlistSong.deleteMany({
      where: { playlist: { user: { email: { in: [ownerEmail, collabEmail] } } } }
    });
    await prisma.playlist.deleteMany({
      where: { user: { email: { in: [ownerEmail, collabEmail] } } }
    });
    await prisma.song.deleteMany({
      where: { title: 'TEST_PLAYLIST_SONG' }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, collabEmail] } }
    });

    // 2. Tạo test users & tokens
    owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        username: 'test_playlist_owner',
        password: 'Password123!',
        isActive: true
      }
    });
    ownerToken = jwt.sign({ userId: owner.id }, process.env.JWT_SECRET || 'secret');

    collab = await prisma.user.create({
      data: {
        email: collabEmail,
        username: 'test_playlist_collab',
        password: 'Password123!',
        isActive: true
      }
    });
    collabToken = jwt.sign({ userId: collab.id }, process.env.JWT_SECRET || 'secret');

    // 3. Tạo test song
    testSong = await prisma.song.create({
      data: {
        title: 'TEST_PLAYLIST_SONG',
        audioUrl: '/uploads/songs/test_playlist.mp3',
        durationMs: 120000,
        status: 'approved',
        isDeleted: false
      }
    });
  });

  afterAll(async () => {
    // Dọn dẹp tất cả dữ liệu test
    if (clonedPlaylistId) {
      await prisma.playlistCollaborator.deleteMany({ where: { playlistId: clonedPlaylistId } });
      await prisma.playlistSong.deleteMany({ where: { playlistId: clonedPlaylistId } });
      await prisma.playlist.deleteMany({ where: { id: clonedPlaylistId } });
    }
    await prisma.playlistCollaborator.deleteMany({
      where: { user: { email: { in: [ownerEmail, collabEmail] } } }
    });
    await prisma.playlistSong.deleteMany({
      where: { playlist: { user: { email: { in: [ownerEmail, collabEmail] } } } }
    });
    await prisma.playlist.deleteMany({
      where: { user: { email: { in: [ownerEmail, collabEmail] } } }
    });
    await prisma.song.deleteMany({
      where: { title: 'TEST_PLAYLIST_SONG' }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, collabEmail] } }
    });
    await prisma.$disconnect();
  });

  // 1. Tạo Playlist mới
  it('1. POST /api/playlists - Tạo playlist mới', async () => {
    const res = await request(app)
      .post('/api/playlists')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'TEST_PLAYLIST_TITLE',
        description: 'TEST_PLAYLIST_DESC'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Tạo Playlist thành công!');
    expect(res.body.playlist).toHaveProperty('title', 'TEST_PLAYLIST_TITLE');
    
    playlist = res.body.playlist;
  });

  // 2. Lấy danh sách playlist của user
  it('2. GET /api/playlists/user/:userId - Lấy danh sách playlist của owner', async () => {
    const res = await request(app)
      .get(`/api/playlists/user/${owner.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.find(p => p.id === playlist.id)).toBeDefined();
  });

  // 3. Thêm bài hát vào playlist (Owner thành công)
  it('3. POST /api/playlists/:id/songs - Owner thêm bài hát thành công', async () => {
    const res = await request(app)
      .post(`/api/playlists/${playlist.id}/songs`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ songId: testSong.id });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã thêm bài hát vào Playlist!');
  });

  // 4. Thêm bài hát vào playlist (Không phải owner thất bại)
  it('4. POST /api/playlists/:id/songs - Người dùng khác thêm bài hát thất bại (403)', async () => {
    const res = await request(app)
      .post(`/api/playlists/${playlist.id}/songs`)
      .set('Authorization', `Bearer ${collabToken}`)
      .send({ songId: testSong.id });

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  // 5. Cập nhật playlist thành collaborative
  it('5. PUT /api/playlists/:id - Chủ sở hữu cập nhật playlist thành collaborative', async () => {
    const res = await request(app)
      .put(`/api/playlists/${playlist.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        isCollaborative: true,
        isPublic: true
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.playlist.isCollaborative).toBe(true);
    expect(res.body.playlist.isPublic).toBe(true);
  });

  // 6. Thêm collaborator
  it('6. POST /api/playlists/:id/collaborators - Thêm người cộng tác', async () => {
    const res = await request(app)
      .post(`/api/playlists/${playlist.id}/collaborators`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ usernameOrEmail: collab.email });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã thêm người cộng tác thành công.');
  });

  // 7. Collaborator thêm nhạc
  it('7. POST /api/playlists/:id/songs - Collaborator thêm bài hát thành công', async () => {
    // Xóa bài hát trước đó để test collaborator thêm lại
    await prisma.playlistSong.deleteMany({ where: { playlistId: playlist.id } });

    const res = await request(app)
      .post(`/api/playlists/${playlist.id}/songs`)
      .set('Authorization', `Bearer ${collabToken}`)
      .send({ songId: testSong.id });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã thêm bài hát vào Playlist!');
  });

  // 8. Clone playlist công khai
  it('8. POST /api/playlists/:id/clone - Sao chép playlist công khai', async () => {
    const res = await request(app)
      .post(`/api/playlists/${playlist.id}/clone`)
      .set('Authorization', `Bearer ${collabToken}`);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe('Sao chép playlist thành công!');
    expect(res.body.playlist.title).toBe(`Bản sao của ${playlist.title}`);
    
    clonedPlaylistId = res.body.playlist.id;
  });

  // 9. Xóa bài hát khỏi playlist
  it('9. DELETE /api/playlists/:id/songs/:songId - Xóa bài hát khỏi playlist', async () => {
    const res = await request(app)
      .delete(`/api/playlists/${playlist.id}/songs/${testSong.id}`)
      .set('Authorization', `Bearer ${collabToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã xóa bài hát khỏi Playlist!');
  });

  // 10. Xóa người cộng tác khỏi playlist
  it('10. DELETE /api/playlists/:id/collaborators/:userId - Xóa người cộng tác', async () => {
    const res = await request(app)
      .delete(`/api/playlists/${playlist.id}/collaborators/${collab.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã xóa người cộng tác thành công.');
  });

  // 11. Xóa Playlist
  it('11. DELETE /api/playlists/:id - Xóa playlist', async () => {
    const res = await request(app)
      .delete(`/api/playlists/${playlist.id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Đã xóa Playlist!');

    // Xác nhận đã xóa hoàn toàn khỏi DB
    const deleted = await prisma.playlist.findUnique({ where: { id: playlist.id } });
    expect(deleted).toBeNull();
  });
});
