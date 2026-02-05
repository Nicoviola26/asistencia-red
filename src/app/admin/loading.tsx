
export default function AdminLoading() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm text-center space-y-8 animate-fade-in">
                {/* Animated Abstract Logo */}
                <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                    <div className="relative bg-white dark:bg-slate-900 w-24 h-24 rounded-full shadow-2xl flex items-center justify-center border-4 border-emerald-500 p-1">
                        <div className="w-12 h-12 bg-emerald-500 rounded-lg animate-spin" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Cargando Panel</h2>
                    <div className="flex items-center justify-center gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
