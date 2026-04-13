import React from "react";

export default function HistoryCard({ entry }) {
    const getActionBadge = (action) => {
        switch (action) {
            case 'add':
                return <span className="badge-modern bg-green-900/50 border-green-500/50 text-green-400">DODANO</span>;
            case 'edit':
                return <span className="badge-modern bg-blue-900/50 border-blue-500/50 text-blue-400">EDYTOWANO</span>;
            case 'delete':
                return <span className="badge-modern bg-red-900/50 border-red-500/50 text-red-400">USUNIĘTO</span>;
            default:
                return <span className="badge-modern bg-gray-900/50 border-gray-500/50 text-gray-400">{action}</span>;
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return date.toLocaleString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="card card-premium fade-in-up" style={{ padding: '1rem' }}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold text-slate-200 truncate">
                        {entry.item_name}
                    </h3>
                    <span className="text-xs text-slate-500">
                        ID: {entry.id}
                    </span>
                </div>
                {getActionBadge(entry.action)}
            </div>
            
            <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div>
                        <div className="text-slate-500 text-xs">Data i czas</div>
                        <div className="text-slate-300">{formatDate(entry.timestamp)}</div>
                    </div>
                </div>
                
                <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    <div>
                        <div className="text-slate-500 text-xs">Użytkownik</div>
                        <div className="text-slate-300">{entry.changed_by || 'Nieznany'}</div>
                    </div>
                </div>
                
                <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
                    </svg>
                    <div>
                        <div className="text-slate-500 text-xs">Urządzenie</div>
                        <div className="text-slate-300 text-xs">{entry.device_id || 'Nieznane'}</div>
                    </div>
                </div>
                
                {entry.field_name && entry.field_name !== 'all' && (
                    <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                        <div>
                            <div className="text-slate-500 text-xs">Zmienione pole</div>
                            <div className="text-slate-300">{entry.field_name}</div>
                        </div>
                    </div>
                )}
                
                {entry.old_value && (
                    <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
                        </svg>
                        <div>
                            <div className="text-slate-500 text-xs">Stara wartość</div>
                            <div className="text-red-300 truncate">{entry.old_value}</div>
                        </div>
                    </div>
                )}
                
                {entry.new_value && (
                    <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        <div>
                            <div className="text-slate-500 text-xs">Nowa wartość</div>
                            <div className="text-green-300 truncate">{entry.new_value}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
