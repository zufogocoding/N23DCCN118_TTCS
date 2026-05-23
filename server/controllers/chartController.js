const prisma = require('../db/index');

const getChartByType = async (req, res) => {
  try {
    const { chartType } = req.params;
    
    if (!['DAILY', 'WEEKLY', 'MONTHLY'].includes(chartType)) {
      return res.status(400).json({ error: 'chartType must be DAILY, WEEKLY, or MONTHLY' });
    }

    const chart = await prisma.chart.findFirst({
      where: { chartType },
      include: {
        songs: {
          orderBy: { rank: 'asc' },
          include: {
            song: {
              include: {
                artists: {
                  include: {
                    artist: {
                      include: { user: { select: { username: true, displayName: true } } }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!chart) {
      return res.status(404).json({ error: 'Chart not found' });
    }

    res.status(200).json(chart);
  } catch (error) {
    console.error('Error fetching chart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getChartByType };
