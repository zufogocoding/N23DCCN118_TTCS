/**
 * Seed Full: Tạo dữ liệu mẫu để test mọi tính năng
 * Chạy: node scripts/seedFull.js
 *
 * Tạo: users (admin + artist + regular), artists, songs (WAV), albums,
 *       playlists, interactions, follows, charts, reports, artist requests
 *
 * Mật khẩu chung: 123456
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const prisma = require('../db/index');

const PASSWORD = '123456';
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

// ─────────── helpers ───────────

function createWavBuffer(durationMs) {
  const sampleRate = 44100;
  const numChannels = 2;
  const bitsPerSample = 16;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const frameSize = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * frameSize;
  const buf = Buffer.alloc(44 + dataSize);

  let off = 0;
  buf.write('RIFF', off); off += 4;
  buf.writeUInt32LE(36 + dataSize, off); off += 4;
  buf.write('WAVE', off); off += 4;

  buf.write('fmt ', off); off += 4;
  buf.writeUInt32LE(16, off); off += 4;
  buf.writeUInt16LE(1, off); off += 2;     // PCM
  buf.writeUInt16LE(numChannels, off); off += 2;
  buf.writeUInt32LE(sampleRate, off); off += 4;
  buf.writeUInt32LE(sampleRate * frameSize, off); off += 4;
  buf.writeUInt16LE(frameSize, off); off += 2;
  buf.writeUInt16LE(bitsPerSample, off); off += 2;

  buf.write('data', off); off += 4;
  buf.writeUInt32LE(dataSize, off); off += 4;

  return buf;
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function pickN(arr, n) {
  const s = [...arr].sort(() => Math.random() - 0.5);
  return s.slice(0, Math.min(n, arr.length));
}

function progressBar(current, total, label) {
  const w = 30;
  const pct = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * w);
  process.stdout.write(`\r  ${'█'.repeat(filled)}${'░'.repeat(w - filled)} ${pct}% ${label || ''}`);
  if (current >= total) process.stdout.write('\n');
}

// ─────────── data ───────────

const ADMIN_USER = { username: 'admin', displayName: 'Admin', email: 'admin@soundclown.com', country: 'Việt Nam', dob: '1990-01-01', isAdmin: true, role: 'admin' };

const ARTIST_USERS = [
  { username: 'son_tung_mtp', displayName: 'Sơn Tùng M-TP', email: 'sontung@demo.com', country: 'Việt Nam', dob: '1994-07-05' },
  { username: 'minh_hang', displayName: 'Minh Hằng', email: 'minhhang@demo.com', country: 'Việt Nam', dob: '1995-12-18' },
  { username: 'hoang_thuy_linh', displayName: 'Hoàng Thùy Linh', email: 'hoangthuylinh@demo.com', country: 'Việt Nam', dob: '1990-08-11' },
  { username: 'den_vau', displayName: 'Đen Vâu', email: 'denvau@demo.com', country: 'Việt Nam', dob: '1989-05-13' },
];

const REGULAR_USERS = [
  { username: 'nguyen_van_a', displayName: 'Nguyễn Văn An', email: 'nguyenvana@demo.com', country: 'Việt Nam', dob: '2000-03-15' },
  { username: 'tran_thi_b', displayName: 'Trần Thị Bích', email: 'tranthib@demo.com', country: 'Việt Nam', dob: '1999-07-22' },
  { username: 'le_hoang_c', displayName: 'Lê Hoàng Cường', email: 'lehoangc@demo.com', country: 'Việt Nam', dob: '2001-01-10' },
  { username: 'pham_duy_d', displayName: 'Phạm Duy Đạt', email: 'phamduyd@demo.com', country: 'Việt Nam', dob: '1998-11-05' },
  { username: 'vu_thi_e', displayName: 'Vũ Thị Phương', email: 'vuthie@demo.com', country: 'Việt Nam', dob: '2000-09-30' },
];

const SONG_TITLES = [
  { title: 'Chạy Ngay Đi', artist: 'son_tung_mtp', genre: 'V-Pop', durationMs: 240000 },
  { title: 'Hãy Trao Cho Anh', artist: 'son_tung_mtp', genre: 'V-Pop', durationMs: 260000 },
  { title: 'Cơn Mưa Ngang Qua', artist: 'son_tung_mtp', genre: 'Nhạc Trẻ', durationMs: 210000 },
  { title: 'Người Tôi Yêu', artist: 'minh_hang', genre: 'Pop', durationMs: 230000 },
  { title: 'Ngày Mới', artist: 'minh_hang', genre: 'Pop', durationMs: 200000 },
  { title: 'Yêu Thương Tan Vỡ', artist: 'minh_hang', genre: 'Bolero', durationMs: 280000 },
  { title: 'Để Mị Nói Cho Mà Nghe', artist: 'hoang_thuy_linh', genre: 'V-Pop', durationMs: 250000 },
  { title: 'Bánh Trôi Nước', artist: 'hoang_thuy_linh', genre: 'Nhạc Trẻ', durationMs: 220000 },
  { title: 'Tứ Phủ', artist: 'hoang_thuy_linh', genre: 'V-Pop', durationMs: 310000 },
  { title: 'Đi Về Nhà', artist: 'den_vau', genre: 'Rap Việt', durationMs: 270000 },
  { title: 'Bài Này Chill Phết', artist: 'den_vau', genre: 'Rap', durationMs: 240000 },
  { title: 'Mang Tiền Về Cho Mẹ', artist: 'den_vau', genre: 'Rap Việt', durationMs: 290000 },
];

const ALBUMS = [
  { title: 'Chạy Ngay Đi (Single)', artist: 'son_tung_mtp', songIndices: [0] },
  { title: 'Love Collection', artist: 'minh_hang', songIndices: [3, 4] },
  { title: 'Hoàng Thùy Linh Vol.1', artist: 'hoang_thuy_linh', songIndices: [6, 7, 8] },
  { title: 'Mang Tiền Về Cho Mẹ (Single)', artist: 'den_vau', songIndices: [11] },
];

const PLAYLIST_TEMPLATES = [
  { title: 'Nhạc Hot Tháng Này', description: 'Tuyển tập các bài hát được yêu thích nhất', isSystem: true, isOnHomepage: true, displayOrder: 1, category: 'hot' },
  { title: 'V-Pop Hay Nhất', description: 'Những bản hit V-Pop đình đám', isSystem: true, isOnHomepage: true, displayOrder: 2, category: 'vpop' },
  { title: 'Rap Việt Cày Bão', description: 'Rap Việt chất nhất', isSystem: true, isOnHomepage: false, displayOrder: 3, category: 'rap' },
];

const REPORT_REASONS = ['Spam', 'Nội dung không phù hợp', 'Vi phạm bản quyền', 'Khác'];

// ─────────── phases ───────────

async function ensureUploadDirs() {
  for (const dir of ['songs', 'covers', 'avatars', 'banners', 'album-covers']) {
    const p = path.join(UPLOADS_DIR, dir);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  }
}

async function seedGenres() {
  console.log('\n🏷️  Genres...');
  const GENRES = [
    'Pop', 'Rock', 'R&B', 'Hip-Hop', 'Rap', 'Jazz', 'Blues', 'Country',
    'EDM', 'House', 'Techno', 'Trance', 'Dubstep', 'Indie', 'Alternative',
    'Metal', 'Punk', 'Reggae', 'Soul', 'Funk', 'Classical', 'Lo-fi',
    'Acoustic', 'Latin', 'K-Pop', 'J-Pop', 'Gospel', 'Disco', 'Synthwave',
    'Bolero', 'Nhạc Trữ Tình', 'Nhạc Trẻ', 'V-Pop', 'Nhạc Vàng',
    'Cải Lương', 'Dân Ca', 'Nhạc Cách Mạng', 'Nhạc Phim Việt', 'Rap Việt',
  ];
  let c = 0;
  for (const tag of GENRES) {
    await prisma.genre.upsert({ where: { genreTag: tag }, update: {}, create: { genreTag: tag } });
    c++;
  }
  console.log(`  ✅ ${c} genres`);

  // charts
  const CHARTS = [
    { title: 'Top 50 Ngày', chartType: 'DAILY' },
    { title: 'Top 50 Tuần', chartType: 'WEEKLY' },
    { title: 'Top 50 Tháng', chartType: 'MONTHLY' },
  ];
  for (const c of CHARTS) {
    const exists = await prisma.chart.findFirst({ where: { chartType: c.chartType } });
    if (!exists) await prisma.chart.create({ data: c });
  }
  console.log(`  ✅ ${CHARTS.length} charts`);
}

async function seedUsers() {
  console.log('\n👤 Users...');
  const hashed = await bcrypt.hash(PASSWORD, 10);
  const all = [ADMIN_USER, ...ARTIST_USERS, ...REGULAR_USERS];
  let created = 0;
  for (const u of all) {
    const exists = await prisma.user.findFirst({ where: { OR: [{ email: u.email }, { username: u.username }] } });
    if (exists) continue;
    await prisma.user.create({
      data: {
        username: u.username, displayName: u.displayName, email: u.email,
        password: hashed, country: u.country, dob: new Date(u.dob),
        isVerified: true, isActive: true,
        role: u.role || 'user', isAdmin: u.isAdmin || false,
      },
    });
    created++;
  }
  console.log(`  ✅ ${created} users (total: ${all.length})`);
}

async function seedArtists() {
  console.log('\n🎤 Artists...');
  let c = 0;
  for (const au of ARTIST_USERS) {
    const user = await prisma.user.findFirst({ where: { username: au.username } });
    if (!user) continue;
    const exists = await prisma.artist.findUnique({ where: { userId: user.id } });
    if (exists) continue;
    await prisma.artist.create({ data: { userId: user.id, verifiedTick: true, status: 'active' } });
    c++;
  }
  console.log(`  ✅ ${c} artists`);
}

async function seedSongs() {
  console.log('\n🎵 Songs + audio files...');
  const songsDir = path.join(UPLOADS_DIR, 'songs');
  let c = 0;

  for (const st of SONG_TITLES) {
    const artist = await prisma.user.findFirst({ where: { username: st.artist } });
    if (!artist) continue;
    const genre = await prisma.genre.findUnique({ where: { genreTag: st.genre } });
    if (!genre) continue;

    const existing = await prisma.song.findFirst({ where: { title: st.title, uploadedById: artist.id } });
    if (existing) { c++; continue; }

    const fileName = `seed_${Date.now()}_${st.title.replace(/[^a-zA-Z0-9]/g, '_')}.wav`;
    const filePath = path.join(songsDir, fileName);
    const wav = createWavBuffer(st.durationMs);
    fs.writeFileSync(filePath, wav);

    const song = await prisma.song.create({
      data: {
        title: st.title,
        artistName: artist.displayName,
        uploadedById: artist.id,
        durationMs: st.durationMs,
        audioUrl: `/uploads/songs/${fileName}`,
        status: 'approved',
        tempo: 100 + rand(-20, 20),
        energy: Math.random() * 0.5 + 0.3,
        danceability: Math.random() * 0.5 + 0.3,
        playCount: rand(10, 500),
        genres: { create: { genreId: genre.id } },
        artists: { create: { artistId: artist.id } },
      },
    });

    // Approve immediately via direct DB update
    if (song.status !== 'approved') {
      await prisma.song.update({ where: { id: song.id }, data: { status: 'approved' } });
    }
    c++;
    progressBar(c, SONG_TITLES.length, `${st.title}`);
  }
  console.log(`  ✅ ${c} songs`);
}

async function seedAlbums() {
  console.log('\n💿 Albums...');
  let c = 0;
  for (const a of ALBUMS) {
    const artist = await prisma.user.findFirst({ where: { username: a.artist } });
    if (!artist) continue;
    const artistRec = await prisma.artist.findUnique({ where: { userId: artist.id } });
    if (!artistRec) continue;

    const existing = await prisma.album.findFirst({ where: { title: a.title, artistId: artist.id } });
    if (existing) { c++; continue; }

    const album = await prisma.album.create({
      data: {
        title: a.title,
        status: 'released',
        artistId: artist.id,
        releasedDate: new Date(),
      },
    });

    const songs = await prisma.song.findMany({
      where: { uploadedById: artist.id, isDeleted: false },
    });

    for (let i = 0; i < songs.length; i++) {
      const clash = await prisma.albumSong.findFirst({ where: { albumId: album.id, songId: songs[i].id } });
      if (!clash) {
        await prisma.albumSong.create({ data: { albumId: album.id, songId: songs[i].id, position: i } });
      }
    }
    c++;
  }
  console.log(`  ✅ ${c} albums`);
}

async function seedPlaylists() {
  console.log('\n📋 Playlists...');
  const songs = await prisma.song.findMany({ where: { isDeleted: false }, take: 50 });
  const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
  const users = await prisma.user.findMany({ take: 5, skip: 1 }); // skip admin

  let c = 0;
  for (const pt of PLAYLIST_TEMPLATES) {
    const exists = await prisma.playlist.findFirst({ where: { title: pt.title, userId: admin.id, isSystem: true } });
    if (exists) continue;
    const p = await prisma.playlist.create({
      data: {
        title: pt.title, description: pt.description,
        playlistUrl: `${pt.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        isPublic: true, isSystem: pt.isSystem, isOnHomepage: pt.isOnHomepage,
        displayOrder: pt.displayOrder, category: pt.category,
        userId: admin.id,
      },
    });
    const picked = pickN(songs, rand(3, 6));
    for (let i = 0; i < picked.length; i++) {
      await prisma.playlistSong.upsert({
        where: { playlistId_songId: { playlistId: p.id, songId: picked[i].id } },
        update: {}, create: { playlistId: p.id, songId: picked[i].id, sortOrder: i },
      });
    }
    c++;
  }

  // user playlists
  for (const u of users) {
    const count = rand(1, 2);
    for (let pi = 0; pi < count; pi++) {
      const name = pick(['Nhạc Chill', 'Gym Hype', 'Nhạc Buồn', 'Đi Chơi', 'Tập Trung', 'Lofi Study', 'Phòng Trà', 'Cuối Tuần']);
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${u.id}-${Date.now()}-${rand(100, 999)}`;
      try {
        const p = await prisma.playlist.create({
          data: {
            title: name, description: `Playlist của ${u.displayName}`,
            playlistUrl: slug, isPublic: Math.random() > 0.2, userId: u.id,
          },
        });
        const picked = pickN(songs, rand(2, 5));
        for (let i = 0; i < picked.length; i++) {
          await prisma.playlistSong.upsert({
            where: { playlistId_songId: { playlistId: p.id, songId: picked[i].id } },
            update: {}, create: { playlistId: p.id, songId: picked[i].id, sortOrder: i },
          });
        }
        c++;
      } catch (e) { /* skip dupe slug */ }
    }
  }
  console.log(`  ✅ ${c} playlists`);
}

