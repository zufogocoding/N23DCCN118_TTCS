/**
 * Seed script: Tạo dữ liệu test với file nhạc thực
 * Sử dụng file nhạc nhỏ tự tạo bằng tone thuần để test streaming
 */
require('dotenv').config();
const prisma = require('./db/index.js');
const fs = require('fs');
const path = require('path');

// Tạo một file WAV đơn giản (sine wave) để test streaming
function createTestAudioFile(filename, frequencyHz = 440, durationSecs = 5) {
  const sampleRate = 44100;
  const numSamples = sampleRate * durationSecs;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * blockAlign;
  const fileSize = 44 + dataSize;

  const buffer = Buffer.alloc(fileSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt sub-chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4; // sub-chunk size
  buffer.writeUInt16LE(1, offset); offset += 2; // PCM format
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data sub-chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Write sine wave samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequencyHz * t) * 0.5; // 50% volume
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  const filePath = path.join(__dirname, 'uploads', 'songs', filename);
  fs.writeFileSync(filePath, buffer);
  console.log(`  ✅ Created test audio: ${filePath} (${(fileSize / 1024).toFixed(1)} KB)`);
  return `/uploads/songs/${filename}`;
}

async function seed() {
  try {
    console.log('\n🌱 Bắt đầu seed dữ liệu test...\n');

    // 1. Tạo file nhạc test
    console.log('📁 Tạo file audio test...');
    const audio1 = createTestAudioFile('test-song-1.wav', 440, 10); // A4 note, 10 giây
    const audio2 = createTestAudioFile('test-song-2.wav', 523, 8);  // C5 note, 8 giây
    const audio3 = createTestAudioFile('test-song-3.wav', 659, 12); // E5 note, 12 giây
    const audio4 = createTestAudioFile('test-song-4.wav', 392, 15); // G4 note, 15 giây
    const audio5 = createTestAudioFile('test-song-5.wav', 349, 9);  // F4 note, 9 giây

    // 2. Tạo songs trong DB
    console.log('\n🎵 Tạo songs trong database...');
    const songsData = [
      { title: 'Midnight Dreams', audioUrl: audio1, durationMs: 10000, coverArtUrl: null },
      { title: 'Chill Vibes Beat', audioUrl: audio2, durationMs: 8000, coverArtUrl: null },
      { title: 'Summer Rain', audioUrl: audio3, durationMs: 12000, coverArtUrl: null },
      { title: 'Neon City Night', audioUrl: audio4, durationMs: 15000, coverArtUrl: null },
      { title: 'Coffee & Code', audioUrl: audio5, durationMs: 9000, coverArtUrl: null },
    ];

    const createdSongs = [];
    for (const songData of songsData) {
      const song = await prisma.song.create({ data: songData });
      createdSongs.push(song);
      console.log(`  ✅ Song ${song.id}: "${song.title}"`);
    }

    // 3. Tạo genres
    console.log('\n🏷️ Tạo genres...');
    const genres = ['Pop', 'Lofi', 'Electronic', 'Chill', 'Hip-Hop'];
    const createdGenres = [];
    for (const tag of genres) {
      const genre = await prisma.genre.upsert({
        where: { genreTag: tag },
        update: {},
        create: { genreTag: tag }
      });
      createdGenres.push(genre);
      console.log(`  ✅ Genre: ${genre.genreTag}`);
    }

    // 4. Gán genre cho songs
    console.log('\n🔗 Gán genres cho songs...');
    const songGenreAssignments = [
      { songId: createdSongs[0].id, genreId: createdGenres[0].id }, // Midnight Dreams - Pop
      { songId: createdSongs[0].id, genreId: createdGenres[3].id }, // Midnight Dreams - Chill
      { songId: createdSongs[1].id, genreId: createdGenres[1].id }, // Chill Vibes - Lofi
      { songId: createdSongs[2].id, genreId: createdGenres[0].id }, // Summer Rain - Pop
      { songId: createdSongs[3].id, genreId: createdGenres[2].id }, // Neon City - Electronic
      { songId: createdSongs[4].id, genreId: createdGenres[1].id }, // Coffee & Code - Lofi
    ];

    for (const sg of songGenreAssignments) {
      await prisma.songGenre.create({ data: sg });
    }
    console.log(`  ✅ Đã gán ${songGenreAssignments.length} song-genre relationships`);

    console.log('\n✨ Seed hoàn tất! Đã tạo:');
    console.log(`   - ${createdSongs.length} bài hát (với file audio thực)`);
    console.log(`   - ${createdGenres.length} thể loại`);
    console.log('\n💡 Bạn có thể login và test ngay bây giờ.\n');

  } catch (error) {
    console.error('❌ Lỗi seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
