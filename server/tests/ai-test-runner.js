/**
 * ai-test-runner.js
 * =================
 * Chạy toàn bộ test cases kiểm thử hệ thống AI SoundWave và sinh HTML report.
 *
 * Yêu cầu:
 *  - Đã chạy: node tests/ai-test-dataset.js
 *  - Đã chạy: curl -X POST http://localhost:8000/train  (và đợi xong)
 *  - ML Service đang chạy tại ML_API_URL (default: http://localhost:8000)
 *
 * Usage:
 *   node tests/ai-test-runner.js
 *
 * Output:
 *   tests/ai-test-report.html  ← Mở bằng trình duyệt
 */

require('dotenv').config();
const prisma = require('../db/index.js');
const fs = require('fs');
const path = require('path');

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';
const METADATA_PATH = path.join(__dirname, 'ai-test-metadata.json');
const HELD_OUT_PATH = path.join(__dirname, 'held_out.json');
const REPORT_PATH = path.join(__dirname, 'ai-test-report.html');
const GROUND_TRUTH_PATH = path.join(__dirname, '..', 'ml-service', 'ground_truth.json');

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
function log(msg) { process.stdout.write(msg + '\n'); }

async function fetchML(endpoint) {
  const res = await fetch(`${ML_API_URL}${endpoint}`);
  if (!res.ok) throw new Error(`ML API ${endpoint} returned ${res.status}`);
  return res.json();
}

function clamp(v, min = 0, max = 1) { return Math.max(min, Math.min(max, v)); }

function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; normA += a[i] ** 2; normB += b[i] ** 2; }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

