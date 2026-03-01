import { describe, it, expect } from 'vitest';
import { parseOrgCsv, updatePlanWithCsv } from './csvParser';
import type { OrgNode, OrgEdge } from './csvParser';

const mockCsv = `First Name,Last Name,Job Title,Team,Work Email,Supervisor name,Status,Start Date,Exit Date
Marc,Bobzien,Head of Engineering,,Marc.Bobzien@dkbcodefactory.com,"Lehsten, Alexander",FILLED,2023-01-01,
Jesus Manuel,Sanchez Delgado,Chapter Lead Engineering (Frontend),,manuel.sanchez@dkbcodefactory.com,"Bobzien, Marc",FILLED,2023-02-01,2024-12-31
Anton,Katzer,Principal Engineer (Frontend),Kreditwelt & Ablage,anton.katzer@dkbcodefactory.com,"Sanchez Delgado, Jesus Manuel",FILLED,,`;

const bambooCsv = `First Name,Last Name,Job Title,Team,Work Email,Supervisor name,Hire Date,Contract Termination Date,Probation Period Ends
Marc,Bobzien,Head of Engineering,,Marc.Bobzien@dkbcodefactory.com,"Lehsten, Alexander",2023-01-01,,2023-07-01
Jesus Manuel,Sanchez Delgado,Chapter Lead Engineering (Frontend),,manuel.sanchez@dkbcodefactory.com,"Bobzien, Marc",01/02/2023,2024-12-31,2023-08-01`;

describe('csvParser', () => {
  it('should parse CSV and return nodes and edges including dates', () => {
    const { nodes } = parseOrgCsv(mockCsv);

    expect(nodes).toHaveLength(3);
    
    const marc = nodes.find(n => n.id === 'Marc.Bobzien@dkbcodefactory.com');
    expect(marc?.data.startDate).toBe('2023-01-01');
    expect(marc?.data.exitDate).toBe('');

    const manuel = nodes.find(n => n.id === 'manuel.sanchez@dkbcodefactory.com');
    expect(manuel?.data.startDate).toBe('2023-02-01');
    expect(manuel?.data.exitDate).toBe('2024-12-31');
  });

  it('should parse BambooHR style CSV with different date column names and normalize dates', () => {
    const { nodes } = parseOrgCsv(bambooCsv);

    expect(nodes).toHaveLength(2);
    
    const marc = nodes.find(n => n.id === 'Marc.Bobzien@dkbcodefactory.com');
    expect(marc?.data.startDate).toBe('2023-01-01');
    expect(marc?.data.probationEndDate).toBe('2023-07-01');

    const manuel = nodes.find(n => n.id === 'manuel.sanchez@dkbcodefactory.com');
    // 01/02/2023 becomes 2023-01-02 in most environments
    expect(manuel?.data.startDate).toBe('2023-01-02');
    expect(manuel?.data.exitDate).toBe('2024-12-31');
    expect(manuel?.data.probationEndDate).toBe('2023-08-01');
  });

  it('should handle "LastName, FirstName" supervisor matching', () => {
    const { edges } = parseOrgCsv(mockCsv);
    // manuel's supervisor is "Bobzien, Marc"
    const edge = edges.find(e => e.target === 'manuel.sanchez@dkbcodefactory.com');
    expect(edge?.source).toBe('Marc.Bobzien@dkbcodefactory.com');
  });
});

