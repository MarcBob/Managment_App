import fs from 'fs';
const STATE_FILE = 'org_state.json';

const data = fs.readFileSync(STATE_FILE, 'utf8');
const state = JSON.parse(data);

const newId = 'empty-' + Date.now();
const parentId = 'Marc.Bobzien@dkbcodefactory.com';

const newNode = {
  id: newId,
  type: 'person',
  data: {
    firstName: '',
    lastName: '',
    jobTitle: 'New Position',
    team: 'Management',
    status: 'EMPTY',
  },
  position: { x: 0, y: 0 }
};

const newEdge = {
  id: `e-${parentId}-${newId}`,
  source: parentId,
  target: newId
};

state.nodes.push(newNode);
state.edges.push(newEdge);

fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
console.log('Added node:', newId);
