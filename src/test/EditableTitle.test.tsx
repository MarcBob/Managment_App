import { render, screen, fireEvent } from '@testing-library/react';
import { EditableTitle } from '../components/EditableTitle';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';

describe('EditableTitle', () => {
  it('renders the title', () => {
    render(<EditableTitle value="My Plan" onChange={() => {}} />);
    expect(screen.getByText('My Plan')).toBeInTheDocument();
  });

  it('switches to input when clicked', () => {
    render(<EditableTitle value="My Plan" onChange={() => {}} />);
    fireEvent.click(screen.getByText('My Plan'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('My Plan');
  });

  it('calls onChange when blur and value changed', () => {
    const handleChange = vi.fn();
    render(<EditableTitle value="My Plan" onChange={handleChange} />);
    
    fireEvent.click(screen.getByText('My Plan'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.blur(input);
    
    expect(handleChange).toHaveBeenCalledWith('New Name');
  });

  it('does not call onChange if value is same', () => {
    const handleChange = vi.fn();
    render(<EditableTitle value="My Plan" onChange={handleChange} />);
    
    fireEvent.click(screen.getByText('My Plan'));
    const input = screen.getByRole('textbox');
    fireEvent.blur(input);
    
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('reverts to original value on Escape', () => {
    const handleChange = vi.fn();
    render(<EditableTitle value="My Plan" onChange={handleChange} />);
    
    fireEvent.click(screen.getByText('My Plan'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    
    expect(screen.getByText('My Plan')).toBeInTheDocument();
    expect(handleChange).not.toHaveBeenCalled();
  });
});
