const request = require('supertest');
const app = require('../server');
const prisma = require('../db/index');
const jwt = require('jsonwebtoken');

describe('=== SoundClown Security and Access Control Tests ===', () => {
  const listenerEmail = 'listener_sec@testsecurity.com';
  const artistEmail = 'artist_sec@testsecurity.com';
  const adminEmail = 'admin_sec@testsecurity.com';

  let listener = null;
  let artist = null;
  let admin = null;

  let listenerToken = '';
  let artistToken = '';
  let adminToken = '';

  let testGenre = null;

  beforeAll(async () => {
    // 1. Clean up stale test data
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { follower: { email: { in: [listenerEmail, artistEmail, adminEmail] } } },
          { followee: { email: { in: [listenerEmail, artistEmail, adminEmail] } } }
        ]
      }
    });
    await prisma.songGenre.deleteMany({
      where: { genre: { genreTag: { in: ['TEST_SEC_GENRE', 'TEST_SEC_GENRE_UPD'] } } }
    });
    await prisma.genre.deleteMany({
      where: { genreTag: { in: ['TEST_SEC_GENRE', 'TEST_SEC_GENRE_UPD'] } }
    });
    await prisma.artist.deleteMany({
      where: { user: { email: { in: [listenerEmail, artistEmail, adminEmail] } } }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [listenerEmail, artistEmail, adminEmail] } }
    });

    // 2. Create users
    listener = await prisma.user.create({
      data: {
        email: listenerEmail,
        username: 'listener_sec',
        password: 'Password123!',
        isActive: true,
      }
    });
    listenerToken = jwt.sign({ userId: listener.id }, process.env.JWT_SECRET || 'secret');

    artist = await prisma.user.create({
      data: {
        email: artistEmail,
        username: 'artist_sec',
        password: 'Password123!',
        isActive: true,
        role: 'artist'
      }
    });
    artistToken = jwt.sign({ userId: artist.id }, process.env.JWT_SECRET || 'secret');

    // Create Artist record
    await prisma.artist.create({
      data: {
        userId: artist.id,
        status: 'active',
        followerCount: 0
      }
    });

    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: 'admin_sec',
        password: 'Password123!',
        isActive: true,
        isAdmin: true,
        role: 'admin'
      }
    });
    adminToken = jwt.sign({ userId: admin.id }, process.env.JWT_SECRET || 'secret');

    // Create a default test genre
    testGenre = await prisma.genre.create({
      data: { genreTag: 'TEST_SEC_GENRE' }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { follower: { email: { in: [listenerEmail, artistEmail, adminEmail] } } },
          { followee: { email: { in: [listenerEmail, artistEmail, adminEmail] } } }
        ]
      }
    });
    await prisma.songGenre.deleteMany({
      where: { genre: { genreTag: { in: ['TEST_SEC_GENRE', 'TEST_SEC_GENRE_UPD'] } } }
    });
    await prisma.genre.deleteMany({
      where: { genreTag: { in: ['TEST_SEC_GENRE', 'TEST_SEC_GENRE_UPD'] } }
    });
    await prisma.artist.deleteMany({
      where: { user: { email: { in: [listenerEmail, artistEmail, adminEmail] } } }
    });
    await prisma.user.deleteMany({
      where: { email: { in: [listenerEmail, artistEmail, adminEmail] } }
    });
    await prisma.$disconnect();
  });

  describe('Genre write actions authorization (POST/PUT/DELETE)', () => {
    it('1. POST /api/genres should reject unauthenticated clients with 401', async () => {
      const res = await request(app)
        .post('/api/genres')
        .send({ name: 'TEST_SEC_GENRE_NEW' });
      expect(res.statusCode).toBe(401);
    });

    it('2. POST /api/genres should reject non-admin users with 403', async () => {
      const res = await request(app)
        .post('/api/genres')
        .set('Authorization', `Bearer ${listenerToken}`)
        .send({ name: 'TEST_SEC_GENRE_NEW' });
      expect(res.statusCode).toBe(403);
    });

    it('3. POST /api/genres should allow administrators to create a genre', async () => {
      const res = await request(app)
        .post('/api/genres')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'TEST_SEC_GENRE_NEW' });
      expect([201, 409]).toContain(res.statusCode); // 409 if run repeatedly, but it will be 201 first
      if (res.statusCode === 201) {
        expect(res.body.genre.genreTag).toBe('TEST_SEC_GENRE_NEW');
        // Clean up created genre
        await prisma.genre.delete({ where: { id: res.body.genre.id } });
      }
    });

    it('4. PUT /api/genres/:id should reject unauthenticated clients with 401', async () => {
      const res = await request(app)
        .put(`/api/genres/${testGenre.id}`)
        .send({ name: 'TEST_SEC_GENRE_UPD' });
      expect(res.statusCode).toBe(401);
    });

    it('5. PUT /api/genres/:id should reject non-admin users with 403', async () => {
      const res = await request(app)
        .put(`/api/genres/${testGenre.id}`)
        .set('Authorization', `Bearer ${listenerToken}`)
        .send({ name: 'TEST_SEC_GENRE_UPD' });
      expect(res.statusCode).toBe(403);
    });

    it('6. PUT /api/genres/:id should allow administrators to edit genre', async () => {
      const res = await request(app)
        .put(`/api/genres/${testGenre.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'TEST_SEC_GENRE_UPD' });
      expect(res.statusCode).toBe(200);
      expect(res.body.genre.genreTag).toBe('TEST_SEC_GENRE_UPD');
    });

    it('7. DELETE /api/genres/:id should reject unauthenticated clients with 401', async () => {
      const res = await request(app)
        .delete(`/api/genres/${testGenre.id}`);
      expect(res.statusCode).toBe(401);
    });

    it('8. DELETE /api/genres/:id should reject non-admin users with 403', async () => {
      const res = await request(app)
        .delete(`/api/genres/${testGenre.id}`)
        .set('Authorization', `Bearer ${listenerToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('9. DELETE /api/genres/:id should allow administrators to delete genre', async () => {
      const res = await request(app)
        .delete(`/api/genres/${testGenre.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      
      const check = await prisma.genre.findUnique({ where: { id: testGenre.id } });
      expect(check).toBeNull();
    });
  });

  describe('Artist followers list privacy (GET /api/artists/:id/followers)', () => {
    it('1. GET /api/artists/:id/followers should reject unauthenticated clients with 401', async () => {
      const res = await request(app)
        .get(`/api/artists/${artist.id}/followers`);
      expect(res.statusCode).toBe(401);
    });

    it('2. GET /api/artists/:id/followers should reject another non-admin user with 403', async () => {
      const res = await request(app)
        .get(`/api/artists/${artist.id}/followers`)
        .set('Authorization', `Bearer ${listenerToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('3. GET /api/artists/:id/followers should permit the artist themselves with 200', async () => {
      const res = await request(app)
        .get(`/api/artists/${artist.id}/followers`)
        .set('Authorization', `Bearer ${artistToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('followers');
    });

    it('4. GET /api/artists/:id/followers should permit administrators with 200', async () => {
      const res = await request(app)
        .get(`/api/artists/${artist.id}/followers`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('followers');
    });
  });
});
