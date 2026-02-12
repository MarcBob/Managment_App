import { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { parseOrgCsv } from '../utils/csvParser';
import type { OrgNode, OrgEdge } from '../utils/csvParser';

interface FileUploadProps {
  onDataLoaded: (nodes: OrgNode[], edges: OrgEdge[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { nodes, edges } = parseOrgCsv(text);
      onDataLoaded(nodes, edges);
    };
    reader.readAsText(file);
  }, [onDataLoaded]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 p-12 transition-colors hover:border-blue-400 hover:bg-slate-100">
      <Upload className="w-12 h-12 text-slate-400 mb-4" />
      <h2 className="text-xl font-semibold text-slate-700 mb-2">Upload Organization CSV</h2>
      <p className="text-slate-500 mb-6 text-center max-w-md">
        Select a CSV file containing your organization structure to get started.
      </p>
      <label className="cursor-pointer bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
        Browse Files
        <input
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileUpload}
        />
      </label>
    </div>
  );
};
