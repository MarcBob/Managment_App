import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PersonNode } from './PersonNode';
import { ReactFlowProvider } from 'reactflow';
import { MouseContext } from './OrgChart';

// Mock ResizeObserver which is used by ReactFlow
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('PersonNode', () => {
  const defaultProps = {
    id: '1',
    data: {
      firstName: 'John',
      lastName: 'Doe',
      jobTitle: 'Software Engineer with a very long title that should wrap',
      team: 'Engineering',
      status: 'FILLED',
      directReportsCount: 0,
      totalReportsCount: 0,
      onEditNode: vi.fn(),
      onAddSubordinate: vi.fn(),
      onToggleCollapse: vi.fn(),
      isCollapsed: false,
    },
    selected: false,
    dragging: false,
    zIndex: 0,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    type: 'person',
  };

  it('renders job title with line-clamp-3 class and reserved height', () => {
    render(
      <ReactFlowProvider>
        <PersonNode {...defaultProps} />
      </ReactFlowProvider>
    );
    
    const jobTitleElement = screen.getByText('Software Engineer with a very long title that should wrap');
    expect(jobTitleElement).toHaveClass('line-clamp-3');
    expect(jobTitleElement).toHaveClass('h-12');
    expect(jobTitleElement).not.toHaveClass('truncate');
  });

  it('applies scaling when space is pressed and mouse is close', () => {
    const mousePos = { x: 120, y: 75 }; // Exactly at node center (0,0) + (120, 75)
    
    render(
      <ReactFlowProvider>
        <MouseContext.Provider value={{ mousePos, isSpacePressed: true }}>
          <PersonNode {...defaultProps} xPos={0} yPos={0} />
        </MouseContext.Provider>
      </ReactFlowProvider>
    );

    const jobTitleElement = screen.getByText('Software Engineer with a very long title that should wrap');
    const card = jobTitleElement.closest('.group');
    expect(card).toHaveStyle('transform: scale(12)');
  });

  it('does not apply scaling when space is not pressed', () => {
    const mousePos = { x: 120, y: 75 };
    
    render(
      <ReactFlowProvider>
        <MouseContext.Provider value={{ mousePos, isSpacePressed: false }}>
          <PersonNode {...defaultProps} xPos={0} yPos={0} />
        </MouseContext.Provider>
      </ReactFlowProvider>
    );

    const jobTitleElement = screen.getByText('Software Engineer with a very long title that should wrap');
    const card = jobTitleElement.closest('.group');
    expect(card).toHaveStyle('transform: scale(1)');
  });

  it('calls onEditNode when the card is clicked', () => {
    const onEditNode = vi.fn();
    render(
      <ReactFlowProvider>
        <PersonNode {...defaultProps} data={{ ...defaultProps.data, onEditNode }} />
      </ReactFlowProvider>
    );
    
    // Click the card (the main container)
    // We can find it by some text inside or role if we add one, 
    // but for now let's just use the job title container's parent
    const jobTitleElement = screen.getByText('Software Engineer with a very long title that should wrap');
    const card = jobTitleElement.closest('.group');
    if (card) fireEvent.click(card);
    
    expect(onEditNode).toHaveBeenCalledWith(defaultProps.id, expect.any(Object));
  });

  it('applies white text class when customColor is dark', () => {
    const darkProps = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        customColor: '#000000', // Black background
      }
    };

    render(
      <ReactFlowProvider>
        <PersonNode {...darkProps} />
      </ReactFlowProvider>
    );

    const nameElement = screen.getByText('John Doe');
    expect(nameElement).toHaveClass('text-white');
  });

  it('applies slate text class when customColor is light', () => {
    const lightProps = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        customColor: '#ffffff', // White background
      }
    };

    render(
      <ReactFlowProvider>
        <PersonNode {...lightProps} />
      </ReactFlowProvider>
    );

    const nameElement = screen.getByText('John Doe');
    expect(nameElement).toHaveClass('text-slate-900');
  });
});
