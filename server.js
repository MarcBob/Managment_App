import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3001;
const PLANS_DIR = path.join(process.cwd(), 'plans');
const STATE_FILE = path.join(process.cwd(), 'org_state.json');
const BACKUP_DIR = path.join(PLANS_DIR, 'backups');

if (!fs.existsSync(PLANS_DIR)) {
  fs.mkdirSync(PLANS_DIR);
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
}

// Migration: Move org_state.json to plans/default.json if it exists
if (fs.existsSync(STATE_FILE) && !fs.existsSync(path.join(PLANS_DIR, 'default.json'))) {
  console.log('[BACKEND] Migrating org_state.json to plans/default.json');
  fs.copyFileSync(STATE_FILE, path.join(PLANS_DIR, 'default.json'));
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const noCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

// List all plans
app.get('/api/plans', noCache, (req, res) => {
  try {
    const files = fs.readdirSync(PLANS_DIR);
    const plans = files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list plans' });
  }
});

// Load a specific plan
app.get('/api/load/:name', noCache, (req, res) => {
  const name = req.params.name;
  const filePath = path.join(PLANS_DIR, `${name}.json`);
  
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(data);
      console.log(`[BACKEND] LOAD [${name}] - Nodes: ${parsed.nodes?.length}, Edges: ${parsed.edges?.length}, Updated: ${parsed.lastUpdated}`);
      res.json(parsed);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read plan file' });
    }
  } else {
    res.status(404).json({ error: 'Plan not found' });
  }
});

// Save a specific plan
app.post('/api/save/:name', (req, res) => {
  const name = req.params.name;
  const filePath = path.join(PLANS_DIR, `${name}.json`);
  const backupPath = path.join(BACKUP_DIR, `${name}_${Date.now()}.json.bak`);

  try {
    const newState = req.body;
    
    if (!newState || !newState.nodes) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    if (fs.existsSync(filePath)) {
      // Create backup
      fs.copyFileSync(filePath, backupPath);
      
      // Cleanup old backups (keep last 5)
      const backups = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith(name))
        .sort()
        .reverse();
      if (backups.length > 5) {
        backups.slice(5).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
      }
    }

    console.log(`[BACKEND] SAVE [${name}] - Nodes: ${newState.nodes.length}, Edges: ${newState.edges?.length}, Updated: ${newState.lastUpdated}`);
    
    fs.writeFileSync(filePath, JSON.stringify(newState, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('[BACKEND] Error saving plan:', error);
    res.status(500).json({ error: 'Failed to save plan' });
  }
});

// Legacy support for /api/load and /api/save (points to 'default')
app.get('/api/load', noCache, (req, res) => {
  res.redirect('/api/load/default');
});

app.post('/api/save', (req, res) => {
  // We can't easily redirect a POST with body in all environments, so we just proxy it
  const name = 'default';
  const filePath = path.join(PLANS_DIR, `${name}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save legacy default plan' });
  }
});

app.listen(port, () => {
  console.log(`[BACKEND] Server listening at http://localhost:${port}`);
});