async function seedInteractions() {
  console.log('\n❤️  Interactions (listens + likes)...');
  const songs = await prisma.song.findMany({ where: { isDeleted: false } });
  const users = await prisma.user.findMany();
  let total = 0;

  for (const song of songs) {
    const n = rand(5, 20);
    for (let i = 0; i < n; i++) {
      const user = pick(users);
      const daysAgo = rand(0, 30);
      const ts = new Date(Date.now() - daysAgo * 86400000 - rand(0, 86399) * 1000);
      const isSkipped = Math.random() < 0.15;
      const cr = isSkipped ? Math.random() * 0.3 + 0.05 : Math.random() * 0.5 + 0.5;
      const isLiked = !isSkipped && cr > 0.7 && Math.random() < 0.3;
      const dur = Math.floor((song.durationMs || 200000) * cr);

      try {
        await prisma.interaction.create({
          data: { userId: user.id, songId: song.id, timeStamp: ts, completionRate: cr, isSkipped, isLiked, durationPlayed: dur },
        });
        total++;
      } catch (e) { /* skip dupe */ }
    }
    progressBar(songs.indexOf(song) + 1, songs.length, `${total} interactions`);
  }

  // likes (separate from interaction likes for SongLike table)
  let likes = 0;
  for (const user of users) {
    const liked = pickN(songs, rand(2, 8));
    for (const song of liked) {
      try {
        await prisma.songLike.upsert({
          where: { userId_songId: { userId: user.id, songId: song.id } },
          update: {}, create: { userId: user.id, songId: song.id },
        });
        likes++;
      } catch (e) { /* skip */ }
    }
  }

  console.log(`\n  ✅ ${total} listens, ${likes} likes`);
}

