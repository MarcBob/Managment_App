import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';

describe('SettingsModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    leafColumns: 1,
    setLeafColumns: vi.fn(),
    leadershipLayers: [],
    setLeadershipLayers: vi.fn(),
    nodeFilters: [],
    setNodeFilters: vi.fn(),
    filterGroups: [],
    setFilterGroups: vi.fn(),
    defaultFallbackColor: '#ffffff',
    setDefaultFallbackColor: vi.fn(),
    connectionColor: '#cccccc',
    setConnectionColor: vi.fn(),
    backgroundColor: '#f8fafc',
    setBackgroundColor: vi.fn(),
    searchShortcut: 'meta+e',
    setSearchShortcut: vi.fn(),
    teamsShortcut: 'meta+m',
    setTeamsShortcut: vi.fn(),
    companyDomain: 'example.com',
    setCompanyDomain: vi.fn(),
    outlookBaseUrl: 'https://outlook.com',
    setOutlookBaseUrl: vi.fn(),
    availablePlans: ['Plan A', 'Plan B'],
    onImportSettings: vi.fn(),
  };

  const onImportSettings = vi.fn();

  const getProps = () => ({
    ...defaultProps,
    onImportSettings,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the import settings section when plans are available', () => {
    render(<SettingsModal {...getProps()} />);
    expect(screen.getByText('Import Settings')).toBeDefined();
    expect(screen.getByText('Plan A')).toBeDefined();
    expect(screen.getByText('Plan B')).toBeDefined();
  });

  it('calls onImportSettings when a plan is selected', () => {
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    
    render(<SettingsModal {...getProps()} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Plan A' } });
    
    expect(confirmSpy).toHaveBeenCalled();
    expect(onImportSettings).toHaveBeenCalledWith('Plan A');
    
    confirmSpy.mockRestore();
  });

  it('does not call onImportSettings if user cancels confirmation', () => {
    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false);
    
    render(<SettingsModal {...getProps()} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Plan A' } });
    
    expect(confirmSpy).toHaveBeenCalled();
    expect(onImportSettings).not.toHaveBeenCalled();
    
    confirmSpy.mockRestore();
  });
});