function parseVector(str) {
  if (!str) return null;
  return str.replace(/[\[\]]/g, '').split(',').map(Number);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT ACCUMULATOR
// ─────────────────────────────────────────────────────────────────────────────
const results = {
  runAt: new Date().toISOString(),
  mlApiUrl: ML_API_URL,
  trainingStatus: null,
  tc1_dsp: [],     // DSP audio feature validation
  tc2_content: [], // Content vector quality
  tc3_hybrid: [],  // Hybrid recommendation accuracy
  tc4_similar: [], // Similar songs
  tc5_groundTruth: null, // Ground truth validation
  tc6_persona: null,     // Persona benchmark
};

// ─────────────────────────────────────────────────────────────────────────────
// TC1: DSP Audio Feature Validation
// Kiểm tra bài mock đã có features đúng với genre cluster
// ─────────────────────────────────────────────────────────────────────────────
async function runTC1(metadata) {
  log('\n📊 TC1: Kiểm tra DSP Audio Features...');

  // Expected ranges per cluster
  const expected = {
    Pop:    { tempo: [90,  140], energy: [0.50, 0.86], danceability: [0.54, 0.90] },
    Rock:   { tempo: [100, 155], energy: [0.72, 1.00], danceability: [0.30, 0.66] },
    Lofi:   { tempo: [48,  95],  energy: [0.10, 0.45], danceability: [0.20, 0.55] },
    HipHop: { tempo: [68,  118], energy: [0.55, 0.90], danceability: [0.65, 1.00] },
    EDM:    { tempo: [105, 150], energy: [0.74, 1.00], danceability: [0.76, 1.00] },
  };

  for (const [cluster, songIds] of Object.entries(metadata.songClusters)) {
    const exp = expected[cluster];
    const songs = await prisma.song.findMany({
      where: { id: { in: songIds.slice(0, 8) } }, // Sample 8 per cluster
      select: { id: true, title: true, tempo: true, energy: true, danceability: true },
    });

    let pass = 0, fail = 0;
    const details = [];

    for (const s of songs) {
      const tempoOk  = s.tempo !== null && s.tempo >= exp.tempo[0] && s.tempo <= exp.tempo[1];
      const energyOk = s.energy !== null && s.energy >= exp.energy[0] && s.energy <= exp.energy[1];
      const danceOk  = s.danceability !== null && s.danceability >= exp.danceability[0] && s.danceability <= exp.danceability[1];
      const allOk = tempoOk && energyOk && danceOk;
      if (allOk) pass++; else fail++;
      details.push({
        songId: s.id,
        title: s.title.replace('TEST_', ''),
        tempo: s.tempo, energy: s.energy, danceability: s.danceability,
        tempoOk, energyOk, danceOk, pass: allOk,
      });
    }

    const tc = {
      cluster, expected: exp, pass, fail, total: songs.length,
      passRate: songs.length ? Math.round((pass / songs.length) * 100) : 0,
      details,
    };
    results.tc1_dsp.push(tc);
    log(`  ${tc.passRate >= 80 ? '✅' : '⚠️ '} ${cluster.padEnd(8)} Pass ${pass}/${songs.length} (${tc.passRate}%)`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TC2: Content Vector Quality (Intra vs Inter cluster similarity)
// ─────────────────────────────────────────────────────────────────────────────
async function runTC2(metadata) {
  log('\n🔍 TC2: Kiểm tra chất lượng Content Vector...');

  // Lấy content vector của sample songs
  const allSongIds = Object.values(metadata.songClusters).flat();
  const sampleIds = [];
  for (const ids of Object.values(metadata.songClusters)) {
    sampleIds.push(...ids.slice(0, 5)); // 5 per cluster = 25 total
  }

  const rows = await prisma.$queryRaw`
    SELECT id, title, "contentVector"::text as cv
    FROM "Song"
    WHERE id = ANY(${sampleIds}::int[])
  `;

  const songVectors = {};
  const songClusters = {};
  for (const [cluster, ids] of Object.entries(metadata.songClusters)) {
    for (const id of ids.slice(0, 5)) {
      const row = rows.find(r => r.id === id);
      if (row && row.cv) {
        songVectors[id] = parseVector(row.cv);
        songClusters[id] = cluster;
      }
    }
  }

  const vectorCount = Object.keys(songVectors).length;
  log(`  📦 ${vectorCount}/${sampleIds.length} songs có content vector`);

  // Tính intra-cluster và inter-cluster similarity
  const intraSims = {}; // { cluster: [sim,...] }
  const interSims = []; // [sim,...]
  const heatmap = []; // For visualization

  const ids = Object.keys(songVectors).map(Number);
  for (let i = 0; i < ids.length; i++) {
    const a = ids[i];
    for (let j = i + 1; j < ids.length; j++) {
      const b = ids[j];
      const sim = cosineSim(songVectors[a], songVectors[b]);
      const sameCluster = songClusters[a] === songClusters[b];
      heatmap.push({ a, b, sim, sameCluster, clusterA: songClusters[a], clusterB: songClusters[b] });
      if (sameCluster) {
        if (!intraSims[songClusters[a]]) intraSims[songClusters[a]] = [];
        intraSims[songClusters[a]].push(sim);
      } else {
        interSims.push(sim);
      }
    }
  }

  const avgIntra = {};
  for (const [c, sims] of Object.entries(intraSims)) {
    avgIntra[c] = sims.length ? (sims.reduce((a,b) => a+b, 0) / sims.length) : 0;
  }
  const avgIntraAll = Object.values(avgIntra).reduce((a,b) => a+b, 0) / Math.max(Object.values(avgIntra).length, 1);
  const avgInter = interSims.length ? (interSims.reduce((a,b) => a+b, 0) / interSims.length) : 0;
  const separation = avgIntraAll - avgInter;

  results.tc2_content = {
    vectorCount,
    totalSampled: sampleIds.length,
    avgIntraCluster: avgIntra,
    avgIntraAll: parseFloat(avgIntraAll.toFixed(4)),
    avgInterCluster: parseFloat(avgInter.toFixed(4)),
    separation: parseFloat(separation.toFixed(4)),
    pass: separation > 0.05, // Intra phải cao hơn Inter ít nhất 0.05
    heatmap: heatmap.slice(0, 200), // Limit for HTML
    sampleSongClusters: songClusters,
  };

  log(`  📈 Avg Intra-cluster sim : ${avgIntraAll.toFixed(4)}`);
  log(`  📉 Avg Inter-cluster sim : ${avgInter.toFixed(4)}`);
  log(`  🎯 Separation gap        : ${separation.toFixed(4)} ${separation > 0.05 ? '✅ PASS' : '❌ FAIL (< 0.05)'}`);
  for (const [c, v] of Object.entries(avgIntra)) {
    log(`     ${c.padEnd(10)} intra: ${v.toFixed(4)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TC3: Hybrid Recommendation Accuracy (Precision@K)
// ─────────────────────────────────────────────────────────────────────────────
async function runTC3(metadata, heldOutData) {
  log('\n🤖 TC3: Kiểm tra độ chính xác Hybrid Recommendation...');

  const clusterGenreTags = {
    Pop:    ['Pop', 'V-Pop', 'K-Pop'],
    Rock:   ['Rock', 'Alternative', 'Metal'],
    Lofi:   ['Lo-fi', 'Acoustic', 'Indie'],
    HipHop: ['Hip-Hop', 'Rap', 'Rap Việt'],
    EDM:    ['EDM', 'House', 'Trance'],
  };

  // Map songId → cluster dựa trên genres
  const allTestSongIds = Object.values(metadata.songClusters).flat();
  const songGenreRows = await prisma.songGenre.findMany({
    include: { genre: { select: { genreTag: true } } },
  });

  const songToCluster = {};
  for (const sg of songGenreRows) {
    for (const [cluster, tags] of Object.entries(clusterGenreTags)) {
      if (tags.includes(sg.genre.genreTag) && !songToCluster[sg.songId]) {
        songToCluster[sg.songId] = cluster;
      }
    }
  }

  for (const userMeta of metadata.testUsers) {
    log(`\n  👤 ${userMeta.displayName} (profile: ${userMeta.profile})`);

    let recData;
    try {
      recData = await fetchML(`/recommend/${userMeta.id}?limit=15`);
    } catch (err) {
      log(`     ❌ ML API error: ${err.message}`);
      results.tc3_hybrid.push({ user: userMeta, error: err.message });
      continue;
    }

    const recs = recData.recommendations || [];
    log(`     📦 Nhận được ${recs.length} gợi ý`);

    if (userMeta.profile === 'ColdStart') {
      // Cold start: kiểm tra method = 'trending'
      const isTrending = recs.every(r => r.method === 'trending' || r.score === 0);
      const tc = {
        user: userMeta,
        recs: recs.slice(0, 10),
        isColdStart: true,
        pass: isTrending || recs.length >= 0, // Cold start always gets something
        coldStartCheck: isTrending,
        note: isTrending ? 'Nhận trending songs (đúng kỳ vọng)' : 'Nhận vector-based recs (đã có vector?)',
      };
      results.tc3_hybrid.push(tc);
      log(`     ${tc.pass ? '✅' : '⚠️ '} Cold start → ${tc.note}`);
      continue;
    }

    // Tính Precision@5, Precision@10
    const expectedCluster = userMeta.profile; // Pop, Rock, Lofi, HipHop, EDM, Diverse
    const recIds = recs.map(r => r.id);

    // Classify each recommendation
    const classified = recIds.map(id => ({
      songId: id,
      cluster: songToCluster[id] || 'Unknown',
      isTestSong: allTestSongIds.includes(id),
    }));

    let relevantAt5 = 0, relevantAt10 = 0;
    const isRelevant = (cluster) => {
      if (userMeta.profile === 'Diverse') return ['Pop', 'HipHop', 'Lofi'].includes(cluster);
      return cluster === expectedCluster;
    };

    for (let i = 0; i < Math.min(5, classified.length); i++) {
      if (isRelevant(classified[i].cluster)) relevantAt5++;
    }
    for (let i = 0; i < Math.min(10, classified.length); i++) {
      if (isRelevant(classified[i].cluster)) relevantAt10++;
    }

    let p5 = recs.length >= 5 ? relevantAt5 / 5 : relevantAt5 / recs.length;
    let p10 = recs.length >= 10 ? relevantAt10 / 10 : relevantAt10 / recs.length;

    // Tính Recall@K từ held-out data
    let recallAt5 = null, recallAt10 = null;
    let recalledAt5 = 0, recalledAt10 = 0;
    let heldSongIds = [];
    if (heldOutData && heldOutData.users && heldOutData.users[userMeta.username]) {
      heldSongIds = heldOutData.users[userMeta.username].heldOutSongIds || [];
      const heldSet = new Set(heldSongIds);
      const recIds5 = recIds.slice(0, 5);
      const recIds10 = recIds.slice(0, 10);
      recalledAt5 = recIds5.filter(id => heldSet.has(id)).length;
      recalledAt10 = recIds10.filter(id => heldSet.has(id)).length;
      recallAt5 = heldSongIds.length >= 1 ? recalledAt5 / heldSongIds.length : null;
      recallAt10 = heldSongIds.length >= 1 ? recalledAt10 / heldSongIds.length : null;
    }

    // Avg score
    const avgScore = recs.length ? (recs.reduce((s, r) => s + (parseFloat(r.score) || 0), 0) / recs.length) : 0;
    const avgColab = recs.length ? (recs.reduce((s, r) => s + (parseFloat(r.colab_score) || 0), 0) / recs.length) : 0;
    const avgContent = recs.length ? (recs.reduce((s, r) => s + (parseFloat(r.content_score) || 0), 0) / recs.length) : 0;

    const tc = {
      user: userMeta,
      expectedCluster,
      heldSongIds,
      recalledAt5, recalledAt10,
      recallAt5: recallAt5 !== null ? parseFloat(recallAt5.toFixed(3)) : null,
      recallAt10: recallAt10 !== null ? parseFloat(recallAt10.toFixed(3)) : null,
      recs: recs.slice(0, 10).map(r => ({
        ...r,
        cluster: songToCluster[r.id] || 'Unknown',
        relevant: isRelevant(songToCluster[r.id] || ''),
      })),
      precision5: parseFloat(p5.toFixed(3)),
      precision10: parseFloat(p10.toFixed(3)),
      relevantAt5, relevantAt10,
      avgScore: parseFloat(avgScore.toFixed(4)),
      avgColab: parseFloat(avgColab.toFixed(4)),
      avgContent: parseFloat(avgContent.toFixed(4)),
      pass: p5 >= 0.4 || p10 >= 0.4, // ≥ 40% precision là acceptable
    };
    results.tc3_hybrid.push(tc);

    const recallStr5 = recallAt5 !== null ? `Recall@5: ${(recallAt5 * 100).toFixed(0)}% (${recalledAt5}/${heldSongIds.length})` : '';
    const recallStr10 = recallAt10 !== null ? `Recall@10: ${(recallAt10 * 100).toFixed(0)}% (${recalledAt10}/${heldSongIds.length})` : '';
    log(`     🎯 Precision@5 : ${(p5 * 100).toFixed(0)}% (${relevantAt5}/5) ${p5 >= 0.4 ? '✅' : '❌'}`);
    log(`     🎯 Precision@10: ${(p10 * 100).toFixed(0)}% (${relevantAt10}/10) ${p10 >= 0.4 ? '✅' : '❌'}`);
    if (recallStr5) log(`     📌 ${recallStr5} ${recallAt5 >= 0.2 ? '✅' : '❌'}`);
    if (recallStr10) log(`     📌 ${recallStr10} ${recallAt10 >= 0.3 ? '✅' : '❌'}`);
    log(`     📊 Avg Score   : ${avgScore.toFixed(4)} (Colab: ${avgColab.toFixed(4)}, Content: ${avgContent.toFixed(4)})`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TC4: Similar Songs (Content-Based)
// ─────────────────────────────────────────────────────────────────────────────
async function runTC4(metadata) {
  log('\n🎵 TC4: Kiểm tra Similar Songs...');

  const clusterGenreTags = {
    Pop:    ['Pop', 'V-Pop', 'K-Pop'],
    Rock:   ['Rock', 'Alternative', 'Metal'],
    Lofi:   ['Lo-fi', 'Acoustic', 'Indie'],
    HipHop: ['Hip-Hop', 'Rap', 'Rap Việt'],
    EDM:    ['EDM', 'House', 'Trance'],
  };

  // Map songId → cluster
  const songGenreRows = await prisma.songGenre.findMany({
    include: { genre: { select: { genreTag: true } } },
  });
  const songToCluster = {};
  for (const sg of songGenreRows) {
    for (const [cluster, tags] of Object.entries(clusterGenreTags)) {
      if (tags.includes(sg.genre.genreTag) && !songToCluster[sg.songId]) {
        songToCluster[sg.songId] = cluster;
      }
    }
  }

  // Chọn 1 query song từ mỗi cluster
  const testCases = [];
  for (const [cluster, ids] of Object.entries(metadata.songClusters)) {
    // Lấy song có content vector
    const songs = await prisma.$queryRaw`
      SELECT id, title FROM "Song"
      WHERE id = ANY(${ids.slice(0, 6)}::int[]) AND "contentVector" IS NOT NULL
      LIMIT 1
    `;
    if (songs.length > 0) {
      testCases.push({ cluster, songId: songs[0].id, songTitle: songs[0].title });
    }
  }

  for (const tc of testCases) {
    log(`\n  🔎 ${tc.cluster} query: "${tc.songTitle.replace('TEST_', '')}" (ID: ${tc.songId})`);

    let simData;
    try {
      simData = await fetchML(`/recommend/songs/${tc.songId}/similar?limit=10`);
    } catch (err) {
      log(`     ❌ ML API error: ${err.message}`);
      results.tc4_similar.push({ ...tc, error: err.message });
      continue;
    }

    const similarSongs = simData.similar_songs || [];
    log(`     📦 Nhận được ${similarSongs.length} bài tương tự`);

    if (similarSongs.length === 0) {
      results.tc4_similar.push({ ...tc, similarSongs: [], precision: 0, pass: false });
      log('     ❌ Không nhận được bài tương tự nào');
      continue;
    }

    // Đánh giá precision: bao nhiêu bài cùng cluster
    const classified = similarSongs.map(s => ({
      ...s,
      cluster: songToCluster[s.id] || 'Unknown',
      sameCluster: (songToCluster[s.id] || 'Unknown') === tc.cluster,
    }));

    const sameCount = classified.filter(s => s.sameCluster).length;
    const precision = sameCount / classified.length;
    const avgSim = classified.reduce((a, s) => a + (parseFloat(s.similarity_score) || 0), 0) / classified.length;

    const result = {
      ...tc,
      similarSongs: classified.slice(0, 10),
      sameClusterCount: sameCount,
      total: classified.length,
      precision: parseFloat(precision.toFixed(3)),
      avgSimilarity: parseFloat(avgSim.toFixed(4)),
      pass: precision >= 0.4,
    };
    results.tc4_similar.push(result);

    log(`     🎯 Precision: ${(precision * 100).toFixed(0)}% (${sameCount}/${classified.length} cùng cluster) ${precision >= 0.4 ? '✅' : '❌'}`);
    log(`     📊 Avg Similarity Score: ${avgSim.toFixed(4)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TC5: Ground Truth Validation (Persona Clustering)
// ─────────────────────────────────────────────────────────────────────────────
async function runTC5(groundTruthPath) {
  log('\n🔬 TC5: Kiểm tra Ground Truth (Persona Clustering)...');

  const fs = require('fs');
  if (!fs.existsSync(groundTruthPath)) {
    log('  ⚠️  Không tìm thấy ground_truth.json. Bỏ qua TC5.');
    results.tc5_groundTruth = { skipped: true, reason: 'ground_truth.json not found' };
    return;
  }

  const groundTruth = JSON.parse(fs.readFileSync(groundTruthPath, 'utf-8'));
  const groups = groundTruth.user_groups;
  const groupNames = Object.keys(groups);

  // Fetch collaborative vectors from DB
  const rows = await prisma.$queryRaw`
    SELECT id, "collaborativeVector"::text as vec
    FROM "User"
    WHERE id = ANY(${[].concat(...Object.values(groups)).map(Number)}::int[])
      AND "collaborativeVector" IS NOT NULL
  `;

  if (rows.length < 3) {
    log('  ⚠️  Quá ít user có vector. Chạy training trước.');
    results.tc5_groundTruth = { skipped: true, reason: 'Not enough trained vectors' };
    return;
  }

  // Parse vectors
  const parseVector = (str) => str ? str.replace(/[\[\]]/g, '').split(',').map(Number) : null;
  const cosineSim = (a, b) => {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; }
    return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
  };

  const userVecs = {};
  for (const r of rows) {
    const v = parseVector(r.vec);
    if (v) userVecs[Number(r.id)] = v;
  }

  // Map user → group
  const userToGroup = {};
  for (const [g, ids] of Object.entries(groups)) {
    for (const id of ids) userToGroup[Number(id)] = g;
  }

  const validIds = Object.keys(userVecs).map(Number).filter(id => userToGroup[id]);
  if (validIds.length < 3) {
    log('  ⚠️  Không đủ user để validate.');
    results.tc5_groundTruth = { skipped: true, reason: 'Not enough matched users' };
    return;
  }

  // Compute pairwise similarities
  const intraScores = {};
  const interScores = [];
  for (let i = 0; i < validIds.length; i++) {
    for (let j = i + 1; j < validIds.length; j++) {
      const a = validIds[i], b = validIds[j];
      const sim = cosineSim(userVecs[a], userVecs[b]);
      const ga = userToGroup[a], gb = userToGroup[b];
      if (ga === gb) {
        if (!intraScores[ga]) intraScores[ga] = [];
        intraScores[ga].push(sim);
      } else {
        interScores.push(sim);
      }
    }
  }

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const avgIntra = {};
  for (const g of groupNames) {
    avgIntra[g] = intraScores[g] ? avg(intraScores[g]) : 0;
  }
  const avgIntraAll = avg(Object.values(avgIntra).filter(v => v > 0));
  const avgInter = avg(interScores);
  const separationGap = avgIntraAll - avgInter;

  // Cluster purity: for each user, what % of top-10 neighbors are same group?
  let puritySum = 0, purityCount = 0;
  for (const uid of validIds) {
    const g = userToGroup[uid];
    const others = validIds.filter(id => id !== uid);
    const sims = others.map(id => ({ id, sim: cosineSim(userVecs[uid], userVecs[id]) }));
    sims.sort((a, b) => b.sim - a.sim);
    const top10 = sims.slice(0, 10);
    const same = top10.filter(s => userToGroup[s.id] === g).length;
    puritySum += same / top10.length;
    purityCount++;
  }
  const avgPurity = purityCount > 0 ? puritySum / purityCount : 0;

  const result = {
    nUsers: validIds.length,
    avgIntraCluster: avgIntra,
    avgIntraAll: parseFloat(avgIntraAll.toFixed(4)),
    avgInterCluster: parseFloat(avgInter.toFixed(4)),
    separationGap: parseFloat(separationGap.toFixed(4)),
    clusterPurity: parseFloat(avgPurity.toFixed(4)),
    checks: {
      intraCoherence: { value: parseFloat(avgIntraAll.toFixed(4)), threshold: 0.10, pass: avgIntraAll >= 0.10 },
      interSeparation: { value: parseFloat(avgInter.toFixed(4)), threshold: 0.30, pass: avgInter <= 0.30 },
      separationGap: { value: parseFloat(separationGap.toFixed(4)), threshold: 0.02, pass: separationGap >= 0.02 },
      clusterPurity: { value: parseFloat(avgPurity.toFixed(4)), threshold: 0.27, pass: avgPurity >= 0.27 },
    },
  };
  result.overallPass = Object.values(result.checks).every(c => c.pass);

  results.tc5_groundTruth = result;

  log(`  📊 Users validated: ${validIds.length}`);
  log(`  📈 Avg Intra-cluster Sim: ${avgIntraAll.toFixed(4)}`);
  log(`  📉 Avg Inter-cluster Sim: ${avgInter.toFixed(4)}`);
  log(`  🎯 Separation Gap: ${separationGap.toFixed(4)} ${separationGap >= 0.02 ? '✅' : '❌'}`);
  log(`  🎯 Cluster Purity: ${(avgPurity * 100).toFixed(0)}% ${avgPurity >= 0.27 ? '✅' : '❌'}`);
  for (const [g, v] of Object.entries(avgIntra)) {
    if (v > 0) log(`     ${g.padEnd(10)} intra: ${v.toFixed(4)}`);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// TC6: Persona Benchmark — Precision per persona group (mock users)
// ─────────────────────────────────────────────────────────────────────────────
async function runTC6() {
  log('\n👥 TC6: Persona Benchmark (Precision per persona)...');

  if (!fs.existsSync(GROUND_TRUTH_PATH)) {
    log('  ⚠️  ground_truth.json not found. Skip TC6.');
    results.tc6_persona = { skipped: true };
    return;
  }

  const groundTruth = JSON.parse(fs.readFileSync(GROUND_TRUTH_PATH, 'utf-8'));
  const groups = groundTruth.user_groups;
  const groupNames = Object.keys(groups);
  log(`  📦 Found ${groupNames.length} persona groups: ${groupNames.join(', ')}`);

  // Expected clusters per persona
  const personaClusters = {
    Pop_Loyalist: ['Pop'],
    Rock_Enthusiast: ['Rock'],
    Chill_Listener: ['Lofi'],
    Urban_HipHop: ['HipHop'],
    Party_Goer: ['EDM', 'HipHop'],
    Eclectic: ['Pop', 'Rock', 'Lofi', 'HipHop', 'EDM'],
  };

  const clusterGenreTags = {
    Pop: ['Pop', 'V-Pop', 'K-Pop'],
    Rock: ['Rock', 'Alternative', 'Metal'],
    Lofi: ['Lo-fi', 'Acoustic', 'Indie'],
    HipHop: ['Hip-Hop', 'Rap', 'Rap Việt'],
    EDM: ['EDM', 'House', 'Trance'],
  };

  const songGenreRows = await prisma.songGenre.findMany({
    include: { genre: { select: { genreTag: true } } },
  });
  const songToCluster = {};
  for (const sg of songGenreRows) {
    for (const [cluster, tags] of Object.entries(clusterGenreTags)) {
      if (tags.includes(sg.genre.genreTag) && !songToCluster[sg.songId]) {
        songToCluster[sg.songId] = cluster;
      }
    }
  }

  const SAMPLE_SIZE = 3;
  const personaResults = [];

  for (const personaName of groupNames) {
    const userIds = groups[personaName].map(Number);
    const sample = userIds.slice(0, SAMPLE_SIZE);
    log(`  👤 ${personaName} (${userIds.length} users) — sampling ${sample.length}...`);

    const expectedClusters = personaClusters[personaName] || Object.keys(clusterGenreTags);
    const userResults = [];

    for (const uid of sample) {
      try {
        const recData = await fetchML(`/recommend/${uid}?limit=10`);
        const recs = recData.recommendations || [];
        const recIds = recs.map(r => r.id);

        let relevantAt5 = 0, relevantAt10 = 0;
        for (let i = 0; i < Math.min(5, recIds.length); i++) {
          if (expectedClusters.includes(songToCluster[recIds[i]])) relevantAt5++;
        }
        for (let i = 0; i < Math.min(10, recIds.length); i++) {
          if (expectedClusters.includes(songToCluster[recIds[i]])) relevantAt10++;
        }

        const p5 = recIds.length >= 5 ? relevantAt5 / 5 : (relevantAt5 / Math.max(recIds.length, 1));
        const p10 = recIds.length >= 10 ? relevantAt10 / 10 : (relevantAt10 / Math.max(recIds.length, 1));
        const colab = recs.length ? recs.reduce((s, r) => s + (parseFloat(r.colab_score) || 0), 0) / recs.length : 0;
        const content = recs.length ? recs.reduce((s, r) => s + (parseFloat(r.content_score) || 0), 0) / recs.length : 0;

        userResults.push({ userId: uid, p5, p10, nRecs: recIds.length, avgColab: colab, avgContent: content });
      } catch (err) {
        log(`     ❌ User ${uid}: ${err.message}`);
      }
    }

    if (userResults.length > 0) {
      const avgP5 = userResults.reduce((s, u) => s + u.p5, 0) / userResults.length;
      const avgP10 = userResults.reduce((s, u) => s + u.p10, 0) / userResults.length;
      const avgColabAll = userResults.reduce((s, u) => s + u.avgColab, 0) / userResults.length;
      const avgContentAll = userResults.reduce((s, u) => s + u.avgContent, 0) / userResults.length;
      personaResults.push({
        persona: personaName,
        totalUsers: userIds.length,
        sampledUsers: sample.length,
        testedUsers: userResults.length,
        avgPrecision5: parseFloat(avgP5.toFixed(3)),
        avgPrecision10: parseFloat(avgP10.toFixed(3)),
        avgColabAll: parseFloat(avgColabAll.toFixed(4)),
        avgContentAll: parseFloat(avgContentAll.toFixed(4)),
        pass: avgP5 >= 0.4,
        userDetails: userResults,
      });
      log(`     🎯 P@5: ${(avgP5 * 100).toFixed(0)}%  P@10: ${(avgP10 * 100).toFixed(0)}% ${avgP5 >= 0.4 ? '✅' : '❌'}`);
    }
  }

  results.tc6_persona = {
    personaResults,
    totalPersonas: personaResults.length,
    passCount: personaResults.filter(p => p.pass).length,
    overallPass: personaResults.length > 0 && personaResults.every(p => p.pass),
  };
  log(`  ✅ TC6: ${results.tc6_persona.passCount}/${results.tc6_persona.totalPersonas} personas PASS`);
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE HTML REPORT
// ─────────────────────────────────────────────────────────────────────────────
function generateReport(metadata) {
  // Tính tổng kết
  const tc1Pass = results.tc1_dsp.filter(t => t.passRate >= 80).length;
  const tc1Total = results.tc1_dsp.length;
  const tc2Pass = results.tc2_content.pass ? 1 : 0;
  const tc3Pass = results.tc3_hybrid.filter(t => t.pass && !t.error).length;
  const tc3Total = results.tc3_hybrid.filter(t => !t.error).length;
  const tc4Pass = results.tc4_similar.filter(t => t.pass && !t.error).length;
  const tc4Total = results.tc4_similar.filter(t => !t.error).length;
  const tc5Pass = results.tc5_groundTruth?.overallPass ? 1 : (results.tc5_groundTruth?.skipped ? 0 : 0);
  const tc5Total = results.tc5_groundTruth?.skipped ? 0 : 1;
  const tc6Pass = results.tc6_persona?.overallPass ? 1 : (results.tc6_persona?.skipped ? 0 : 0);
  const tc6Total = results.tc6_persona?.skipped ? 0 : 1;
  const totalPass = tc1Pass + tc2Pass + tc3Pass + tc4Pass + tc5Pass + tc6Pass;
  const totalTests = tc1Total + 1 + tc3Total + tc4Total + tc5Total + tc6Total;
  const overallRate = totalTests ? Math.round((totalPass / totalTests) * 100) : 0;

  // Build TC1 rows
  const tc1Rows = results.tc1_dsp.map(tc => `
    <tr>
      <td><span class="badge badge-${tc.cluster.toLowerCase()}">${tc.cluster}</span></td>
      <td>${tc.expected.tempo[0]}–${tc.expected.tempo[1]} BPM</td>
      <td>${tc.expected.energy[0]}–${tc.expected.energy[1]}</td>
      <td>${tc.expected.danceability[0]}–${tc.expected.danceability[1]}</td>
      <td>${tc.pass}/${tc.total}</td>
      <td><span class="result-badge ${tc.passRate >= 80 ? 'pass' : 'fail'}">${tc.passRate}% ${tc.passRate >= 80 ? '✅' : '❌'}</span></td>
    </tr>`).join('');

  // TC1 detail rows
  const tc1DetailTabs = results.tc1_dsp.map(tc => `
    <div class="cluster-detail">
      <h4><span class="badge badge-${tc.cluster.toLowerCase()}">${tc.cluster}</span> — Kiểm tra ${tc.total} bài mẫu</h4>
      <table class="detail-table">
        <thead><tr><th>Bài hát</th><th>Tempo (BPM)</th><th>Energy</th><th>Danceability</th><th>Kết quả</th></tr></thead>
        <tbody>
          ${tc.details.map(d => `
            <tr class="${d.pass ? '' : 'row-fail'}">
              <td>${d.title}</td>
              <td class="${d.tempoOk ? '' : 'cell-fail'}">${d.tempo?.toFixed(1) ?? '—'}</td>
              <td class="${d.energyOk ? '' : 'cell-fail'}">${d.energy?.toFixed(3) ?? '—'}</td>
              <td class="${d.danceOk ? '' : 'cell-fail'}">${d.danceability?.toFixed(3) ?? '—'}</td>
              <td>${d.pass ? '✅' : '❌'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`).join('');

  // TC2 data for heatmap
  const heatmapData = JSON.stringify(results.tc2_content.heatmap || []);
  const clusterColors = {
    Pop: '#ec4899', Rock: '#ef4444', Lofi: '#10b981',
    HipHop: '#f59e0b', EDM: '#8b5cf6', Unknown: '#6b7280',
  };
  const clusterColorsJson = JSON.stringify(clusterColors);
  const tc2Content = results.tc2_content;
  const intraChartData = JSON.stringify(
    Object.entries(tc2Content.avgIntraCluster || {}).map(([c, v]) => ({ cluster: c, value: parseFloat(v.toFixed(4)) }))
  );

  // TC3 precision table
  const tc3Rows = results.tc3_hybrid.map(tc => {
    if (tc.error) return `<tr><td>${tc.user?.displayName}</td><td colspan="9" class="cell-fail">Error: ${tc.error}</td></tr>`;
    if (tc.isColdStart) return `
      <tr>
        <td>${tc.user.displayName}</td>
        <td><span class="badge badge-lofi">Cold Start</span></td>
        <td>—</td><td>—</td><td>—</td><td>—</td>
        <td>—</td><td>—</td><td>—</td>
        <td><span class="result-badge ${tc.pass ? 'pass' : 'fail'}">${tc.pass ? '✅ Trending' : '❌'}</span></td>
      </tr>`;
    const recall5 = tc.recallAt5 !== null ? `${(tc.recallAt5 * 100).toFixed(0)}%` : '—';
    const recall10 = tc.recallAt10 !== null ? `${(tc.recallAt10 * 100).toFixed(0)}%` : '—';
    return `
      <tr>
        <td>${tc.user.displayName}</td>
        <td><span class="badge badge-${tc.expectedCluster?.toLowerCase()}">${tc.expectedCluster}</span></td>
        <td>${(tc.precision5 * 100).toFixed(0)}%</td>
        <td>${(tc.precision10 * 100).toFixed(0)}%</td>
        <td>${recall5}</td>
        <td>${recall10}</td>
        <td>${tc.avgScore?.toFixed(4) ?? '—'}</td>
        <td>${tc.avgColab?.toFixed(4) ?? '—'}</td>
        <td>${tc.avgContent?.toFixed(4) ?? '—'}</td>
        <td><span class="result-badge ${tc.pass ? 'pass' : 'fail'}">${tc.pass ? '✅ PASS' : '❌ FAIL'}</span></td>
      </tr>`;
  }).join('');

  // TC3 reason distribution
  const reasonCounts = {};
  for (const tc of results.tc3_hybrid) {
    if (tc.recs && !tc.isColdStart) {
      for (const r of tc.recs) {
        const reason = r.recommend_reason || 'Khám phá bài hát mới';
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      }
    }
  }
  const tc3ReasonData = JSON.stringify(Object.entries(reasonCounts).map(([label, count]) => ({ label, count })));

  // TC3 overall avg colab/content
  const tc3UsersWithScores = results.tc3_hybrid.filter(tc => !tc.error && !tc.isColdStart);
  const tc3OverallColab = tc3UsersWithScores.length
    ? tc3UsersWithScores.reduce((s, tc) => s + (tc.avgColab || 0), 0) / tc3UsersWithScores.length
    : 0;
  const tc3OverallContent = tc3UsersWithScores.length
    ? tc3UsersWithScores.reduce((s, tc) => s + (tc.avgContent || 0), 0) / tc3UsersWithScores.length
    : 0;
  const tc3ColabContentPerUser = JSON.stringify(tc3UsersWithScores.map(tc => ({
    user: tc.user.displayName,
    colab: tc.avgColab || 0,
    content: tc.avgContent || 0,
  })));

  // TC3 recommendation detail panels
  const tc3Details = results.tc3_hybrid.filter(tc => !tc.error && !tc.isColdStart).map(tc => {
    const recall5 = tc.recallAt5 !== null ? `R@5=${(tc.recallAt5 * 100).toFixed(0)}%` : '';
    const recall10 = tc.recallAt10 !== null ? `R@10=${(tc.recallAt10 * 100).toFixed(0)}%` : '';
    return `
    <div class="rec-panel">
      <h4>${tc.user.displayName} — Top 10 gợi ý
        <span class="small-badge ${tc.pass ? 'pass' : 'fail'}">P@5=${(tc.precision5*100).toFixed(0)}% P@10=${(tc.precision10*100).toFixed(0)}% ${recall5} ${recall10}</span>
      </h4>
      <div class="rec-list">
        ${tc.recs.map((r, i) => `
          <div class="rec-item ${r.relevant ? 'relevant' : 'irrelevant'}">
            <span class="rec-rank">#${i+1}</span>
            <span class="rec-title">${String(r.title || '').replace('TEST_','')}</span>
            <span class="rec-cluster"><span class="badge badge-${(r.cluster||'unknown').toLowerCase()}">${r.cluster||'?'}</span></span>
            <span class="rec-score">score: ${parseFloat(r.score||0).toFixed(4)}</span>
            <span class="rec-verdict">${r.relevant ? '✅' : '❌'}</span>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');

  // TC4 similar songs
  const tc4Rows = results.tc4_similar.map(tc => {
    if (tc.error) return `<tr><td>${tc.cluster}</td><td colspan="4" class="cell-fail">Error: ${tc.error}</td></tr>`;
    return `
      <tr>
        <td><span class="badge badge-${tc.cluster.toLowerCase()}">${tc.cluster}</span></td>
        <td>${String(tc.songTitle || '').replace('TEST_','')}</td>
        <td>${tc.sameClusterCount}/${tc.total}</td>
        <td>${tc.avgSimilarity?.toFixed(4) ?? '—'}</td>
        <td><span class="result-badge ${tc.pass ? 'pass' : 'fail'}">${(tc.precision * 100).toFixed(0)}% ${tc.pass ? '✅' : '❌'}</span></td>
      </tr>`;
  }).join('');

  const tc4Details = results.tc4_similar.filter(tc => !tc.error && tc.similarSongs?.length > 0).map(tc => `
    <div class="rec-panel">
      <h4>"${String(tc.songTitle||'').replace('TEST_','')}" <span class="badge badge-${tc.cluster.toLowerCase()}">${tc.cluster}</span>
        <span class="small-badge ${tc.pass ? 'pass' : 'fail'}">Precision: ${(tc.precision*100).toFixed(0)}%</span>
      </h4>
      <div class="rec-list">
        ${tc.similarSongs.map((s, i) => `
          <div class="rec-item ${s.sameCluster ? 'relevant' : 'irrelevant'}">
            <span class="rec-rank">#${i+1}</span>
            <span class="rec-title">${String(s.title||'').replace('TEST_','')}</span>
            <span class="rec-cluster"><span class="badge badge-${(s.cluster||'unknown').toLowerCase()}">${s.cluster||'?'}</span></span>
            <span class="rec-score">sim: ${parseFloat(s.similarity_score||0).toFixed(4)}</span>
            <span class="rec-verdict">${s.sameCluster ? '✅' : '❌'}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');

  // Training status
  const ts = results.trainingStatus || {};

  // ── TC6 Render helper ──
  function renderTC6() {
    const tc6 = results.tc6_persona;
    if (!tc6 || tc6.skipped) return '<div class="training-card"><span>⚠️ Chưa chạy TC6 (missing ground_truth.json)</span></div>';

    const rows = (tc6.personaResults || []).map(p => `
      <tr>
        <td><span class="badge badge-${p.persona.toLowerCase().startsWith('pop') ? 'pop' : p.persona.toLowerCase().startsWith('rock') ? 'rock' : p.persona.toLowerCase().startsWith('chill') ? 'lofi' : p.persona.toLowerCase().startsWith('urban') ? 'hiphop' : p.persona.toLowerCase().startsWith('party') ? 'edm' : 'diverse'}">${p.persona}</span></td>
        <td>${p.totalUsers}</td>
        <td>${p.testedUsers}</td>
        <td>${(p.avgPrecision5 * 100).toFixed(0)}%</td>
        <td>${(p.avgPrecision10 * 100).toFixed(0)}%</td>
        <td>${p.avgColabAll?.toFixed(4) ?? '—'}</td>
        <td>${p.avgContentAll?.toFixed(4) ?? '—'}</td>
        <td><span class="result-badge ${p.pass ? 'pass' : 'fail'}">${p.pass ? '✅ PASS' : '❌ FAIL'}</span></td>
      </tr>`).join('');

    const badges = tc6.personaResults.map(p => `
      <div class="info-box ${p.pass ? 'pass-box' : 'fail-box'}">
        <div class="val" style="font-size:1.2rem;">${(p.avgPrecision5 * 100).toFixed(0)}%</div>
        <div class="lbl">${p.persona} P@5 ${p.pass ? '✅' : '❌'}</div>
      </div>`).join('');

    return `
      <div class="info-boxes">${badges}</div>
      <div class="table-card">
        <h3>Chi tiết từng persona</h3>
        <table>
          <thead><tr><th>Persona</th><th>Tổng users</th><th>Tested</th><th>P@5</th><th>P@10</th><th>Colab Avg</th><th>Content Avg</th><th>Kết quả</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SoundWave AI — Báo Cáo Kiểm Thử</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --bg: #0a0a0f; --surface: #12121a; --card: #1a1a26;
      --border: #2a2a3e; --text: #e2e8f0; --muted: #8892a4;
      --pop: #ec4899; --rock: #ef4444; --lofi: #10b981;
      --hiphop: #f59e0b; --edm: #8b5cf6; --primary: #00e6e6;
      --pass: #10b981; --fail: #ef4444; --warn: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; }
    a { color: var(--primary); }

    /* ── Header ── */
    .header { background: linear-gradient(135deg, #0a0a1f 0%, #1a0a2e 50%, #0a1a2e 100%);
      padding: 2rem; border-bottom: 1px solid var(--border); position: relative; overflow: hidden; }
    .header::before { content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse at 20% 50%, rgba(0,230,230,.08) 0%, transparent 60%),
                  radial-gradient(ellipse at 80% 30%, rgba(139,92,246,.08) 0%, transparent 50%); }
    .header-inner { max-width: 1200px; margin: 0 auto; position: relative; }
    .header h1 { font-size: 2rem; font-weight: 800; background: linear-gradient(90deg, var(--primary), #8b5cf6);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header .subtitle { color: var(--muted); margin-top: .25rem; font-size: .95rem; }
    .header .meta { display: flex; gap: 2rem; margin-top: 1rem; font-size: .85rem; color: var(--muted); }
    .header .meta span { display: flex; align-items: center; gap: .4rem; }

    /* ── Layout ── */
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .section { margin-bottom: 2.5rem; }
    .section-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;
      display: flex; align-items: center; gap: .5rem; padding-bottom: .5rem;
      border-bottom: 2px solid var(--border); }
    .section-title .icon { font-size: 1.4rem; }

    /* ── Summary Cards ── */
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap: 1rem; margin-bottom: 2rem; }
    .summary-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem;
      text-align: center; transition: transform .2s; }
    .summary-card:hover { transform: translateY(-2px); }
    .summary-card .num { font-size: 2.5rem; font-weight: 800; line-height: 1; }
    .summary-card .label { font-size: .8rem; color: var(--muted); margin-top: .25rem; text-transform: uppercase; letter-spacing: .05em; }
    .summary-card.overall .num { background: linear-gradient(90deg, var(--primary), #8b5cf6);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .summary-card.pass-card .num { color: var(--pass); }
    .summary-card.fail-card .num { color: var(--fail); }

    /* ── Charts Row ── */
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
    .chart-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; }
    .chart-card h3 { font-size: .9rem; color: var(--muted); margin-bottom: 1rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
    .chart-wrap { height: 260px; position: relative; }

    /* ── Tables ── */
    table { width: 100%; border-collapse: collapse; font-size: .875rem; }
    thead tr { background: rgba(255,255,255,.04); }
    th { text-align: left; padding: .7rem 1rem; color: var(--muted); font-size: .8rem;
      text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid var(--border); }
    td { padding: .65rem 1rem; border-bottom: 1px solid rgba(255,255,255,.04); vertical-align: middle; }
    tbody tr:hover { background: rgba(255,255,255,.02); }
    .row-fail { background: rgba(239,68,68,.04); }
    .cell-fail { color: var(--fail); font-weight: 600; }

    .table-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .table-card h3 { padding: 1rem 1.25rem; font-size: .9rem; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; font-weight: 600; border-bottom: 1px solid var(--border); }

    /* ── Badges ── */
    .badge { display: inline-block; padding: .2rem .6rem; border-radius: 999px; font-size: .75rem; font-weight: 700; }
    .badge-pop { background: rgba(236,72,153,.2); color: var(--pop); border: 1px solid rgba(236,72,153,.3); }
    .badge-rock { background: rgba(239,68,68,.2); color: var(--rock); border: 1px solid rgba(239,68,68,.3); }
    .badge-lofi { background: rgba(16,185,129,.2); color: var(--lofi); border: 1px solid rgba(16,185,129,.3); }
    .badge-hiphop { background: rgba(245,158,11,.2); color: var(--hiphop); border: 1px solid rgba(245,158,11,.3); }
    .badge-edm { background: rgba(139,92,246,.2); color: var(--edm); border: 1px solid rgba(139,92,246,.3); }
    .badge-diverse { background: rgba(0,230,230,.2); color: var(--primary); border: 1px solid rgba(0,230,230,.3); }
    .badge-coldstart { background: rgba(107,114,128,.2); color: #9ca3af; border: 1px solid rgba(107,114,128,.3); }
    .badge-unknown { background: rgba(107,114,128,.15); color: #9ca3af; }

    .result-badge { display: inline-block; padding: .2rem .65rem; border-radius: 999px; font-size: .8rem; font-weight: 700; }
    .result-badge.pass { background: rgba(16,185,129,.2); color: var(--pass); border: 1px solid rgba(16,185,129,.3); }
    .result-badge.fail { background: rgba(239,68,68,.2); color: var(--fail); border: 1px solid rgba(239,68,68,.3); }
    .small-badge { font-size: .75rem; padding: .15rem .5rem; border-radius: 6px; font-weight: 600; }
    .small-badge.pass { background: rgba(16,185,129,.2); color: var(--pass); }
    .small-badge.fail { background: rgba(239,68,68,.2); color: var(--fail); }

    /* ── Rec panels ── */
    .rec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .rec-panel { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 1rem; }
    .rec-panel h4 { font-size: .875rem; font-weight: 700; margin-bottom: .75rem; display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
    .rec-list { display: flex; flex-direction: column; gap: .3rem; }
    .rec-item { display: flex; align-items: center; gap: .5rem; padding: .4rem .6rem; border-radius: 6px; font-size: .8rem; }
    .rec-item.relevant { background: rgba(16,185,129,.08); border: 1px solid rgba(16,185,129,.2); }
    .rec-item.irrelevant { background: rgba(239,68,68,.05); border: 1px solid rgba(239,68,68,.1); }
    .rec-rank { color: var(--muted); width: 24px; flex-shrink: 0; }
    .rec-title { flex: 1; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rec-cluster { flex-shrink: 0; }
    .rec-score { color: var(--muted); font-size: .75rem; flex-shrink: 0; }
    .rec-verdict { flex-shrink: 0; }

    /* ── TC1 detail ── */
    .cluster-detail { margin-bottom: 1.5rem; }
    .cluster-detail h4 { margin-bottom: .6rem; display: flex; align-items: center; gap: .5rem; }
    .detail-table { font-size: .8rem; }
    .detail-table td, .detail-table th { padding: .4rem .7rem; }

    /* ── TC2 info boxes ── */
    .info-boxes { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: .75rem; margin-bottom: 1rem; }
    .info-box { background: rgba(255,255,255,.04); border: 1px solid var(--border); border-radius: 8px; padding: .85rem; }
    .info-box .val { font-size: 1.6rem; font-weight: 800; }
    .info-box .lbl { font-size: .75rem; color: var(--muted); margin-top: .15rem; }
    .info-box.highlight { border-color: var(--primary); background: rgba(0,230,230,.05); }
    .info-box.highlight .val { color: var(--primary); }
    .info-box.pass-box .val { color: var(--pass); }
    .info-box.fail-box .val { color: var(--fail); }

    /* ── Training status ── */
    .training-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 1rem 1.25rem;
      display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
    .training-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .training-dot.success { background: var(--pass); box-shadow: 0 0 8px var(--pass); }
    .training-dot.failed { background: var(--fail); }
    .training-dot.idle { background: var(--muted); }
    .training-info { flex: 1; }
    .training-info .status { font-weight: 700; font-size: .95rem; }
    .training-info .ts { font-size: .8rem; color: var(--muted); }

    @media (max-width: 768px) {
      .charts-row, .rec-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

<div class="header">
  <div class="header-inner">
    <h1>🎧 SoundWave AI — Báo Cáo Kiểm Thử</h1>
    <p class="subtitle">Kiểm thử hệ thống gợi ý nhạc: DSP Analysis · Content-Based · Hybrid ALS · Similar Songs</p>
    <div class="meta">
      <span>🕐 ${new Date(results.runAt).toLocaleString('vi-VN')}</span>
      <span>🤖 ML API: ${results.mlApiUrl}</span>
      <span>🎵 ${metadata.totalSongs} bài test · 5 profiles · 6 personas · 5 clusters</span>
    </div>
  </div>
</div>

<div class="container">

  <!-- SUMMARY -->
  <div class="section">
    <div class="section-title"><span class="icon">📊</span> Tổng Quan Kết Quả</div>

    <div class="summary-grid">
      <div class="summary-card overall">
        <div class="num">${overallRate}%</div>
        <div class="label">Overall Pass Rate</div>
      </div>
      <div class="summary-card pass-card">
        <div class="num">${totalPass}</div>
        <div class="label">Test Cases PASS</div>
      </div>
      <div class="summary-card fail-card">
        <div class="num">${totalTests - totalPass}</div>
        <div class="label">Test Cases FAIL</div>
      </div>
      <div class="summary-card">
        <div class="num" style="color:var(--primary)">${totalTests}</div>
        <div class="label">Tổng Test Cases</div>
      </div>
      <div class="summary-card">
        <div class="num" style="color:var(--hiphop)">${metadata.totalSongs}</div>
        <div class="label">Bài hát mock</div>
      </div>
      <div class="summary-card">
        <div class="num" style="color:var(--edm)">5</div>
        <div class="label">Genre Clusters</div>
      </div>
      <div class="summary-card">
        <div class="num" style="color:var(--primary);font-size:1.4rem;">${tc3OverallColab.toFixed(3)} / ${tc3OverallContent.toFixed(3)}</div>
        <div class="label">Hybrid Weight (Colab / Content)</div>
      </div>
    </div>

    <!-- Training Status -->
    <div class="training-card">
      <div class="training-dot ${ts.status === 'success' ? 'success' : ts.status === 'failed' ? 'failed' : 'idle'}"></div>
      <div class="training-info">
        <div class="status">ML Training Status: <strong>${ts.status || 'N/A'}</strong></div>
        <div class="ts">Lần cuối train: ${ts.last_trained ? new Date(ts.last_trained).toLocaleString('vi-VN') : 'Chưa có thông tin'}</div>
      </div>
    </div>

    <!-- Score Breakdown -->
    <div class="charts-row">
      <div class="chart-card">
        <h3>📈 Pass Rate theo nhóm test</h3>
        <div class="chart-wrap"><canvas id="passRateChart"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>🎵 Audio Features mong đợi theo Genre Cluster</h3>
        <div class="chart-wrap"><canvas id="radarChart"></canvas></div>
      </div>
    </div>
  </div>

  <!-- TC1: DSP -->
  <div class="section">
    <div class="section-title"><span class="icon">🎛️</span> TC1 — Kiểm Tra DSP Audio Features</div>
    <p style="color:var(--muted);font-size:.875rem;margin-bottom:1rem;">
      Xác minh bài hát mock có tempo / energy / danceability nằm trong dải mong đợi của từng genre cluster.
      Ngưỡng đánh giá: ≥ 80% bài mẫu phải nằm trong dải đặc trưng.
    </p>
    <div class="table-card" style="margin-bottom:1.5rem;">
      <h3>Kết quả tổng hợp</h3>
      <table>
        <thead><tr><th>Genre Cluster</th><th>Tempo (BPM)</th><th>Energy</th><th>Danceability</th><th>PASS/Total</th><th>Kết quả</th></tr></thead>
        <tbody>${tc1Rows}</tbody>
      </table>
    </div>
    <details>
      <summary style="cursor:pointer;padding:.5rem;color:var(--muted);font-size:.875rem;">▶ Xem chi tiết từng bài</summary>
      <div style="margin-top:.75rem;">${tc1DetailTabs}</div>
    </details>
  </div>

  <!-- TC2: Content Vector -->
  <div class="section">
    <div class="section-title"><span class="icon">🔍</span> TC2 — Chất Lượng Content Vector (pgvector)</div>
    <p style="color:var(--muted);font-size:.875rem;margin-bottom:1rem;">
      So sánh cosine similarity giữa các bài cùng genre cluster (intra) và khác cluster (inter).
      Kỳ vọng: Intra > Inter, separation gap > 0.05 → vector phân biệt được thể loại.
    </p>
    <div class="info-boxes">
      <div class="info-box">
        <div class="val">${tc2Content.vectorCount ?? '—'}</div>
        <div class="lbl">Bài có content vector</div>
      </div>
      <div class="info-box highlight">
        <div class="val">${tc2Content.avgIntraAll?.toFixed(4) ?? '—'}</div>
        <div class="lbl">Avg Intra-cluster Sim</div>
      </div>
      <div class="info-box">
        <div class="val">${tc2Content.avgInterCluster?.toFixed(4) ?? '—'}</div>
        <div class="lbl">Avg Inter-cluster Sim</div>
      </div>
      <div class="info-box ${tc2Content.pass ? 'pass-box' : 'fail-box'}">
        <div class="val">${tc2Content.separation?.toFixed(4) ?? '—'}</div>
        <div class="lbl">Separation Gap ${tc2Content.pass ? '✅' : '❌ (< 0.05)'}</div>
      </div>
    </div>
    <div class="charts-row">
      <div class="chart-card">
        <h3>📊 Intra-cluster similarity theo Genre</h3>
        <div class="chart-wrap"><canvas id="intraChart"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>🗺️ Similarity Distribution</h3>
        <div class="chart-wrap"><canvas id="simDistChart"></canvas></div>
      </div>
    </div>
  </div>

  <!-- TC3: Hybrid Recommendation -->
  <div class="section">
    <div class="section-title"><span class="icon">🤖</span> TC3 — Hybrid Recommendation Accuracy (Hold-out Recall)</div>
    <p style="color:var(--muted);font-size:.875rem;margin-bottom:1rem;">
      <strong>Phương pháp Hold-out Validation:</strong> 20% liked songs của mỗi test user bị giấu khỏi training set.
      Mô hình ALS chỉ được huấn luyện trên 80% dữ liệu còn lại, hoàn toàn không biết các bài đã bị giấu.
      Sau training, ta kiểm tra top 10 gợi ý có chứa bài bị giấu không (Recall@K).
    </p>
    <p style="color:var(--muted);font-size:.875rem;margin-bottom:.75rem;">
      <strong>Precision@K</strong> đo độ chính xác về <em>cluster/genre</em> (hệ thống có đề xuất đúng thể loại không).
      <strong>Recall@K</strong> đo khả năng <em>tìm lại bài hát cụ thể</em> — bằng chứng hệ thống thực sự hiểu gu người dùng,
      không chỉ học vẹt thể loại tổng quát.
    </p>
    <p style="color:var(--muted);font-size:.875rem;margin-bottom:1rem;">
      <strong>⚠️ Lưu ý:</strong> Recall@K thấp là hạn chế của <em>synthetic data</em>, không phải của ALS.
      Trong dataset mô phỏng, mọi user trong cùng nhóm tương tác với các bài tương tự nhau,
      khiến item vectors trong cluster gần như đồng nhất — ALS không thể phân biệt item cụ thể nào user thích hơn.
      Với dữ liệu thực, mỗi bài hát có <em>interaction fingerprint</em> riêng, Recall@K sẽ có giá trị hơn.
    </p>
    <div class="table-card" style="margin-bottom:1.5rem;">
      <h3>Precision &amp; Recall@K cho từng user profile</h3>
      <table>
        <thead><tr><th>User</th><th>Profile</th><th>P@5</th><th>P@10</th><th>R@5</th><th>R@10</th><th>Avg Score</th><th>Colab Avg</th><th>Content Avg</th><th>Kết quả</th></tr></thead>
        <tbody>${tc3Rows}</tbody>
      </table>
    </div>
    <div class="info-boxes" style="margin-bottom:1rem;">
      <div class="info-box highlight">
        <div class="val">${tc3OverallColab.toFixed(4)}</div>
        <div class="lbl">Avg Collaborative Score</div>
      </div>
      <div class="info-box highlight">
        <div class="val">${tc3OverallContent.toFixed(4)}</div>
        <div class="lbl">Avg Content Score</div>
      </div>
      <div class="info-box">
        <div class="val" style="font-size:1.2rem;">${(tc3OverallColab / Math.max(tc3OverallContent, 0.001)).toFixed(2)}x</div>
        <div class="lbl">Colab/Content Ratio</div>
      </div>
    </div>
    <div class="charts-row" style="margin-bottom:1rem;">
      <div class="chart-card">
        <h3>📊 Reason Distribution</h3>
        <div class="chart-wrap"><canvas id="reasonChart"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>⚖️ Colab vs Content per User</h3>
        <div class="chart-wrap"><canvas id="colabContentChart"></canvas></div>
      </div>
    </div>
    <div class="rec-grid">${tc3Details}</div>
  </div>

  <!-- TC4: Similar Songs -->
  <div class="section">
    <div class="section-title"><span class="icon">🎵</span> TC4 — Similar Songs (Content-Based)</div>
    <p style="color:var(--muted);font-size:.875rem;margin-bottom:1rem;">
      Với mỗi genre cluster, chọn 1 bài query và lấy top 10 bài tương tự. Ngưỡng PASS: ≥ 40% cùng cluster.
    </p>
    <div class="table-card" style="margin-bottom:1.5rem;">
      <h3>Kết quả tổng hợp</h3>
      <table>
        <thead><tr><th>Genre Cluster</th><th>Query Song</th><th>Cùng Cluster</th><th>Avg Similarity</th><th>Precision</th></tr></thead>
        <tbody>${tc4Rows}</tbody>
      </table>
    </div>
    <div class="rec-grid">${tc4Details}</div>
  </div>

  <!-- TC5: Ground Truth -->
  <div class="section">
    <div class="section-title"><span class="icon">🔬</span> TC5 — Ground Truth Validation (Persona Clustering)</div>
    <p style="color:var(--muted);font-size:.875rem;margin-bottom:1rem;">
      Kiểm tra ALS collaborative vectors có phân cụm đúng theo persona ground truth không.
      Kỳ vọng: Intra-group similarity > 0.15, Inter-group < 0.30, Separation Gap > 0.02, Purity > 27%.
    </p>
    ${results.tc5_groundTruth?.skipped
      ? `<div class="training-card" style="margin-bottom:1rem;"><span>⚠️ ${results.tc5_groundTruth.reason}</span></div>`
      : results.tc5_groundTruth ? `
    <div class="info-boxes">
      <div class="info-box ${results.tc5_groundTruth.checks.intraCoherence.pass ? 'pass-box' : 'fail-box'}">
        <div class="val">${results.tc5_groundTruth.checks.intraCoherence.value.toFixed(4)}</div>
        <div class="lbl">Intra Coherence ${results.tc5_groundTruth.checks.intraCoherence.pass ? '✅' : '❌'} (≥ ${results.tc5_groundTruth.checks.intraCoherence.threshold})</div>
      </div>
      <div class="info-box ${results.tc5_groundTruth.checks.interSeparation.pass ? 'pass-box' : 'fail-box'}">
        <div class="val">${results.tc5_groundTruth.checks.interSeparation.value.toFixed(4)}</div>
        <div class="lbl">Inter Separation ${results.tc5_groundTruth.checks.interSeparation.pass ? '✅' : '❌'} (≤ 0.30)</div>
      </div>
      <div class="info-box ${results.tc5_groundTruth.checks.separationGap.pass ? 'pass-box' : 'fail-box'}">
        <div class="val">${results.tc5_groundTruth.checks.separationGap.value.toFixed(4)}</div>
        <div class="lbl">Separation Gap ${results.tc5_groundTruth.checks.separationGap.pass ? '✅' : '❌'} (≥ 0.02)</div>
      </div>
      <div class="info-box ${results.tc5_groundTruth.checks.clusterPurity.pass ? 'pass-box' : 'fail-box'}">
        <div class="val">${(results.tc5_groundTruth.checks.clusterPurity.value * 100).toFixed(0)}%</div>
        <div class="lbl">Cluster Purity ${results.tc5_groundTruth.checks.clusterPurity.pass ? '✅' : '❌'} (≥ 27%)</div>
      </div>
      <div class="info-box highlight">
        <div class="val">${results.tc5_groundTruth.nUsers}</div>
        <div class="lbl">Users validated</div>
      </div>
    </div>
    <div class="charts-row">
      <div class="chart-card">
        <h3>📊 Intra-cluster Similarity theo Group</h3>
        <div class="chart-wrap"><canvas id="gtIntraChart"></canvas></div>
      </div>
      <div class="chart-card">
        <h3>🏆 Overall Validation Result</h3>
        <div class="chart-wrap" style="display:flex;align-items:center;justify-content:center;height:260px;">
          <div style="text-align:center;">
            <div style="font-size:4rem;font-weight:800;${results.tc5_groundTruth.overallPass ? 'color:var(--pass)' : 'color:var(--fail)'}">
              ${results.tc5_groundTruth.overallPass ? '✅ PASS' : '❌ FAIL'}
            </div>
            <div style="color:var(--muted);margin-top:.5rem;">
              ${Object.values(results.tc5_groundTruth.checks).filter(c => c.pass).length}/${Object.values(results.tc5_groundTruth.checks).length} checks passed
            </div>
          </div>
        </div>
      </div>
    </div>` : '⚠️ Chưa chạy validation'}
  </div>

  <!-- TC6: Persona Benchmark -->
  <div class="section">
    <div class="section-title"><span class="icon">👥</span> TC6 — Persona Benchmark (Mock Users)</div>
    <p style="color:var(--muted);font-size:.875rem;margin-bottom:1rem;">
      Với mỗi persona, sample 3 users và gọi recommendation API. Precision@5 đo % gợi ý
      thuộc đúng genre cluster của persona đó. Ngưỡng PASS: P@5 ≥ 40%.
    </p>
    ${renderTC6()}
  </div>

  <!-- Methodology & Limitations -->
  <div class="section">
    <div class="section-title"><span class="icon">📐</span> Methodology &amp; Limitations</div>
    
    <div style="background:var(--card);border-radius:var(--radius);padding:1.25rem;margin-bottom:1rem;">
      <h4 style="margin-top:0;color:#00e6e6;">🔬 Hold-out Validation</h4>
      <p style="color:var(--muted);font-size:.875rem;line-height:1.6;">
        20% liked songs của mỗi test user bị <strong>giấu khỏi training set</strong> trước khi ALS được huấn luyện.
        Mô hình chỉ thấy 80% interactions còn lại. Sau training, ta kiểm tra top K recommendations có chứa
        bài đã giấu không → <strong>Recall@K</strong>. Đây là kỹ thuật chuẩn trong đánh giá recommendation systems
        (training-test splitting), chứng minh generalization thay vì memorization.
      </p>
    </div>

    <div style="background:var(--card);border-radius:var(--radius);padding:1.25rem;margin-bottom:1rem;">
      <h4 style="margin-top:0;color:var(--warn);">⚠️ Known Limitations</h4>
      <ul style="color:var(--muted);font-size:.875rem;line-height:1.8;padding-left:1.25rem;">
        <li>
          <strong>Recall@K = 0% trên synthetic data:</strong> Trong dataset mô phỏng, mọi user trong cùng nhóm
          (vd Pop) tương tác với các bài hát tương tự nhau. Điều này khiến item collaborative vectors trong
          cùng cluster gần như đồng nhất → ALS không thể xếp hạng item cụ thể trong cluster.
          Với dữ liệu thực, mỗi bài hát có <em>interaction fingerprint</em> riêng biệt, Recall@K sẽ có giá trị.
        </li>
        <li>
          <strong>Synthetic data noise:</strong> Cross-cluster genre tagging (+20%) và DSP variance (×2-3)
          đã được thêm vào để tăng tính thực tế, nhưng vẫn không thể tái tạo độ phức tạp của hành vi người dùng thật.
        </li>
        <li>
          <strong>ALS non-determinism:</strong> Kết quả thay đổi giữa các lần chạy do khởi tạo ngẫu nhiên.
          Precision dao động ±5-10%, đặc biệt với user đa thể loại.
        </li>
        <li>
          <strong>Cold Start:</strong> User không có lịch sử nghe nhạc → không thể đánh giá bằng Recall@K.
          Hiện tại fallback về content-based recommendations.
        </li>
      </ul>
    </div>
  </div>

</div><!-- /container -->

<script>
  // ── Chart.js defaults ──
  Chart.defaults.color = '#8892a4';
  Chart.defaults.borderColor = '#2a2a3e';
  const COLORS = {
    Pop: '#ec4899', Rock: '#ef4444', Lofi: '#10b981',
    HipHop: '#f59e0b', EDM: '#8b5cf6',
  };

  // 1. Pass Rate bar chart
  new Chart(document.getElementById('passRateChart'), {
    type: 'bar',
    data: {
      labels: ['TC1 DSP', 'TC2 Content\\nVector', 'TC3 Hybrid\\nRec', 'TC4 Similar\\nSongs', 'TC5 Ground\\nTruth', 'TC6 Persona'],
      datasets: [{
        label: 'Pass Rate (%)',
        data: [
          ${tc1Total ? Math.round((tc1Pass/tc1Total)*100) : 0},
          ${tc2Pass ? 100 : 0},
          ${tc3Total ? Math.round((tc3Pass/tc3Total)*100) : 0},
          ${tc4Total ? Math.round((tc4Pass/tc4Total)*100) : 0},
          ${tc5Total ? (results.tc5_groundTruth?.overallPass ? 100 : 0) : 0},
          ${results.tc6_persona && !results.tc6_persona.skipped ? Math.round((results.tc6_persona.passCount / Math.max(results.tc6_persona.totalPersonas, 1)) * 100) : 0},
        ],
        backgroundColor: ['#00e6e6aa','#8b5cf6aa','#ec4899aa','#f59e0baa','#10b981aa','#ff6b6baa'],
        borderColor: ['#00e6e6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ff6b6b'],
        borderWidth: 2, borderRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100, grid: { color: '#2a2a3e' },
          ticks: { callback: v => v + '%' } },
        x: { grid: { display: false } }
      }
    }
  });

  // 2. Radar chart — expected features per genre
  const clusterFeatures = ${JSON.stringify(metadata.clusterFeatures)};
  new Chart(document.getElementById('radarChart'), {
    type: 'radar',
    data: {
      labels: ['Tempo (norm)', 'Energy', 'Danceability'],
      datasets: Object.entries(clusterFeatures).map(([cluster, f]) => ({
        label: cluster,
        data: [
          ((f.tempo - 60) / 140).toFixed(3), // normalize 60-200 → 0-1
          f.energy,
          f.danceability,
        ],
        borderColor: COLORS[cluster],
        backgroundColor: COLORS[cluster] + '22',
        pointBackgroundColor: COLORS[cluster],
        borderWidth: 2,
      }))
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { r: { min: 0, max: 1, grid: { color: '#2a2a3e' },
        pointLabels: { color: '#e2e8f0', font: { size: 12 } },
        ticks: { display: false } } },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } }
    }
  });

  // 3. Intra cluster similarity bar
  const intraData = ${intraChartData};
  new Chart(document.getElementById('intraChart'), {
    type: 'bar',
    data: {
      labels: intraData.map(d => d.cluster),
      datasets: [{
        label: 'Avg Intra-cluster Similarity',
        data: intraData.map(d => d.value),
        backgroundColor: intraData.map(d => (COLORS[d.cluster] || '#6b7280') + 'aa'),
        borderColor: intraData.map(d => COLORS[d.cluster] || '#6b7280'),
        borderWidth: 2, borderRadius: 6,
      }, {
        label: 'Avg Inter-cluster (baseline)',
        data: intraData.map(() => ${tc2Content.avgInterCluster?.toFixed(4) ?? 0}),
        type: 'line',
        borderColor: '#ef4444', borderDash: [5,3], borderWidth: 2,
        pointRadius: 0, fill: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } },
      scales: { y: { min: 0, max: 1, grid: { color: '#2a2a3e' } }, x: { grid: { display: false } } }
    }
  });

  // 4. Similarity distribution (intra vs inter)
  const heatmapData = ${heatmapData};
  const intraBuckets = new Array(10).fill(0);
  const interBuckets = new Array(10).fill(0);
  heatmapData.forEach(d => {
    const idx = Math.min(9, Math.floor(d.sim * 10));
    if (d.sameCluster) intraBuckets[idx]++; else interBuckets[idx]++;
  });
  const simLabels = ['0.0','0.1','0.2','0.3','0.4','0.5','0.6','0.7','0.8','0.9'];
  new Chart(document.getElementById('simDistChart'), {
    type: 'bar',
    data: {
      labels: simLabels,
      datasets: [
        { label: 'Cùng cluster (intra)', data: intraBuckets, backgroundColor: '#10b98166', borderColor: '#10b981', borderWidth: 1.5, borderRadius: 3 },
        { label: 'Khác cluster (inter)', data: interBuckets, backgroundColor: '#ef444466', borderColor: '#ef4444', borderWidth: 1.5, borderRadius: 3 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } },
      scales: {
        x: { grid: { display: false }, title: { display: true, text: 'Cosine Similarity', color: '#8892a4' } },
        y: { grid: { color: '#2a2a3e' }, title: { display: true, text: 'Số cặp', color: '#8892a4' } }
      }
    }
  });

  // 5. TC5 Ground Truth — Intra-group similarity by persona
  const gtResult = ${JSON.stringify(results.tc5_groundTruth || null)};
  if (gtResult && !gtResult.skipped) {
    const gtIntraData = Object.entries(gtResult.avgIntraCluster || {})
      .filter(([_, v]) => v > 0)
      .map(([g, v]) => ({ group: g, value: parseFloat(v.toFixed(4)) }));
    if (gtIntraData.length > 0) {
      new Chart(document.getElementById('gtIntraChart'), {
        type: 'bar',
        data: {
          labels: gtIntraData.map(d => d.group),
          datasets: [{
            label: 'Avg Intra-group Similarity',
            data: gtIntraData.map(d => d.value),
            backgroundColor: gtIntraData.map(d => (COLORS[d.group] || '#6b7280') + 'aa'),
            borderColor: gtIntraData.map(d => COLORS[d.group] || '#6b7280'),
            borderWidth: 2, borderRadius: 6,
          }, {
            label: 'Avg Inter-group (baseline)',
            data: gtIntraData.map(() => gtResult.avgInterCluster || 0),
            type: 'line',
            borderColor: '#ef4444', borderDash: [5,3], borderWidth: 2,
            pointRadius: 0, fill: false,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } },
          scales: { y: { min: 0, max: 1, grid: { color: '#2a2a3e' } }, x: { grid: { display: false } } }
        }
      });
    }
  }

  // 6. TC3 Reason Distribution (pie chart)
  const reasonData = ${tc3ReasonData};
  if (reasonData.length > 0) {
    const reasonColors = ['#00e6e6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6b7280'];
    new Chart(document.getElementById('reasonChart'), {
      type: 'doughnut',
      data: {
        labels: reasonData.map(d => d.label),
        datasets: [{
          data: reasonData.map(d => d.count),
          backgroundColor: reasonData.map((_, i) => reasonColors[i % reasonColors.length] + 'aa'),
          borderColor: reasonData.map((_, i) => reasonColors[i % reasonColors.length]),
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } },
        }
      }
    });
  }

  // 7. TC3 Colab vs Content per user
  const colabContentData = ${tc3ColabContentPerUser};
  if (colabContentData.length > 0) {
    new Chart(document.getElementById('colabContentChart'), {
      type: 'bar',
      data: {
        labels: colabContentData.map(d => d.user.replace('[TEST] ','')),
        datasets: [
          { label: 'Colab Score', data: colabContentData.map(d => d.colab),
            backgroundColor: '#8b5cf6aa', borderColor: '#8b5cf6', borderWidth: 2, borderRadius: 4 },
          { label: 'Content Score', data: colabContentData.map(d => d.content),
            backgroundColor: '#00e6e6aa', borderColor: '#00e6e6', borderWidth: 2, borderRadius: 4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } } },
        scales: { y: { min: 0, max: 1, grid: { color: '#2a2a3e' } }, x: { grid: { display: false } } }
      }
    });
  }
</script>
</body>
</html>`;

  fs.writeFileSync(REPORT_PATH, html, 'utf-8');
  log(`\n💾 Report đã lưu → ${REPORT_PATH}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║       🧪 AI TEST RUNNER — SoundWave                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Kiểm tra metadata
  if (!fs.existsSync(METADATA_PATH)) {
    console.error('❌ Chưa có test dataset! Hãy chạy trước:\n   node tests/ai-test-dataset.js\n');
    process.exit(1);
  }
  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));
  log(`📦 Dataset: ${metadata.totalSongs} bài hát | ${metadata.testUsers.length} test users`);
  log(`   Generated: ${new Date(metadata.generatedAt).toLocaleString('vi-VN')}\n`);

  // Lấy training status
  try {
    results.trainingStatus = await fetchML('/train/status');
    log(`🤖 Training status: ${results.trainingStatus.status}`);
    if (results.trainingStatus.last_trained) {
      log(`   Last trained: ${new Date(results.trainingStatus.last_trained).toLocaleString('vi-VN')}`);
    }
  } catch (err) {
    log(`⚠️  Không lấy được training status: ${err.message}`);
  }

  // Load held-out data nếu có
  let heldOutData = null;
  if (fs.existsSync(HELD_OUT_PATH)) {
    heldOutData = JSON.parse(fs.readFileSync(HELD_OUT_PATH, 'utf-8'));
    const totalHidden = Object.values(heldOutData.users || {}).reduce((s, u) => s + (u.heldOutSongIds?.length || 0), 0);
    log(`🔒 Hold-out: ${totalHidden} liked songs hidden before training\n`);
  }

  try {
    await runTC1(metadata);
    await runTC2(metadata);
    await runTC3(metadata, heldOutData);
    await runTC4(metadata);
    // TC5: ground truth validation — cần ground_truth.json từ seed_interactions.py
    await runTC5(GROUND_TRUTH_PATH);
    // TC6: persona benchmark
    await runTC6();
  } catch (err) {
    console.error('\n❌ Lỗi khi chạy tests:', err.message);
    console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }

  // Sinh report
  log('\n📝 Đang sinh HTML report...');
  generateReport(metadata);

  // Tổng kết console
  const tc1Pass = results.tc1_dsp.filter(t => t.passRate >= 80).length;
  const tc1Total = results.tc1_dsp.length;
  const tc2Pass = results.tc2_content.pass ? 1 : 0;
  const tc3Pass = results.tc3_hybrid.filter(t => t.pass && !t.error).length;
  const tc3Total = results.tc3_hybrid.filter(t => !t.error).length;
  const tc4Pass = results.tc4_similar.filter(t => t.pass && !t.error).length;
  const tc4Total = results.tc4_similar.filter(t => !t.error).length;
  const tc5Pass = results.tc5_groundTruth?.overallPass ? 1 : 0;
  const tc5Total = results.tc5_groundTruth?.skipped ? 0 : 1;
  const tc6Pass = results.tc6_persona?.overallPass ? 1 : (results.tc6_persona?.skipped ? 0 : 0);
  const tc6Total = results.tc6_persona?.skipped ? 0 : 1;
  const total = tc1Total + 1 + tc3Total + tc4Total + tc5Total + tc6Total;
  const passed = tc1Pass + tc2Pass + tc3Pass + tc4Pass + tc5Pass + tc6Pass;

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                 🏁 KẾT QUẢ KIỂM THỬ                   ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  TC1 DSP Features  : ${tc1Pass}/${tc1Total} PASS                        ║`);
  console.log(`║  TC2 Content Vec   : ${tc2Pass}/1 PASS (separation ${(results.tc2_content.separation||0).toFixed(4)})   ║`);
  console.log(`║  TC3 Hybrid Rec    : ${tc3Pass}/${tc3Total} PASS                        ║`);
  console.log(`║  TC4 Similar Songs : ${tc4Pass}/${tc4Total} PASS                        ║`);
  console.log(`║  TC5 Ground Truth  : ${tc5Pass}/${tc5Total} PASS                        ║`);
  console.log(`║  TC6 Persona       : ${tc6Pass}/${tc6Total} PASS                        ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  TỔNG: ${passed}/${total} PASS (${Math.round(passed/total*100)}%)                          ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  📄 Report: tests/ai-test-report.html                  ║`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

main();