describe('updatePlanWithCsv', () => {
  const currentNodes: OrgNode[] = [
    {
      id: 'marc@test.com',
      type: 'person',
      data: {
        firstName: 'Marc',
        lastName: 'Bobzien',
        jobTitle: 'Head',
        team: '',
        workEmail: 'marc@test.com',
        supervisorName: '',
        status: 'FILLED'
      },
      position: { x: 0, y: 0 }
    },
    {
      id: 'manager@test.com',
      type: 'person',
      data: {
        firstName: 'Manager',
        lastName: 'One',
        jobTitle: 'Manager',
        team: '',
        workEmail: 'manager@test.com',
        supervisorName: 'Bobzien, Marc',
        status: 'FILLED'
      },
      position: { x: 0, y: 0 }
    },
    {
      id: 'empty-1',
      type: 'person',
      data: {
        firstName: '',
        lastName: '',
        jobTitle: 'Engineer',
        team: '',
        workEmail: '',
        supervisorName: 'One, Manager',
        status: 'EMPTY'
      },
      position: { x: 0, y: 0 }
    }
  ];

  const currentEdges: OrgEdge[] = [
    { id: 'e-marc-manager', source: 'marc@test.com', target: 'manager@test.com' },
    { id: 'e-manager-empty', source: 'manager@test.com', target: 'empty-1' }
  ];

  it('should re-link open position to next supervisor if direct supervisor is gone', () => {
    // Manager One is gone in the new CSV
    const newCsv = `First Name,Last Name,Job Title,Team,Work Email,Supervisor name,Status
Marc,Bobzien,Head,,marc@test.com,,FILLED`;

    const { nodes, edges } = updatePlanWithCsv(currentNodes, currentEdges, newCsv);

    // Should have Marc (from CSV) and Open Position (preserved)
    expect(nodes).toHaveLength(2);
    expect(nodes.find(n => n.data.status === 'EMPTY')).toBeDefined();
    
    // Open Position should be linked to Marc now
    const emptyNode = nodes.find(n => n.data.status === 'EMPTY')!;
    const marcNode = nodes.find(n => n.id === 'marc@test.com')!;
    
    const edge = edges.find(e => e.target === emptyNode.id);
    expect(edge?.source).toBe(marcNode.id);
    expect(emptyNode.data.supervisorName).toBe('Bobzien, Marc');
  });

  it('should make open position a root if no one in the chain exists', () => {
    // Both Marc and Manager are gone
    const newCsv = `First Name,Last Name,Job Title,Team,Work Email,Supervisor name,Status
New,Person,CEO,,new@test.com,,FILLED`;

    const { nodes, edges } = updatePlanWithCsv(currentNodes, currentEdges, newCsv);

    expect(nodes).toHaveLength(2);
    const emptyNode = nodes.find(n => n.data.status === 'EMPTY')!;
    
    // Open Position should have no supervisor now
    const edge = edges.find(e => e.target === emptyNode.id);
    expect(edge).toBeUndefined();
    expect(emptyNode.data.supervisorName).toBe('');
  });

  it('should preserve nested structure of open positions', () => {
    // Marc (FILLED) -> EM (EMPTY) -> Engineer (EMPTY)
    const nestedNodes: OrgNode[] = [
      {
        id: 'marc@test.com',
        type: 'person',
        data: { firstName: 'Marc', lastName: 'Bobzien', jobTitle: 'Head', team: '', workEmail: 'marc@test.com', supervisorName: '', status: 'FILLED' },
        position: { x: 0, y: 0 }
      },
      {
        id: 'empty-em',
        type: 'person',
        data: { firstName: '', lastName: '', jobTitle: 'EM', team: '', workEmail: '', supervisorName: 'Bobzien, Marc', status: 'EMPTY' },
        position: { x: 0, y: 0 }
      },
      {
        id: 'empty-eng',
        type: 'person',
        data: { firstName: '', lastName: '', jobTitle: 'Eng', team: '', workEmail: '', supervisorName: '', status: 'EMPTY' },
        position: { x: 0, y: 0 }
      }
    ];

    const nestedEdges: OrgEdge[] = [
      { id: 'e-marc-em', source: 'marc@test.com', target: 'empty-em' },
      { id: 'e-em-eng', source: 'empty-em', target: 'empty-eng' }
    ];

    // Marc is replaced by a new CEO
    const newCsv = `First Name,Last Name,Job Title,Team,Work Email,Supervisor name,Status
CEO,Boss,CEO,,ceo@test.com,,FILLED`;

    const { edges } = updatePlanWithCsv(nestedNodes, nestedEdges, newCsv);

    // empty-eng should STILL be under empty-em
    const engEdge = edges.find(e => e.target === 'empty-eng');
    expect(engEdge?.source).toBe('empty-em');

    // empty-em should be root because Marc is gone
    const emEdge = edges.find(e => e.target === 'empty-em');
    expect(emEdge).toBeUndefined();
  });

  it('should remove named empty positions if they are not in the new CSV', () => {
    // Marc (FILLED) -> Named Empty Position (EMPTY but has a name) -> True Empty (EMPTY)
    const currentNodes: OrgNode[] = [
      {
        id: 'marc@test.com',
        type: 'person',
        data: { firstName: 'Marc', lastName: 'Bobzien', jobTitle: 'Head', team: '', workEmail: 'marc@test.com', supervisorName: '', status: 'FILLED' },
        position: { x: 0, y: 0 }
      },
      {
        id: 'named-empty',
        type: 'person',
        data: { firstName: 'John', lastName: 'Doe', jobTitle: 'Engineer', team: '', workEmail: 'john@doe.com', supervisorName: 'Bobzien, Marc', status: 'EMPTY' },
        position: { x: 0, y: 0 }
      },
      {
        id: 'true-empty',
        type: 'person',
        data: { firstName: '', lastName: '', jobTitle: 'Engineer', team: '', workEmail: '', supervisorName: 'Doe, John', status: 'EMPTY' },
        position: { x: 0, y: 0 }
      }
    ];

    const currentEdges: OrgEdge[] = [
      { id: 'e-1', source: 'marc@test.com', target: 'named-empty' },
      { id: 'e-2', source: 'named-empty', target: 'true-empty' }
    ];

    const newCsv = `First Name,Last Name,Job Title,Team,Work Email,Supervisor name,Status
Marc,Bobzien,Head,,marc@test.com,,FILLED`;

    const { nodes, edges } = updatePlanWithCsv(currentNodes, currentEdges, newCsv);

    // Should contain Marc and the true-empty position, but NOT the named-empty one
    expect(nodes).toHaveLength(2);
    expect(nodes.find(n => n.id === 'true-empty')).toBeDefined();
    expect(nodes.find(n => n.id === 'named-empty')).toBeUndefined();

    // true-empty should now be under Marc
    const edge = edges.find(e => e.target === 'true-empty');
    expect(edge?.source).toBe('marc@test.com');
  });
});
