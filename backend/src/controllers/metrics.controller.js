const os = require('os');

const getMetrics = (req, res) => {
  const memory = process.memoryUsage();
  const uptime = process.uptime();

  res.json({
    process: {
      pid: process.pid,
      uptime: Math.floor(uptime),
      uptimeHuman: `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      nodeVersion: process.version,
      platform: process.platform,
    },
    memory: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
      external: memory.external,
    },
    os: {
      hostname: os.hostname(),
      cpus: os.cpus().length,
      loadAvg: os.loadavg(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
    },
    timestamp: new Date().toISOString(),
  });
};

module.exports = { getMetrics };
