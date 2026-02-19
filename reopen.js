import fs from 'fs';
const STATE_FILE = 'org_state.json';

// 1. Load from server
console.log('Loading state...');
const data = fs.readFileSync(STATE_FILE, 'utf8');
const savedState = JSON.parse(data);

// 2. OrgChart initialization
let nodes = [...savedState.nodes];
let edges = [...savedState.edges];

// 3. Auto-save (simulate 1s delay)
console.log('Simulating auto-save in 1s...');
setTimeout(() => {
  const currentState = {
    nodes,
    edges,
    collapsedNodes: savedState.collapsedNodes || [],
    expandedNodes: savedState.expandedNodes || [],
    maxDepth: savedState.maxDepth || 10,
    leafColumns: savedState.leafColumns || 1
  };
  
  fs.writeFileSync(STATE_FILE, JSON.stringify(currentState, null, 2));
  console.log('Auto-save complete.');
  
  // Verify if our node is still there
  const newData = fs.readFileSync(STATE_FILE, 'utf8');
  if (newData.includes('empty-1770933171591')) {
    console.log('Node is STILL THERE. Bug NOT reproduced with basic logic.');
  } else {
    console.log('Node is GONE! Bug REPRODUCED!');
  }
}, 1000);