async function seedFollows() {
  console.log('\n👥 Follows...');
  const artists = await prisma.artist.findMany();
  const users = await prisma.user.findMany();
  let c = 0;

  for (const artist of artists) {
    const followers = pickN(users, rand(1, 5));
    for (const f of followers) {
      if (f.id === artist.userId) continue;
      try {
        await prisma.follow.upsert({
          where: { followerId_followeeId: { followerId: f.id, followeeId: artist.userId } },
          update: {}, create: { followerId: f.id, followeeId: artist.userId },
        });
        c++;
      } catch (e) { /* skip */ }
    }
    const count = await prisma.follow.count({ where: { followeeId: artist.userId } });
    await prisma.artist.update({ where: { userId: artist.userId }, data: { followerCount: count } });
  }
  console.log(`  ✅ ${c} follows`);
}

async function seedCharts() {
  console.log('\n📊 Charts...');
  const charts = await prisma.chart.findMany();
  const songs = await prisma.song.findMany({ where: { isDeleted: false }, orderBy: { playCount: 'desc' }, take: 20 });

  for (const chart of charts) {
    await prisma.chartSong.deleteMany({ where: { chartId: chart.id } });
    const picked = pickN(songs, Math.min(10, songs.length));
    for (let i = 0; i < picked.length; i++) {
      await prisma.chartSong.upsert({
        where: { chartId_songId: { chartId: chart.id, songId: picked[i].id } },
        update: { rank: i + 1, totalScore: (picked.length - i) * 10 },
        create: { chartId: chart.id, songId: picked[i].id, rank: i + 1, totalScore: (picked.length - i) * 10 },
      });
    }
  }
  console.log(`  ✅ ${charts.length} charts populated`);
}

