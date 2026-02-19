import { describe, it, expect } from 'vitest';
import { parseOrgCsv } from './csvParser';

const mockCsv = `First Name,Last Name,Job Title,Team,Work Email,Supervisor name,Status,Start Date,Exit Date
Marc,Bobzien,Head of Engineering,,Marc.Bobzien@dkbcodefactory.com,"Lehsten, Alexander",FILLED,2023-01-01,
Jesus Manuel,Sanchez Delgado,Chapter Lead Engineering (Frontend),,manuel.sanchez@dkbcodefactory.com,"Bobzien, Marc",FILLED,2023-02-01,2024-12-31
Anton,Katzer,Principal Engineer (Frontend),Kreditwelt & Ablage,anton.katzer@dkbcodefactory.com,"Sanchez Delgado, Jesus Manuel",FILLED,,`;

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

  it('should handle "LastName, FirstName" supervisor matching', () => {
    const { edges } = parseOrgCsv(mockCsv);
    // manuel's supervisor is "Bobzien, Marc"
    const edge = edges.find(e => e.target === 'manuel.sanchez@dkbcodefactory.com');
    expect(edge?.source).toBe('Marc.Bobzien@dkbcodefactory.com');
  });
});
