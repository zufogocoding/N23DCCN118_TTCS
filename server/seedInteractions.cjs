require('dotenv').config();
const prisma = require('./db/index.js');
const readline = require('readline');

// ========== CẤU HÌNH ==========
const CONFIG = {
  listensPerSong: { min: 5, max: 60 },
  likeChance: 0.25,
  skipChance: 0.15,
  daysSpread: 60,
  followChance: 0.12,
  playlistsPerUser: { min: 0, max: 3 },
  songsPerPlaylist: { min: 3, max: 12 },
};

// ========== UTILS ==========
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}
function progressBar(current, total, label = '') {
  const width = 30;
  const pct = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  process.stdout.write(`\r  ${bar} ${pct}% ${label}`);
  if (current >= total) process.stdout.write('\n');
}

// ========== ABORT HANDLER ==========
let aborted = false;
let rlGlobal = null;

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function setupAbortListener() {
  rlGlobal = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('💡 Nhấn "q" + Enter bất kỳ lúc nào để dừng an toàn.\n');
  rlGlobal.on('line', (input) => {
    if (input.trim().toLowerCase() === 'q') {
      console.log('\n\n⏹️  Đang dừng an toàn... (chờ batch hiện tại hoàn tất)\n');
      aborted = true;
      rlGlobal.close();
      rlGlobal = null;
    }
  });
}

// ========== PHASE 0: RESET DATA CŨ ==========
async function resetOldData() {
  console.log('\n🗑️  Đang xóa dữ liệu seed cũ...');

  // Xóa PlaylistSong trước (FK constraint)
  const delPlaylistSongs = await prisma.playlistSong.deleteMany({});
  console.log(`   - PlaylistSong: ${delPlaylistSongs.count} records`);

  // Xóa Playlist (chỉ playlist KHÔNG phải system)
  const delPlaylists = await prisma.playlist.deleteMany({
    where: { isSystem: false }
  });
  console.log(`   - Playlist (user): ${delPlaylists.count} records`);

  const delInteractions = await prisma.interaction.deleteMany({});
  console.log(`   - Interaction: ${delInteractions.count} records`);

  const delLikes = await prisma.songLike.deleteMany({});
  console.log(`   - SongLike: ${delLikes.count} records`);

  const delFollows = await prisma.follow.deleteMany({});
  console.log(`   - Follow: ${delFollows.count} records`);

  // Giữ nguyên playCount — tích lũy là tốt cho hệ thống

  console.log('  ✅ Đã dọn sạch!\n');
}

// ========== PHASE 1: INTERACTIONS ==========
async function seedListeningHistory(users, songs) {
  console.log('\n🎧 PHASE 1: Tạo lịch sử nghe nhạc...');
  const now = new Date();
  let totalCreated = 0;

  const userProfiles = users.map(u => {
    const r = Math.random();
    if (r < 0.15) return { ...u, type: 'power', multiplier: 2.5 };
    if (r < 0.55) return { ...u, type: 'casual', multiplier: 1.0 };
    return { ...u, type: 'lurker', multiplier: 0.3 };
  });

  for (let i = 0; i < songs.length; i++) {
    if (aborted) break;
    const song = songs[i];
    const baseListens = rand(CONFIG.listensPerSong.min, CONFIG.listensPerSong.max);
    const batch = [];

    for (let j = 0; j < baseListens; j++) {
      const userProfile = pick(userProfiles);
      if (Math.random() > userProfile.multiplier / 2.5) continue;

      const daysAgo = Math.floor(Math.pow(Math.random(), 1.5) * CONFIG.daysSpread);
      const timeStamp = new Date(
        now.getTime() - daysAgo * 86400000 - rand(0, 23) * 3600000 - rand(0, 59) * 60000 - rand(0, 59) * 1000
      );

      const isSkipped = Math.random() < CONFIG.skipChance;
      const completionRate = isSkipped
        ? Math.random() * 0.25 + 0.05
        : Math.random() * 0.5 + 0.5;
      const durationPlayed = Math.floor((song.durationMs || 200000) * completionRate);
      const isLiked = !isSkipped && completionRate > 0.7 && Math.random() < CONFIG.likeChance;

      batch.push({
        userId: userProfile.id,
        songId: song.id,
        timeStamp,
        completionRate: parseFloat(completionRate.toFixed(3)),
        isSkipped,
        isLiked,
        durationPlayed,
      });
    }

    if (batch.length > 0) {
      await prisma.interaction.createMany({ data: batch, skipDuplicates: true });
      totalCreated += batch.length;
    }
    progressBar(i + 1, songs.length, `(${totalCreated} interactions)`);
  }

  console.log(`  ✅ Đã tạo ${totalCreated} lượt nghe.`);
  return totalCreated;
}