async function seedArtistRequests() {
  console.log('\n📝 Artist Requests...');
  const pendingUser = await prisma.user.findFirst({ where: { username: 'nguyen_van_a' } });
  const rejectedUser = await prisma.user.findFirst({ where: { username: 'le_hoang_c' } });

  if (pendingUser) {
    const exists = await prisma.artistRequest.findUnique({ where: { userId: pendingUser.id } });
    if (!exists) {
      await prisma.artistRequest.create({
        data: {
          userId: pendingUser.id, artistName: 'Nguyễn Văn An (NVA)',
          idCardUrl: '/uploads/avatars/dummy_id.jpg',
          demoTrackUrl: '/uploads/songs/dummy_demo.wav',
          status: 'PENDING',
        },
      });
    }
  }

  if (rejectedUser) {
    const exists = await prisma.artistRequest.findUnique({ where: { userId: rejectedUser.id } });
    if (!exists) {
      await prisma.artistRequest.create({
        data: {
          userId: rejectedUser.id, artistName: 'Lê Hoàng Cường (LHC)',
          idCardUrl: '/uploads/avatars/dummy_id2.jpg',
          demoTrackUrl: '/uploads/songs/dummy_demo2.wav',
          status: 'REJECTED', rejectionReason: 'Demo track không đạt yêu cầu chất lượng',
        },
      });
    }
  }
  console.log('  ✅ artist requests');
}

