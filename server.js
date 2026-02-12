import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;
const STATE_FILE = path.join(process.cwd(), 'org_state.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/load', (req, res) => {
  console.log('[BACKEND] GET /api/load - Checking for state file...');
  if (fs.existsSync(STATE_FILE)) {
    try {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      const parsed = JSON.parse(data);
      console.log(`[BACKEND] State file found. Nodes: ${parsed.nodes?.length || 0}, Edges: ${parsed.edges?.length || 0}`);
      res.json(parsed);
    } catch (error) {
      console.error('[BACKEND] Error reading state file:', error);
      res.status(500).json({ error: 'Failed to read state file' });
    }
  } else {
    console.log('[BACKEND] No state file found at:', STATE_FILE);
    res.status(404).json({ error: 'No state file found' });
  }
});

app.post('/api/save', (req, res) => {
  const { nodes, edges } = req.body;
  console.log(`[BACKEND] POST /api/save - Received state. Nodes: ${nodes?.length || 0}, Edges: ${edges?.length || 0}`);
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(req.body, null, 2));
    console.log('[BACKEND] State saved successfully.');
    res.json({ success: true });
  } catch (error) {
    console.error('[BACKEND] Error saving state file:', error);
    res.status(500).json({ error: 'Failed to save state' });
  }
});

app.listen(port, () => {
  console.log(`[BACKEND] Server listening at http://localhost:${port}`);
  console.log(`[BACKEND] State file path: ${STATE_FILE}`);
});
