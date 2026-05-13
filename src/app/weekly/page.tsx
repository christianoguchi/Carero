export default function WeeklyPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-center space-y-4">
      <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center">
        <span className="text-4xl">🗓️</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Weekly Rota View</h1>
      <p className="text-slate-500 max-w-md">This view is currently under development. Soon you'll be able to see the full week's allocation at a glance.</p>
    </div>
  );
}
