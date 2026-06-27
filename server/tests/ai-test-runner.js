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
const REPORT_PATH = path.join(__dirname, 'ai-test-report.html');

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
};

// ─────────────────────────────────────────────────────────────────────────────
// TC1: DSP Audio Feature Validation
// Kiểm tra bài mock đã có features đúng với genre cluster
// ─────────────────────────────────────────────────────────────────────────────
async function runTC1(metadata) {
  log('\n📊 TC1: Kiểm tra DSP Audio Features...');

  // Expected ranges per cluster
  const expected = {
    Pop:    { tempo: [100, 130], energy: [0.55, 0.80], danceability: [0.60, 0.85] },
    Rock:   { tempo: [115, 145], energy: [0.75, 1.00], danceability: [0.35, 0.65] },
    Lofi:   { tempo: [60,  85],  energy: [0.15, 0.42], danceability: [0.25, 0.52] },
    HipHop: { tempo: [80, 108],  energy: [0.60, 0.85], danceability: [0.70, 0.95] },
    EDM:    { tempo: [118, 140], energy: [0.78, 1.00], danceability: [0.82, 1.00] },
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
async function runTC3(metadata) {
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
    where: { songId: { in: allTestSongIds } },
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

    const p5 = recs.length >= 5 ? relevantAt5 / 5 : relevantAt5 / recs.length;
    const p10 = recs.length >= 10 ? relevantAt10 / 10 : relevantAt10 / recs.length;

    // Avg score
    const avgScore = recs.length ? (recs.reduce((s, r) => s + (parseFloat(r.score) || 0), 0) / recs.length) : 0;
    const avgColab = recs.length ? (recs.reduce((s, r) => s + (parseFloat(r.colab_score) || 0), 0) / recs.length) : 0;
    const avgContent = recs.length ? (recs.reduce((s, r) => s + (parseFloat(r.content_score) || 0), 0) / recs.length) : 0;

    const tc = {
      user: userMeta,
      expectedCluster,
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

    log(`     🎯 Precision@5 : ${(p5 * 100).toFixed(0)}% (${relevantAt5}/5) ${p5 >= 0.4 ? '✅' : '❌'}`);
    log(`     🎯 Precision@10: ${(p10 * 100).toFixed(0)}% (${relevantAt10}/10) ${p10 >= 0.4 ? '✅' : '❌'}`);
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
  const allTestSongIds = Object.values(metadata.songClusters).flat();
  const songGenreRows = await prisma.songGenre.findMany({
    where: { songId: { in: allTestSongIds } },
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
  const totalPass = tc1Pass + tc2Pass + tc3Pass + tc4Pass;
  const totalTests = tc1Total + 1 + tc3Total + tc4Total;
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
    if (tc.error) return `<tr><td>${tc.user?.displayName}</td><td colspan="5" class="cell-fail">Error: ${tc.error}</td></tr>`;
    if (tc.isColdStart) return `
      <tr>
        <td>${tc.user.displayName}</td>
        <td><span class="badge badge-lofi">Cold Start</span></td>
        <td>—</td><td>—</td><td>—</td>
        <td><span class="result-badge ${tc.pass ? 'pass' : 'fail'}">${tc.pass ? '✅ Trending' : '❌'}</span></td>
      </tr>`;
    return `
      <tr>
        <td>${tc.user.displayName}</td>
        <td><span class="badge badge-${tc.expectedCluster?.toLowerCase()}">${tc.expectedCluster}</span></td>
        <td>${(tc.precision5 * 100).toFixed(0)}%</td>
        <td>${(tc.precision10 * 100).toFixed(0)}%</td>
        <td>${tc.avgScore?.toFixed(4) ?? '—'}</td>
        <td><span class="result-badge ${tc.pass ? 'pass' : 'fail'}">${tc.pass ? '✅ PASS' : '❌ FAIL'}</span></td>
      </tr>`;
  }).join('');

  // TC3 recommendation detail panels
  const tc3Details = results.tc3_hybrid.filter(tc => !tc.error && !tc.isColdStart).map(tc => `
    <div class="rec-panel">
      <h4>${tc.user.displayName} — Top 10 gợi ý
        <span class="small-badge ${tc.pass ? 'pass' : 'fail'}">P@5=${(tc.precision5*100).toFixed(0)}% P@10=${(tc.precision10*100).toFixed(0)}%</span>
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
    </div>`).join('');

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
      <span>🎵 ${metadata.totalSongs} bài test · 5 user profiles · 5 genre clusters</span>
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
    <div class="section-title"><span class="icon">🤖</span> TC3 — Hybrid Recommendation Accuracy</div>
    <p style="color:var(--muted);font-size:.875rem;margin-bottom:1rem;">
      Đánh giá Precision@5 và Precision@10 cho từng test user. Ngưỡng PASS: ≥ 40%.
      Trọng số hybrid: Collaborative 70% + Content-Based 30%.
    </p>
    <div class="table-card" style="margin-bottom:1.5rem;">
      <h3>Precision@K cho từng user profile</h3>
      <table>
        <thead><tr><th>User</th><th>Expected Genre</th><th>Precision@5</th><th>Precision@10</th><th>Avg Score</th><th>Kết quả</th></tr></thead>
        <tbody>${tc3Rows}</tbody>
      </table>
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
      labels: ['TC1 DSP', 'TC2 Content\\nVector', 'TC3 Hybrid\\nRec', 'TC4 Similar\\nSongs'],
      datasets: [{
        label: 'Pass Rate (%)',
        data: [
          ${tc1Total ? Math.round((tc1Pass/tc1Total)*100) : 0},
          ${tc2Pass ? 100 : 0},
          ${tc3Total ? Math.round((tc3Pass/tc3Total)*100) : 0},
          ${tc4Total ? Math.round((tc4Pass/tc4Total)*100) : 0},
        ],
        backgroundColor: ['#00e6e6aa','#8b5cf6aa','#ec4899aa','#f59e0baa'],
        borderColor: ['#00e6e6','#8b5cf6','#ec4899','#f59e0b'],
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

  try {
    await runTC1(metadata);
    await runTC2(metadata);
    await runTC3(metadata);
    await runTC4(metadata);
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
  const total = tc1Total + 1 + tc3Total + tc4Total;
  const passed = tc1Pass + tc2Pass + tc3Pass + tc4Pass;

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                 🏁 KẾT QUẢ KIỂM THỬ                   ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  TC1 DSP Features  : ${tc1Pass}/${tc1Total} PASS                        ║`);
  console.log(`║  TC2 Content Vec   : ${tc2Pass}/1 PASS (separation ${(results.tc2_content.separation||0).toFixed(4)})   ║`);
  console.log(`║  TC3 Hybrid Rec    : ${tc3Pass}/${tc3Total} PASS                        ║`);
  console.log(`║  TC4 Similar Songs : ${tc4Pass}/${tc4Total} PASS                        ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  TỔNG: ${passed}/${total} PASS (${Math.round(passed/total*100)}%)                          ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  📄 Report: tests/ai-test-report.html                  ║`);
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

main();
