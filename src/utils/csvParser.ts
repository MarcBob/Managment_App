import Papa from 'papaparse';

export interface OrgNodeData {
  firstName: string;
  lastName: string;
  jobTitle: string;
  team: string;
  workEmail: string;
  supervisorName: string;
  status: 'FILLED' | 'EMPTY';
  startDate?: string;
  exitDate?: string;
  probationEndDate?: string;
}

export interface OrgNode {
  id: string;
  type: string;
  data: OrgNodeData;
  position: { x: number; y: number };
}

export interface OrgEdge {
  id: string;
  source: string;
  target: string;
}

const normalizeDate = (dateStr: string) => {
  if (!dateStr) return '';
  
  // Try to parse the date
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    // If native parsing fails, try manual DD.MM.YYYY or MM/DD/YYYY
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length === 3) {
      // Check if first part is year (YYYY-MM-DD)
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      // Check if third part is year (DD.MM.YYYY or MM/DD/YYYY)
      if (parts[2].length === 4) {
        // We'll return it in a way that can be parsed or just return as is
        // But the native Date constructor is better for this
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return dateStr;
  }
  
  // Format as YYYY-MM-DD using local time to avoid timezone shifts
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseOrgCsv = (csvString: string) => {
  const result = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  });

  const rawData = result.data as any[];
  const nodes: OrgNode[] = [];
  const edges: OrgEdge[] = [];

  // Map to find ID by "LastName, FirstName" (case-insensitive)
  const nameToIdMap: Record<string, string> = {};
  const teams = new Set<string>();

  rawData.forEach((row, index) => {
    const email = row['Work Email'];
    const firstName = row['First Name'];
    const lastName = row['Last Name'];
    const team = row['Team'];
    
    // Generate a unique ID: use email if available, otherwise a generated one
    const id = email || `node-${lastName}-${firstName}-${index}`.replace(/\s+/g, '_');
    
    const nameKey = `${lastName}, ${firstName}`.toLowerCase();
    nameToIdMap[nameKey] = id;
    if (team) teams.add(team);
    // ... (rest of first loop)
    const status = (row['Status'] || 'FILLED').toUpperCase() as 'FILLED' | 'EMPTY';

    nodes.push({
      id,
      type: 'person',
      data: {
        firstName,
        lastName,
        jobTitle: row['Job Title'],
        team,
        workEmail: email || '',
        supervisorName: row['Supervisor name'],
        status: status === 'EMPTY' ? 'EMPTY' : 'FILLED',
        startDate: normalizeDate(row['Hire Date'] || row['Start Date'] || ''),
        exitDate: normalizeDate(row['Contract Termination Date'] || row['Exit Date'] || ''),
        probationEndDate: normalizeDate(row['Probation Period Ends'] || ''),
      },
      position: { x: 0, y: 0 },
    });
  });

  rawData.forEach((row, index) => {
    const supervisorName = row['Supervisor name'];
    const email = row['Work Email'];
    const firstName = row['First Name'];
    const lastName = row['Last Name'];
    
    // The ID of the current node
    const id = email || `node-${lastName}-${firstName}-${index}`.replace(/\s+/g, '_');
    
    if (supervisorName) {
      const normalizedSupervisorName = supervisorName.toLowerCase();
      if (nameToIdMap[normalizedSupervisorName]) {
        edges.push({
          id: `e-${nameToIdMap[normalizedSupervisorName]}-${id}`,
          source: nameToIdMap[normalizedSupervisorName],
          target: id,
        });
      }
    }
  });

  return { nodes, edges };
};

export const exportToCsv = (nodes: OrgNode[], edges: OrgEdge[]) => {
  const nameToEmailMap: Record<string, string> = {};
  nodes.forEach(node => {
    if (node.data.status === 'FILLED') {
      const nameKey = `${node.data.lastName}, ${node.data.firstName}`;
      nameToEmailMap[node.id] = nameKey;
    }
  });

  const csvRows = nodes.map(node => {
    const parentEdge = edges.find(e => e.target === node.id);
    const supervisorName = parentEdge ? (nameToEmailMap[parentEdge.source] || '') : '';
    
    return {
      'First Name': node.data.firstName,
      'Last Name': node.data.lastName,
      'Job Title': node.data.jobTitle,
      'Team': node.data.team,
      'Work Email': node.data.workEmail,
      'Supervisor name': supervisorName,
      'Status': node.data.status,
      'Start Date': node.data.startDate || '',
      'Exit Date': node.data.exitDate || '',
      'Probation Period Ends': node.data.probationEndDate || '',
    };
  });

  return Papa.unparse(csvRows);
};