// ========== PHASE 2: SONG LIKES ==========
async function seedSongLikes(users, songs) {
  if (aborted) return 0;
  console.log('\n❤️  PHASE 2: Tạo lượt thích bài hát...');
  
  // Xóa like cũ để tránh lộn xộn khi chạy lại
  await prisma.songLike.deleteMany({});
  
  let totalLikes = 0;
  const batchSize = 200;
  let batch = [];

  for (const user of users) {
    if (aborted) break;
    const likePct = Math.random() * 0.3 + 0.1;
    const likedSongs = pickN(songs, Math.floor(songs.length * likePct));
    for (const song of likedSongs) {
      batch.push({ userId: user.id, songId: song.id });
      if (batch.length >= batchSize) {
        await prisma.songLike.createMany({ data: batch, skipDuplicates: true });
        totalLikes += batch.length;
        batch = [];
      }
    }
  }
  if (batch.length > 0) {
    await prisma.songLike.createMany({ data: batch, skipDuplicates: true });
    totalLikes += batch.length;
  }

  console.log(`  ✅ Đã tạo ${totalLikes} lượt thích.`);
  return totalLikes;
}

// ========== PHASE 3: FOLLOWS ==========
async function seedFollows(users) {
  if (aborted) return 0;
  console.log('\n👥 PHASE 3: Tạo quan hệ follow...');
  const batch = [];

  for (const user of users) {
    if (aborted) break;
    for (const other of users) {
      if (user.id === other.id) continue;
      if (Math.random() < CONFIG.followChance) {
        batch.push({ followerId: user.id, followeeId: other.id });
      }
    }
  }

  let totalFollows = 0;
  if (batch.length > 0) {
    await prisma.follow.createMany({ data: batch, skipDuplicates: true });
    totalFollows = batch.length;
  }

  console.log(`  ✅ Đã tạo ${totalFollows} quan hệ follow.`);

  // Cập nhật followerCount cho các nghệ sĩ
  console.log('   🔄 Đang cập nhật followerCount trong bảng Artist...');
  const artists = await prisma.artist.findMany({ select: { userId: true } });
  let updatedArtists = 0;
  for (const artist of artists) {
    if (aborted) break;
    const count = await prisma.follow.count({
      where: { followeeId: artist.userId }
    });
    await prisma.artist.update({
      where: { userId: artist.userId },
      data: { followerCount: count }
    });
    updatedArtists++;
  }
  console.log(`   ✅ Đã đồng bộ followerCount cho ${updatedArtists} nghệ sĩ.`);

  return totalFollows;
}

// ========== PHASE 4: PLAYLISTS ==========
async function seedPlaylists(users, songs) {
  if (aborted) return 0;
  console.log('\n📋 PHASE 4: Tạo playlist ảo...');

  const playlistNames = [
    'Nhạc chill cuối tuần', 'Gym motivation', 'Đường về nhà', 'Nhạc buồn tâm trạng',
    'Lo-fi study', 'Party vibes', 'Acoustic yêu thích', 'Top picks tháng này',
    'Rap Việt hay nhất', 'K-Pop mix', 'Indie cảm xúc', 'Nhạc ngủ',
    'Roadtrip playlist', 'Morning coffee', 'Late night feels', 'Throwback classics',
    'Workout energy', 'Focus mode', 'Rainy day mood', 'Summer hits',
    'Ballad Việt', 'EDM bangers', 'Chill R&B', 'Coding soundtrack',
  ];

  let totalPlaylists = 0;
  let totalPlaylistSongs = 0;

  for (const user of users) {
    if (aborted) break;
    const numPlaylists = rand(CONFIG.playlistsPerUser.min, CONFIG.playlistsPerUser.max);

    for (let p = 0; p < numPlaylists; p++) {
      const name = pick(playlistNames);
      const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${user.id}-${Date.now()}-${rand(1000, 9999)}`;

      try {
        const playlist = await prisma.playlist.create({
          data: {
            title: name,
            description: `Playlist "${name}" của user #${user.id}`,
            playlistUrl: slug,
            isPublic: Math.random() > 0.2,
            userId: user.id,
          }
        });

        const numSongs = rand(CONFIG.songsPerPlaylist.min, CONFIG.songsPerPlaylist.max);
        const selectedSongs = pickN(songs, numSongs);
        const playlistSongsData = selectedSongs.map((s, idx) => ({
          playlistId: playlist.id,
          songId: s.id,
          sortOrder: idx,
        }));

        if (playlistSongsData.length > 0) {
          await prisma.playlistSong.createMany({ data: playlistSongsData, skipDuplicates: true });
          totalPlaylistSongs += playlistSongsData.length;
        }
        totalPlaylists++;
      } catch (err) { /* skip duplicate slug */ }
    }
  }

  console.log(`  ✅ Đã tạo ${totalPlaylists} playlist với ${totalPlaylistSongs} bài.`);
  return totalPlaylists;
}

