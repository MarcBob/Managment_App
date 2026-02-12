import Papa from 'papaparse';

export interface OrgNodeData {
  firstName: string;
  lastName: string;
  jobTitle: string;
  team: string;
  workEmail: string;
  supervisorName: string;
  status: 'FILLED' | 'EMPTY';
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

export const parseOrgCsv = (csvString: string) => {
  const result = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
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
        status: row['Status'] as 'FILLED' | 'EMPTY',
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
    };
  });

  return Papa.unparse(csvRows);
};
