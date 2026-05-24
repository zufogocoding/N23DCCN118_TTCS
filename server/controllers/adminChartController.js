const { syncChart } = require('../services/chartService.js');

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

module.exports = { syncChartController };
