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

  // Map to find email by "LastName, FirstName"
  const nameToEmailMap: Record<string, string> = {};
  const teams = new Set<string>();

  rawData.forEach((row) => {
    const email = row['Work Email'];
    const firstName = row['First Name'];
    const lastName = row['Last Name'];
    const team = row['Team'];
    const nameKey = `${lastName}, ${firstName}`;
    nameToEmailMap[nameKey] = email;
    if (team) teams.add(team);

    const status = (row['Status'] || 'FILLED').toUpperCase() as 'FILLED' | 'EMPTY';

    nodes.push({
      id: email,
      type: 'person',
      data: {
        firstName,
        lastName,
        jobTitle: row['Job Title'],
        team,
        workEmail: email,
        supervisorName: row['Supervisor name'],
        status: status === 'EMPTY' ? 'EMPTY' : 'FILLED',
        startDate: normalizeDate(row['Hire Date'] || row['Start Date'] || ''),
        exitDate: normalizeDate(row['Contract Termination Date'] || row['Exit Date'] || ''),
        probationEndDate: normalizeDate(row['Probation Period Ends'] || ''),
      },
      position: { x: 0, y: 0 },
    });
  });

  // Create team group nodes (optional, but requested in plan)
  // For now, let's just make sure we have the team info in data
  // We will handle visual grouping in the OrgChart component if needed

  rawData.forEach((row) => {
    const supervisorName = row['Supervisor name'];
    const email = row['Work Email'];
    
    if (supervisorName && nameToEmailMap[supervisorName]) {
      edges.push({
        id: `e-${nameToEmailMap[supervisorName]}-${email}`,
        source: nameToEmailMap[supervisorName],
        target: email,
      });
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
