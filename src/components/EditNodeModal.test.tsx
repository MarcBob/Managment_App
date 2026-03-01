import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EditNodeModal } from './EditNodeModal';

describe('EditNodeModal', () => {
  const createProps = () => ({
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn(),
    onDelete: vi.fn(),
    nodeId: '1',
    nodeData: { firstName: 'John', lastName: 'Doe', jobTitle: 'Developer', status: 'FILLED' as const },
    existingTeams: [],
    existingJobTitles: [],
    possibleManagers: [],
    currentManagerId: '',
    companyDomain: 'example.com',
    outlookBaseUrl: '',
    allNodes: [],
    allEdges: [],
  });

  it('calls onClose when clicking outside the modal content', () => {
    const props = createProps();
    render(<EditNodeModal {...props} />);
    
    // The overlay has data-testid="modal-overlay"
    const overlay = screen.getByTestId('modal-overlay');
    
    // Click on the overlay (which is outside the modal content)
    fireEvent.mouseDown(overlay);
    
    expect(props.onClose).toHaveBeenCalled();
  });

  it('does not call onClose when clicking inside the modal content', () => {
    const props = createProps();
    render(<EditNodeModal {...props} />);
    
    // Click on the modal content (e.g., the title)
    const title = screen.getByText('Edit Position');
    fireEvent.mouseDown(title);
    
    expect(props.onClose).not.toHaveBeenCalled();
  });
});