export const exportRecruiterViewToCsv = (nodes: OrgNode[], edges: OrgEdge[]) => {
  const emptyNodes = nodes.filter(node => node.data.status === 'EMPTY');
  
  const nameToEmailMap: Record<string, string> = {};
  nodes.forEach(node => {
    if (node.data.status === 'FILLED') {
      const nameKey = `${node.data.lastName}, ${node.data.firstName}`;
      nameToEmailMap[node.id] = nameKey;
    }
  });

  const csvRows = emptyNodes.map(node => {
    const parentEdge = edges.find(e => e.target === node.id);
    const supervisorName = parentEdge ? (nameToEmailMap[parentEdge.source] || '') : '';
    
    return {
      'First Name': node.data.firstName,
      'Last Name': node.data.lastName,
      'Job Title': node.data.jobTitle,
      'Team': node.data.team,
      'Work Email': node.data.workEmail,
      'Supervisor name': supervisorName,
      'Status': node.data.status,
      'Start Date': node.data.startDate || '',
      'Exit Date': node.data.exitDate || '',
      'Probation Period Ends': node.data.probationEndDate || '',
    };
  });

  return Papa.unparse(csvRows);
};

export const importRecruiterViewFromCsv = (
  currentNodes: OrgNode[], 
  currentEdges: OrgEdge[], 
  csvContent: string
) => {
  // 1. Remove existing EMPTY positions
  const filledNodes = currentNodes.filter(node => node.data.status !== 'EMPTY');
  const filledNodeIds = new Set(filledNodes.map(n => n.id));
  const remainingEdges = currentEdges.filter(edge => 
    filledNodeIds.has(edge.source) && filledNodeIds.has(edge.target)
  );

  // 2. Parse the new recruiter CSV
  const { nodes: newEmptyNodes, edges: newEdges } = parseOrgCsv(csvContent);

  // 3. Ensure all imported nodes are marked as EMPTY (just in case)
  newEmptyNodes.forEach(node => {
    node.data.status = 'EMPTY';
    // Ensure ID is unique or clearly an empty ID if not already
    if (!node.id.startsWith('empty-')) {
      node.id = `empty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  });

  // 4. Create a name-to-id map for existing nodes for re-linking
  const nameToIdMap: Record<string, string> = {};
  filledNodes.forEach(node => {
    const nameKey = `${node.data.lastName}, ${node.data.firstName}`.toLowerCase();
    nameToIdMap[nameKey] = node.id;
  });

  // 5. Re-link the new empty nodes to their supervisors if they exist in current plan
  const finalEdges = [...remainingEdges];
  
  // PapaParse unparse/parse might have changed supervisor names or they come from CSV
  // parseOrgCsv already tried to create edges based on Supervisor name.
  // We need to make sure those edges point to EXISTING filled nodes.
  
  // Actually, parseOrgCsv uses its own internal nameToIdMap. 
  // We should probably manually re-process the new empty nodes' supervisors against our current nodes.
  
  const resultNodes = [...filledNodes, ...newEmptyNodes];
  
  // We need to find the supervisor for each new empty node in the current filledNodes
  newEmptyNodes.forEach(node => {
    const supervisorName = node.data.supervisorName;
    if (supervisorName) {
      const normalizedSupervisorName = supervisorName.toLowerCase();
      const supervisorId = nameToIdMap[normalizedSupervisorName];
      if (supervisorId) {
        finalEdges.push({
          id: `e-${supervisorId}-${node.id}`,
          source: supervisorId,
          target: node.id
        });
      }
    }
  });

  return { nodes: resultNodes, edges: finalEdges };
};
