export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-4">
      <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center">
        <span className="text-4xl">⚙️</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">App Settings</h1>
      <p className="text-slate-500 max-w-md">Configure centre details, notification preferences, and system alerts here.</p>
    </div>
  );
}
