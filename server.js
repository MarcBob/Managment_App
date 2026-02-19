import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3001;
const STATE_FILE = path.join(process.cwd(), 'org_state.json');
const BACKUP_FILE = path.join(process.cwd(), 'org_state.json.bak');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const noCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

app.get('/api/load', noCache, (req, res) => {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      const parsed = JSON.parse(data);
      console.log(`[BACKEND] LOAD - Nodes: ${parsed.nodes?.length}, Edges: ${parsed.edges?.length}, Updated: ${parsed.lastUpdated}`);
      res.json(parsed);
    } catch (error) {
      console.error('[BACKEND] Error reading state file:', error);
      res.status(500).json({ error: 'Failed to read state file' });
    }
  } else {
    res.status(404).json({ error: 'No state file found' });
  }
});

app.post('/api/save', (req, res) => {
  try {
    const newState = req.body;
    
    if (!newState || !newState.nodes) {
      console.error('[BACKEND] SAVE FAILED: Invalid payload');
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Version/Conflict check (Optional but robust)
    if (fs.existsSync(STATE_FILE)) {
      try {
        const currentData = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        const currentBatch = new Date(currentData.lastUpdated || 0).getTime();
        const newBatch = new Date(newState.lastUpdated || 0).getTime();
        
        if (newBatch < currentBatch) {
          console.warn('[BACKEND] SAVE WARNING: Received older state than what is on disk. Ignoring to prevent regression.', {
            disk: currentData.lastUpdated,
            received: newState.lastUpdated
          });
          // We return success: true because the client is just out of sync, 
          // but we don't overwrite.
          return res.json({ success: true, note: 'ignored_older_version' });
        }
      } catch (e) {
        // If disk file is corrupt, just proceed with overwrite
      }
      
      // Create backup
      fs.copyFileSync(STATE_FILE, BACKUP_FILE);
    }

    console.log(`[BACKEND] SAVE SUCCESS - Nodes: ${newState.nodes.length}, Edges: ${newState.edges?.length}, Updated: ${newState.lastUpdated}`);
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(newState, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('[BACKEND] Error saving state file:', error);
    res.status(500).json({ error: 'Failed to save state' });
  }
});

app.listen(port, () => {
  console.log(`[BACKEND] Server listening at http://localhost:${port}`);
});
