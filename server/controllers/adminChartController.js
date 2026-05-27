const { syncChart } = require('../services/chartService.js');
const prisma = require('../db/index');

const syncChartController = async (req, res) => {
  try {
    const { chartType } = req.body;
    
    if (!chartType || !['DAILY', 'WEEKLY', 'MONTHLY'].includes(chartType)) {
      return res.status(400).json({ error: 'chartType is required and must be DAILY, WEEKLY, or MONTHLY' });
    }

    const result = await syncChart(chartType);
    
    res.status(200).json({ 
      message: `Synced ${chartType} chart successfully`, 
      data: result 
    });
  } catch (error) {
    console.error(`Error syncing chart:`, error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

const getChartHistory = async (req, res) => {
  try {
    const { chartType, date } = req.query; // 'DAILY', 'WEEKLY', or 'MONTHLY', date: 'YYYY-MM-DD'
    
    if (!chartType || !date) {
      return res.status(400).json({ error: 'chartType and date are required' });
    }

    const selectedDate = new Date(date);
    if (isNaN(selectedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    let startTime = new Date(selectedDate);
    startTime.setHours(0, 0, 0, 0);
    let endTime = new Date(selectedDate);
    endTime.setHours(23, 59, 59, 999);

    if (chartType === 'WEEKLY') {
      const dayOfWeek = startTime.getDay(); // 0 is Sunday
      const distanceToMonday = (dayOfWeek + 6) % 7;
      startTime.setDate(startTime.getDate() - distanceToMonday);
      endTime = new Date(startTime);
      endTime.setDate(startTime.getDate() + 6);
      endTime.setHours(23, 59, 59, 999);
    } else if (chartType === 'MONTHLY') {
      startTime.setDate(1);
      endTime = new Date(startTime.getFullYear(), startTime.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Query interactions dynamically
    const interactions = await prisma.interaction.groupBy({
      by: ['songId'],
      where: {
        timeStamp: {
          gte: startTime,
          lte: endTime,
        }
      },
      _count: {
        songId: true,
      },
      orderBy: {
        _count: {
          songId: 'desc',
        }
      },
      take: 50,
    });

    if (interactions.length === 0) {
      return res.status(200).json({ songs: [] });
    }

    const songIds = interactions.map(i => i.songId);
    
    const songs = await prisma.song.findMany({
      where: { id: { in: songIds } },
      include: {
        artists: {
          include: {
            artist: {
              include: { user: { select: { username: true, displayName: true } } }
            }
          }
        }
      }
    });

    const chartSongs = interactions.map((interaction, index) => {
      const songData = songs.find(s => s.id === interaction.songId);
      return {
        rank: index + 1,
        totalScore: interaction._count.songId,
        songId: interaction.songId,
        song: songData
      };
    }).filter(item => item.song); // Ensure song data exists

    res.status(200).json({
      title: `BXH ${chartType} (${startTime.toLocaleDateString()} - ${endTime.toLocaleDateString()})`,
      songs: chartSongs
    });
  } catch (error) {
    console.error(`Error fetching dynamic chart history:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { syncChartController, getChartHistory };
