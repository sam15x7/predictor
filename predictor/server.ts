import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import { wc26Fetch } from './server/services/wc26Auth';

const WC_COMPETITION_MARKERS = [
  'fifa world cup', 'world cup 2026', 'wc 2026', 'worldcup26', 'worldcup2026', '2026'
];

function isWCData(item: any) {
  if (!item) return false;
  const haystack = [
    item.competition, item.league, item.tournament, item.season, item.name
  ].filter(Boolean).join(' ').toLowerCase();
  
  if (!haystack) return true;
  return WC_COMPETITION_MARKERS.some(m => haystack.includes(m));
}

const wc26Cache = new Map<string, { data: any, expiry: number }>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // [WC2026 ENHANCEMENT — Task 1]
  app.get('/api/wc26/:endpoint', async (req, res) => {
    const endpoint = req.params.endpoint;
    if (!['games', 'groups', 'teams', 'stadiums'].includes(endpoint)) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    try {
      const cacheKey = `/get/${endpoint}`;
      const cached = wc26Cache.get(cacheKey);
      
      let data;
      if (cached && Date.now() < cached.expiry) {
        data = cached.data;
      } else {
        data = await wc26Fetch(cacheKey);
        wc26Cache.set(cacheKey, { data, expiry: Date.now() + 10 * 60 * 1000 });
      }

      let filteredData = data;
      if (Array.isArray(data)) {
         filteredData = data.filter(isWCData);
      } else if (data && data.data && Array.isArray(data.data)) {
         filteredData = { ...data, data: data.data.filter(isWCData) };
      } else if (!data) {
         return res.json({ data: null, fallback: true });
      }

      res.json({ data: filteredData, source: "worldcup26.ir", cachedAt: new Date().toISOString(), ttl: 600 });
    } catch (e: any) {
      res.json({ data: null, error: true, fallback: true });
    }
  });

  // Custom API routes definition
  app.get('/api/live-scores', async (req, res) => {
    try {
      const apiKey = process.env.API_FOOTBALL_KEY || "d5a28f5444664234ae1401e2d94c7fae"; 
      
      const response = await axios.get('https://v3.football.api-sports.io/fixtures?live=all', {
        headers: {
          'x-apisports-key': apiKey,
        }
      });
      
      if (response.data && response.data.response) {
        response.data.response = response.data.response.filter((match: any) => 
          match.league && match.league.id === 1 // League ID 1 = FIFA World Cup
        );
      }
      
      res.json(response.data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch live scores.' });
    }
  });

  app.get('/api/upcoming', async (req, res) => {
    try {
      const apiKey = process.env.API_FOOTBALL_KEY || "d5a28f5444664234ae1401e2d94c7fae"; 
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`https://v3.football.api-sports.io/fixtures?date=${today}&league=1&season=2026`, {
        headers: {
          'x-apisports-key': apiKey,
        }
      });
      
      res.json(response.data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch upcoming matches.' });
    }
  });

  // Mock News Feed for FIFA WC 2026
  app.get('/api/news', (req, res) => {
    res.json([
      { id: 1, source: "FIFA.com", title: "Messi confirms fitness for opening match vs Algeria", time: "2 hours ago", url: "#" },
      { id: 2, source: "Sky Sports", title: "MetLife Stadium turf complete ahead of massive Brazil vs Morocco clash", time: "4 hours ago", url: "#" },
      { id: 3, source: "ESPN", title: "England squad touches down in Dallas for World Cup opener", time: "6 hours ago", url: "#" },
      { id: 4, source: "The Athletic", title: "USA manager optimistic as Pulisic returns to training", time: "8 hours ago", url: "#" },
      { id: 5, source: "Goal.com", title: "World Cup 2026: The ultimate predictions and group previews", time: "12 hours ago", url: "#" }
    ]);
  });

  // Mock H2H History for matches
  app.get('/api/h2h', (req, res) => {
    const { home, away } = req.query;
    res.json({
      matches: [
        { date: "2022-11-20", homeScore: 2, awayScore: 1, tournament: "World Cup" },
        { date: "2018-06-15", homeScore: 1, awayScore: 1, tournament: "Friendly" },
        { date: "2014-07-04", homeScore: 0, awayScore: 2, tournament: "World Cup" }
      ]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
