import { describe, it, expect } from 'vitest';
import { parseOrgCsv } from './csvParser';

const mockCsv = `First Name,Last Name,Job Title,Team,Work Email,Supervisor name,Status
Marc,Bobzien,Head of Engineering,,Marc.Bobzien@dkbcodefactory.com,"Lehsten, Alexander",FILLED
Jesus Manuel,Sanchez Delgado,Chapter Lead Engineering (Frontend),,manuel.sanchez@dkbcodefactory.com,"Bobzien, Marc",FILLED
Anton,Katzer,Principal Engineer (Frontend),Kreditwelt & Ablage,anton.katzer@dkbcodefactory.com,"Sanchez Delgado, Jesus Manuel",FILLED`;

describe('csvParser', () => {
  it('should parse CSV and return nodes and edges', () => {
    const { nodes, edges } = parseOrgCsv(mockCsv);

    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);

    const marc = nodes.find(n => n.id === 'Marc.Bobzien@dkbcodefactory.com');
    expect(marc).toBeDefined();
    expect(marc?.data.firstName).toBe('Marc');
    expect(marc?.data.lastName).toBe('Bobzien');

    const manuel = nodes.find(n => n.id === 'manuel.sanchez@dkbcodefactory.com');
    expect(manuel).toBeDefined();
    
    // Check edge from manuel to marc
    const edge = edges.find(e => e.source === 'Marc.Bobzien@dkbcodefactory.com' && e.target === 'manuel.sanchez@dkbcodefactory.com');
    expect(edge).toBeDefined();
  });

  it('should handle "LastName, FirstName" supervisor matching', () => {
    const { edges } = parseOrgCsv(mockCsv);
    // manuel's supervisor is "Bobzien, Marc"
    const edge = edges.find(e => e.target === 'manuel.sanchez@dkbcodefactory.com');
    expect(edge?.source).toBe('Marc.Bobzien@dkbcodefactory.com');
  });
});