// ========== PHASE 5: CẬP NHẬT playCount ==========
async function updatePlayCounts(songs) {
  if (aborted) return;
  console.log('\n📊 PHASE 5: Cập nhật playCount...');
  let updated = 0;

  for (const song of songs) {
    if (aborted) break;
    const count = await prisma.interaction.count({ where: { songId: song.id } });
    await prisma.song.update({
      where: { id: song.id },
      data: { playCount: { increment: count } }
    });
    updated++;
    progressBar(updated, songs.length, `(${updated}/${songs.length})`);
  }

  console.log(`  ✅ Đã cập nhật playCount cho ${updated} bài.`);
}

// ========== MAIN ==========
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     🌱 SEED INTERACTIONS - PHIÊN BẢN NÂNG CẤP    ║');
  console.log('╚══════════════════════════════════════════════════╝');

  try {
    // Kiểm tra data hiện có
    const existingInteractions = await prisma.interaction.count();
    const existingLikes = await prisma.songLike.count();
    const existingFollows = await prisma.follow.count();
    const existingPlaylists = await prisma.playlist.count({ where: { isSystem: false } });

    if (existingInteractions > 0 || existingLikes > 0 || existingFollows > 0 || existingPlaylists > 0) {
      console.log('\n📋 Dữ liệu hiện có trong DB:');
      console.log(`   🎧 Interactions : ${existingInteractions}`);
      console.log(`   ❤️  SongLikes    : ${existingLikes}`);
      console.log(`   👥 Follows      : ${existingFollows}`);
      console.log(`   📋 Playlists    : ${existingPlaylists}`);
      console.log('');

      const answer = await ask('⚠️  Bạn muốn XÓA dữ liệu cũ trước khi seed mới? (y/n): ');

      if (answer === 'y' || answer === 'yes') {
        await resetOldData();
      } else {
        console.log('\n📌 Giữ nguyên data cũ, thêm data mới bên trên.\n');
        console.log('   ⚠️  Lưu ý: Interactions & Playlists sẽ bị CỘNG DỒN!\n');
      }
    }

    // Lấy data
    const users = await prisma.user.findMany({ select: { id: true } });
    const songs = await prisma.song.findMany({
      where: { isDeleted: false, status: 'approved' },
      select: { id: true, durationMs: true, title: true },
    });

    if (users.length === 0 || songs.length === 0) {
      console.log('\n⚠️  Cần có ít nhất 1 User và 1 Song (approved) trong DB.');
      console.log(`   Users: ${users.length} | Songs (approved): ${songs.length}`);
      return;
    }

    console.log(`📦 Dữ liệu: ${users.length} Users | ${songs.length} Songs (approved)\n`);

    // Bắt đầu seed
    setupAbortListener();

    const stats = { interactions: 0, likes: 0, follows: 0, playlists: 0 };
    stats.interactions = await seedListeningHistory(users, songs);
    stats.likes = await seedSongLikes(users, songs);
    stats.follows = await seedFollows(users);
    stats.playlists = await seedPlaylists(users, songs);
    await updatePlayCounts(songs);

    // Tổng kết
    console.log('\n╔══════════════════════════════════════════════════╗');
    if (aborted) {
      console.log('║          ⏹️  ĐÃ DỪNG SỚM (do người dùng)         ║');
    } else {
      console.log('║            🎉 HOÀN TẤT TẤT CẢ PHASES!            ║');
    }
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  🎧 Lượt nghe  : ${String(stats.interactions).padStart(8)}                     ║`);
    console.log(`║  ❤️  Lượt thích : ${String(stats.likes).padStart(8)}                     ║`);
    console.log(`║  👥 Follow     : ${String(stats.follows).padStart(8)}                     ║`);
    console.log(`║  📋 Playlist   : ${String(stats.playlists).padStart(8)}                     ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('\n👉 Vào Admin → "Cập nhật Bảng Xếp Hạng" để thấy kết quả!\n');

  } catch (error) {
    console.error('\n❌ Lỗi:', error.message || error);
  } finally {
    if (rlGlobal) rlGlobal.close();
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
