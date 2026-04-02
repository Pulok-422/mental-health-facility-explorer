import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Upload, Eye, Settings, LogOut, FileText, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upload' | 'preview' | 'settings'>('upload');
  const [uploadStatus, setUploadStatus] = useState<Record<string, { name: string; rows?: number; time: string }>>({});

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') !== 'true') {
      navigate('/admin');
    }
  }, [navigate]);

  const handleFileUpload = (type: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Simulate upload
    setUploadStatus(prev => ({
      ...prev,
      [type]: { name: file.name, rows: Math.floor(Math.random() * 400) + 10, time: new Date().toLocaleString() },
    }));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    navigate('/admin');
  };

  const tabs = [
    { key: 'upload', label: 'Upload Data', icon: Upload },
    { key: 'preview', label: 'Preview Data', icon: Eye },
    { key: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-56 bg-card border-r border-border p-4 flex flex-col">
        <h2 className="text-sm font-bold text-foreground mb-6 flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" /> Admin Panel
        </h2>
        <nav className="space-y-1 flex-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
        <div className="pt-4 border-t border-border space-y-2">
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => navigate('/')}>
            <FileText className="h-3 w-3 mr-2" /> View Dashboard
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-destructive" onClick={handleLogout}>
            <LogOut className="h-3 w-3 mr-2" /> Logout
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {activeTab === 'upload' && (
          <div className="space-y-4 max-w-2xl animate-fade-in">
            <h3 className="text-lg font-bold text-foreground">Upload Data</h3>
            {[
              { key: 'population', label: 'Population Dataset', accept: '.xlsx,.csv' },
              { key: 'facilities', label: 'Facility Dataset', accept: '.xlsx,.csv' },
              { key: 'geojson', label: 'GeoJSON Boundary File', accept: '.geojson,.json' },
            ].map(item => (
              <div key={item.key} className="dashboard-panel p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{item.label}</h4>
                    {uploadStatus[item.key] && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-accent" />
                        {uploadStatus[item.key].name} • {uploadStatus[item.key].rows && `${uploadStatus[item.key].rows} rows • `}{uploadStatus[item.key].time}
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" accept={item.accept} onChange={handleFileUpload(item.key)} className="hidden" />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
                      <Upload className="h-3 w-3" /> Upload
                    </div>
                  </label>
                </div>
              </div>
            ))}
            <Button className="w-full mt-4">
              <RefreshCw className="h-4 w-4 mr-2" /> Apply & Refresh Dashboard
            </Button>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-bold text-foreground">Data Preview</h3>
            {Object.entries(uploadStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground">No data uploaded yet. Upload files first.</p>
            ) : (
              Object.entries(uploadStatus).map(([key, info]) => (
                <div key={key} className="dashboard-panel p-4">
                  <h4 className="text-sm font-semibold text-foreground capitalize">{key}</h4>
                  <p className="text-xs text-muted-foreground mt-1">File: {info.name} {info.rows && `• ${info.rows} rows detected`}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4 max-w-md animate-fade-in">
            <h3 className="text-lg font-bold text-foreground">Settings</h3>
            <div className="dashboard-panel p-4 space-y-3">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                <Trash2 className="h-3 w-3 mr-2" /> Clear Population Dataset
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                <Trash2 className="h-3 w-3 mr-2" /> Clear Facility Dataset
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs text-destructive">
                <Trash2 className="h-3 w-3 mr-2" /> Reset All Data
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
