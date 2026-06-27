/**
 * ai-test-dataset.js
 * ==================
 * Tạo dataset kiểm thử có kiểm soát cho hệ thống AI SoundWave.
 *
 * Dataset gồm:
 *  - 120 bài hát mock phân chia rõ ràng vào 5 genre cluster
 *  - 5 test users với hành vi nghe nhạc được thiết kế rõ ràng
 *  - Interaction patterns (play, like, skip) đúng với kịch bản kiểm thử
 *
 * Dữ liệu này TÁCH BIỆT với data production (prefix TEST_ để nhận diện).
 * Xóa bằng cách chạy lại với flag --cleanup.
 *
 * Usage:
 *   node tests/ai-test-dataset.js          # Tạo dataset
 *   node tests/ai-test-dataset.js --cleanup # Xóa toàn bộ dữ liệu test
 */

require('dotenv').config();
const prisma = require('../db/index.js');

// ─────────────────────────────────────────────────────────────────────────────
// CẤU HÌNH GENRE CLUSTERS
// Mỗi cluster có audio features đặc trưng rõ ràng để test Content-Based
// ─────────────────────────────────────────────────────────────────────────────
const GENRE_CLUSTERS = {
  Pop: {
    genreTags: ['Pop', 'V-Pop', 'K-Pop'],
    features: { tempo: 115, energy: 0.68, danceability: 0.72 },
    variance: { tempo: 8, energy: 0.07, danceability: 0.07 },
    count: 24,
  },
  Rock: {
    genreTags: ['Rock', 'Alternative', 'Metal'],
    features: { tempo: 130, energy: 0.88, danceability: 0.48 },
    variance: { tempo: 10, energy: 0.06, danceability: 0.06 },
    count: 24,
  },
  Lofi: {
    genreTags: ['Lo-fi', 'Acoustic', 'Indie'],
    features: { tempo: 72, energy: 0.28, danceability: 0.38 },
    variance: { tempo: 6, energy: 0.06, danceability: 0.06 },
    count: 24,
  },
  HipHop: {
    genreTags: ['Hip-Hop', 'Rap', 'Rap Việt'],
    features: { tempo: 92, energy: 0.72, danceability: 0.82 },
    variance: { tempo: 7, energy: 0.06, danceability: 0.06 },
    count: 24,
  },
  EDM: {
    genreTags: ['EDM', 'House', 'Trance'],
    features: { tempo: 128, energy: 0.90, danceability: 0.92 },
    variance: { tempo: 5, energy: 0.05, danceability: 0.05 },
    count: 24,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 5 TEST USER PROFILES
// ─────────────────────────────────────────────────────────────────────────────
const TEST_USERS = [
  {
    username: 'TEST_user_pop_fan',
    email: 'test.pop.fan@soundwave.test',
    displayName: '[TEST] Pop Fan',
    profile: 'Pop',        // Cluster ưa thích
    likeGenres: ['Pop'],
    skipGenres: ['Metal', 'EDM'],
    listenCount: 70,
    likeCount: 25,
  },
  {
    username: 'TEST_user_rock_fan',
    email: 'test.rock.fan@soundwave.test',
    displayName: '[TEST] Rock Fan',
    profile: 'Rock',
    likeGenres: ['Rock'],
    skipGenres: ['Lo-fi', 'K-Pop'],
    listenCount: 70,
    likeCount: 25,
  },
  {
    username: 'TEST_user_lofi_fan',
    email: 'test.lofi.fan@soundwave.test',
    displayName: '[TEST] Lo-fi Fan',
    profile: 'Lofi',
    likeGenres: ['Lo-fi', 'Acoustic'],
    skipGenres: ['Metal', 'Trance'],
    listenCount: 70,
    likeCount: 25,
  },
  {
    username: 'TEST_user_diverse',
    email: 'test.diverse@soundwave.test',
    displayName: '[TEST] Diverse Listener',
    profile: 'Diverse',    // Like đồng đều nhiều thể loại
    likeGenres: ['Pop', 'Hip-Hop', 'Lo-fi'],
    skipGenres: [],
    listenCount: 60,
    likeCount: 30,
  },
  {
    username: 'TEST_user_cold_start',
    email: 'test.cold.start@soundwave.test',
    displayName: '[TEST] Cold Start User',
    profile: 'ColdStart',  // Không có interaction → nhận trending
    likeGenres: [],
    skipGenres: [],
    listenCount: 0,
    likeCount: 0,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
function randFloat(base, variance, clamp01 = true) {
  const v = (Math.random() * 2 - 1) * variance;
  const val = parseFloat((base + v).toFixed(3));
  return clamp01 ? Math.min(1, Math.max(0, val)) : val;
}
function randInt(base, variance) {
  const v = Math.floor((Math.random() * 2 - 1) * variance);
  return base + v;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}
function log(msg) { process.stdout.write(msg + '\n'); }
function logStep(n, total, label) {
  const pct = Math.round((n / total) * 100);
  const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
  process.stdout.write(`\r  [${bar}] ${pct}% ${label}   `);
  if (n >= total) process.stdout.write('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────
async function cleanup() {
  log('\n🧹 Dọn dẹp dữ liệu kiểm thử cũ...');

  // Xóa users test (cascade xóa interactions, likes, playlists)
  const testUsers = await prisma.user.findMany({
    where: { username: { startsWith: 'TEST_' } },
    select: { id: true, username: true },
  });
  if (testUsers.length > 0) {
    // Xóa interactions trước (không có cascade từ user?)
    await prisma.interaction.deleteMany({ where: { userId: { in: testUsers.map(u => u.id) } } });
    await prisma.songLike.deleteMany({ where: { userId: { in: testUsers.map(u => u.id) } } });
    await prisma.user.deleteMany({ where: { id: { in: testUsers.map(u => u.id) } } });
    log(`  ✅ Đã xóa ${testUsers.length} test users.`);
  }

  // Xóa songs test (cascade xóa songGenre, interactions, songLike)
  const testSongs = await prisma.song.findMany({
    where: { title: { startsWith: 'TEST_' } },
    select: { id: true },
  });
  if (testSongs.length > 0) {
    const ids = testSongs.map(s => s.id);
    await prisma.interaction.deleteMany({ where: { songId: { in: ids } } });
    await prisma.songLike.deleteMany({ where: { songId: { in: ids } } });
    await prisma.songGenre.deleteMany({ where: { songId: { in: ids } } });
    await prisma.song.deleteMany({ where: { id: { in: ids } } });
    log(`  ✅ Đã xóa ${testSongs.length} test songs.`);
  }

  if (testUsers.length === 0 && testSongs.length === 0) {
    log('  ℹ️  Không có dữ liệu test nào để xóa.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1: Tạo Genre nếu chưa có
// ─────────────────────────────────────────────────────────────────────────────
async function ensureGenres() {
  log('\n📌 PHASE 1: Kiểm tra và tạo genres...');
  const allTags = Object.values(GENRE_CLUSTERS).flatMap(c => c.genreTags);
  const uniqueTags = [...new Set(allTags)];

  let created = 0;
  for (const tag of uniqueTags) {
    const existing = await prisma.genre.findFirst({ where: { genreTag: tag } });
    if (!existing) {
      await prisma.genre.create({ data: { genreTag: tag } });
      created++;
    }
  }
  const allGenres = await prisma.genre.findMany({
    where: { genreTag: { in: uniqueTags } },
    select: { id: true, genreTag: true },
  });
  log(`  ✅ Genres sẵn sàng (${created} mới tạo). Tổng: ${allGenres.length} genres dùng cho test.`);
  return Object.fromEntries(allGenres.map(g => [g.genreTag, g.id]));
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2: Tạo bài hát mock
// ─────────────────────────────────────────────────────────────────────────────
async function createSongs(genreMap) {
  log('\n🎵 PHASE 2: Tạo bài hát mock...');

  const createdSongs = {}; // { clusterName: [songId, ...] }
  const songTitles = {
    Pop: ['Ánh Sáng Mùa Hè', 'Yêu Xa', 'Nhớ Mãi', 'Cô Ấy', 'Nụ Cười', 'Đêm Nay', 'Thế Giới', 'Tình Yêu',
          'Mùa Thu', 'Nắng Sớm', 'Giấc Mơ', 'Bầu Trời', 'Hoa Hướng Dương', 'Câu Chuyện', 'Kí Ức', 'Gặp Gỡ',
          'Heartbeat', 'Shine On', 'Dancing Stars', 'Dream Pop', 'Candy Love', 'Summer Hits', 'Neon Lights', 'Pop Anthem'],
    Rock: ['Bức Tường Đá', 'Tiếng Sét', 'Đêm Tối', 'Chiến Binh', 'Lửa Cháy', 'Vỡ Tan', 'Gào Thét', 'Nổi Loạn',
           'Rage Machine', 'Iron Will', 'Storm Rising', 'Broken Glass', 'Electric Storm', 'Dead Zone', 'Rock Solid', 'Fist Fight',
           'Scream Out', 'Metal Heart', 'Rock Bottom', 'Power Surge', 'Shockwave', 'Thunder Road', 'Punk Spirit', 'Hard Line'],
    Lofi: ['Cà Phê Sáng', 'Mưa Rơi', 'Chiều Tà', 'Góc Nhỏ', 'Yên Bình', 'Ngủ Quên', 'Giọt Sương', 'Nhẹ Nhàng',
           'Study Beats', 'Rainy Day', 'Cozy Corner', 'Soft Glow', 'Gentle Flow', 'Slow Morning', 'Calm Waters', 'Night Haze',
           'Lo-fi Dreams', 'Chill Vibes', 'Quiet Hours', 'Fade Away', 'Warmth', 'Dusk Beats', 'Mellow Notes', 'Sleepy Town'],
    HipHop: ['Đường Phố', 'Lời Rap', 'Nhịp Đập', 'Mic Drop', 'Street Life', 'Bars & Beats', 'Flow State', 'Real Talk',
             'Freestyle', 'Block Party', 'Hustle Hard', 'Trap King', 'City Vibes', 'Underground', 'King Pin', 'Raw Energy',
             'Money Moves', 'No Cap', 'Lit AF', 'Big Drip', 'Grind Mode', 'Hood Rich', 'Street Cred', 'Rap God'],
    EDM: ['Siêu Năng Lượng', 'Vũ Trụ', 'Nổ Tung', 'Điện Tử', 'Bass Drop', 'Rave Nation', 'Pulse', 'Frequency',
           'Drop Zone', 'Voltage', 'Circuit Breaker', 'Warp Drive', 'Laser Show', 'Digital Rush', 'Synth Wave', 'Apex',
           'Core Drop', 'Ultra Rave', 'Power Plant', 'Techno Surge', 'House Music', 'Trance State', 'Festival Banger', 'Club Anthem'],
  };

  let totalCreated = 0;
  const allClusters = Object.entries(GENRE_CLUSTERS);

  for (const [clusterName, cluster] of allClusters) {
    createdSongs[clusterName] = [];
    const titles = songTitles[clusterName];

    for (let i = 0; i < cluster.count; i++) {
      const title = `TEST_${titles[i] || `${clusterName}_Song_${i + 1}`}`;
      const tempo = randFloat(cluster.features.tempo, cluster.variance.tempo, false);
      const energy = randFloat(cluster.features.energy, cluster.variance.energy, true);
      const danceability = randFloat(cluster.features.danceability, cluster.variance.danceability, true);

      // Tạo song
      const song = await prisma.song.create({
        data: {
          title,
          artistName: `TEST_Artist_${clusterName}`,
          audioUrl: `/uploads/audio/test_${clusterName.toLowerCase()}_${i + 1}.mp3`,
          coverArtUrl: null,
          durationMs: randInt(210000, 30000), // ~3.5 phút ± 30s
          tempo,
          energy,
          danceability,
          status: 'approved',
          isDeleted: false,
        },
      });

      // Gắn genres — mỗi bài có 1 primary + đôi khi 1 secondary genre
      const primaryTag = pick(cluster.genreTags);
      const songGenreData = [{ songId: song.id, genreId: genreMap[primaryTag] }];
      // 40% cơ hội có secondary genre trong cluster
      if (Math.random() < 0.4) {
        const secondaryTag = cluster.genreTags.find(t => t !== primaryTag);
        if (secondaryTag && genreMap[secondaryTag]) {
          songGenreData.push({ songId: song.id, genreId: genreMap[secondaryTag] });
        }
      }
      await prisma.songGenre.createMany({ data: songGenreData, skipDuplicates: true });

      createdSongs[clusterName].push(song.id);
      totalCreated++;
      logStep(totalCreated, Object.values(GENRE_CLUSTERS).reduce((s, c) => s + c.count, 0),
              `${title.slice(0, 30)}`);
    }
  }

  log(`  ✅ Đã tạo ${totalCreated} bài hát mock (${Object.values(GENRE_CLUSTERS).map(c => c.count).join('/')} per cluster).`);
  return createdSongs;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: Tạo test users
// ─────────────────────────────────────────────────────────────────────────────
async function createTestUsers() {
  log('\n👤 PHASE 3: Tạo test users...');
  const created = [];

  for (const u of TEST_USERS) {
    // Xóa nếu đã tồn tại
    const existing = await prisma.user.findFirst({ where: { email: u.email } });
    if (existing) {
      await prisma.interaction.deleteMany({ where: { userId: existing.id } });
      await prisma.songLike.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }

    const user = await prisma.user.create({
      data: {
        username: u.username,
        email: u.email,
        displayName: u.displayName,
        password: '$2b$10$placeholder_hash_for_test_users_only',
        isActive: true,
        isVerified: true,
      },
    });
    created.push({ ...user, profile: u.profile, config: u });
    log(`  ✅ Tạo user: ${u.displayName} (ID: ${user.id})`);
  }

  return created;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4: Tạo interactions theo profile
// ─────────────────────────────────────────────────────────────────────────────
const CLUSTER_GENRE_MAP = {
  Pop: ['Pop', 'V-Pop', 'K-Pop'],
  Rock: ['Rock', 'Alternative', 'Metal'],
  Lofi: ['Lo-fi', 'Acoustic', 'Indie'],
  HipHop: ['Hip-Hop', 'Rap', 'Rap Việt'],
  EDM: ['EDM', 'House', 'Trance'],
};

async function createInteractions(testUsers, createdSongs) {
  log('\n🎧 PHASE 4: Tạo interaction patterns...');

  // Lấy songId theo cluster
  const songsByCluster = createdSongs; // { clusterName: [songId,...] }

  const now = new Date();
  let totalInteractions = 0;
  let totalLikes = 0;

  for (const userRecord of testUsers) {
    const cfg = userRecord.config;
    if (cfg.profile === 'ColdStart') {
      log(`  ⏭️  ${cfg.displayName}: Bỏ qua (Cold Start)`);
      continue;
    }

    const interactions = [];
    const likesToCreate = [];
    const likedSongIds = new Set();

    // Xác định songs được prefer vs không prefer
    const preferredCluster = cfg.profile === 'Diverse' ? null : cfg.profile;

    // Build danh sách bài theo ưu tiên
    let preferredSongs = [];
    let otherSongs = [];

    for (const [cluster, ids] of Object.entries(songsByCluster)) {
      if (preferredCluster && cluster === preferredCluster) {
        preferredSongs.push(...ids);
      } else if (cfg.profile === 'Diverse') {
        // Diverse: coi tất cả là preferred nhưng có weighting
        preferredSongs.push(...ids);
      } else {
        otherSongs.push(...ids);
      }
    }

    // ── Tạo interactions cho preferred songs ──
    const preferredListens = Math.floor(cfg.listenCount * 0.75);
    const selectedPreferred = pickN(preferredSongs, preferredListens);

    for (const songId of selectedPreferred) {
      const daysAgo = Math.floor(Math.random() * 30);
      const ts = new Date(now.getTime() - daysAgo * 86400000 - Math.random() * 3600000);
      const completionRate = parseFloat((0.7 + Math.random() * 0.3).toFixed(3)); // 0.7–1.0
      const durationMs = 200000;
      interactions.push({
        userId: userRecord.id,
        songId,
        timeStamp: ts,
        completionRate,
        isLiked: false,
        isSkipped: false,
        durationPlayed: Math.floor(durationMs * completionRate),
      });
    }

    // ── Like cho preferred songs ──
    const likePool = cfg.profile === 'Diverse'
      ? selectedPreferred
      : selectedPreferred;

    const toLike = pickN(likePool, cfg.likeCount);
    for (const songId of toLike) {
      if (!likedSongIds.has(songId)) {
        likesToCreate.push({ userId: userRecord.id, songId });
        likedSongIds.add(songId);
      }
    }

    // ── Tạo interactions cho non-preferred songs (ít, completionRate thấp) ──
    if (otherSongs.length > 0) {
      const otherListens = cfg.listenCount - preferredListens;
      const selectedOther = pickN(otherSongs, otherListens);
      for (const songId of selectedOther) {
        const isSkipped = cfg.skipGenres.length > 0 && Math.random() < 0.65;
        const completionRate = isSkipped
          ? parseFloat((0.05 + Math.random() * 0.2).toFixed(3))
          : parseFloat((0.3 + Math.random() * 0.35).toFixed(3));
        const daysAgo = Math.floor(Math.random() * 30);
        const ts = new Date(now.getTime() - daysAgo * 86400000 - Math.random() * 3600000);
        interactions.push({
          userId: userRecord.id,
          songId,
          timeStamp: ts,
          completionRate,
          isLiked: false,
          isSkipped,
          durationPlayed: Math.floor(200000 * completionRate),
        });
      }
    }

    // Batch insert interactions
    if (interactions.length > 0) {
      await prisma.interaction.createMany({ data: interactions, skipDuplicates: true });
      totalInteractions += interactions.length;
    }

    // Batch insert likes
    if (likesToCreate.length > 0) {
      await prisma.songLike.createMany({ data: likesToCreate, skipDuplicates: true });
      totalLikes += likesToCreate.length;
    }

    log(`  ✅ ${cfg.displayName}: ${interactions.length} interactions, ${likesToCreate.length} likes`);
  }

  log(`\n  📊 Tổng cộng: ${totalInteractions} interactions | ${totalLikes} likes`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 5: Ghi metadata file để test runner dùng
// ─────────────────────────────────────────────────────────────────────────────
async function saveMetadata(testUsers, createdSongs, genreMap) {
  const fs = require('fs');
  const path = require('path');

  const metadata = {
    generatedAt: new Date().toISOString(),
    testUsers: testUsers.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      profile: u.profile,
      config: {
        listenCount: u.config.listenCount,
        likeCount: u.config.likeCount,
        likeGenres: u.config.likeGenres,
        skipGenres: u.config.skipGenres,
      },
    })),
    songClusters: createdSongs,
    genreMap,
    clusterFeatures: Object.fromEntries(
      Object.entries(GENRE_CLUSTERS).map(([name, c]) => [name, c.features])
    ),
    totalSongs: Object.values(createdSongs).flat().length,
  };

  const outPath = path.join(__dirname, 'ai-test-metadata.json');
  fs.writeFileSync(outPath, JSON.stringify(metadata, null, 2), 'utf-8');
  log(`\n💾 Metadata đã lưu → ${outPath}`);
  return metadata;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const isCleanup = process.argv.includes('--cleanup');

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║       🧪 AI TEST DATASET BUILDER — SoundWave            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  try {
    // Luôn cleanup trước
    await cleanup();

    if (isCleanup) {
      log('\n✅ Cleanup hoàn tất.');
      return;
    }

    const genreMap = await ensureGenres();
    const createdSongs = await createSongs(genreMap);
    const testUsers = await createTestUsers();
    await createInteractions(testUsers, createdSongs);
    const metadata = await saveMetadata(testUsers, createdSongs, genreMap);

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                   ✅ HOÀN TẤT!                         ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  🎵 Bài hát mock       : ${String(metadata.totalSongs).padStart(4)} (5 genre clusters)  ║`);
    console.log(`║  👤 Test users         :    5                          ║`);
    console.log(`║  🎸 Genre clusters     : Pop | Rock | Lo-fi | HipHop | EDM ║`);
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  BƯỚC TIẾP THEO:                                        ║');
    console.log('║  1. curl -X POST http://localhost:8000/train            ║');
    console.log('║  2. Đợi training hoàn tất (~1-2 phút)                  ║');
    console.log('║  3. node tests/ai-test-runner.js                        ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

  } catch (err) {
    console.error('\n❌ Lỗi:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