async function seedReports() {
  console.log('\n🚩 Reports...');
  const reporter = await prisma.user.findFirst({ where: { username: 'vu_thi_e' } });
  const songs = await prisma.song.findMany({ where: { isDeleted: false }, take: 3 });
  if (!reporter || songs.length === 0) return;

  for (const song of songs) {
    const exists = await prisma.report.findFirst({
      where: { reporterId: reporter.id, targetType: 'SONG', targetId: song.id },
    });
    if (exists) continue;
    await prisma.report.create({
      data: {
        reporterId: reporter.id, targetType: 'SONG', targetId: song.id,
        reason: pick(REPORT_REASONS),
        description: `Báo cáo bài hát "${song.title}" vì lý do ${pick(REPORT_REASONS).toLowerCase()}`,
        status: pick(['PENDING', 'RESOLVED']),
      },
    });
  }
  console.log('  ✅ reports');
}

// ─────────── main ───────────

async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   🌱 SEED FULL - DỮ LIỆU TEST TOÀN DIỆN  ║');
  console.log('╚═══════════════════════════════════════════╝');

  try {
    await ensureUploadDirs();
    await seedGenres();
    await seedUsers();
    await seedArtists();
    await seedSongs();
    await seedAlbums();
    await seedPlaylists();
    await seedInteractions();
    await seedFollows();
    await seedCharts();
    await seedArtistRequests();
    await seedReports();

    // Summary
    const counts = {
      users: await prisma.user.count(),
      artists: await prisma.artist.count(),
      songs: await prisma.song.count({ where: { isDeleted: false } }),
      albums: await prisma.album.count(),
      playlists: await prisma.playlist.count({ where: { isSystem: false } }),
      systemPlaylists: await prisma.playlist.count({ where: { isSystem: true } }),
      interactions: await prisma.interaction.count(),
      likes: await prisma.songLike.count(),
      follows: await prisma.follow.count(),
      charts: await prisma.chart.count(),
      reports: await prisma.report.count(),
      artistRequests: await prisma.artistRequest.count(),
    };

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║          🎉 HOÀN TẤT SEED!               ║');
    console.log('╠═══════════════════════════════════════════╣');
    for (const [k, v] of Object.entries(counts)) {
      console.log(`  ${k.padEnd(20)} ${String(v).padStart(6)}`);
    }
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`\n🔑 Mật khẩu tất cả users: ${PASSWORD}`);
    console.log('   Admin: admin@soundclown.com\n');
  } catch (err) {
    console.error('\n❌ Lỗi:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
