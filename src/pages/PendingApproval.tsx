import { logout } from '../services/pocketbase';

export function PendingApproval() {
    return (
        <div className="flex flex-col h-full flex-grow overflow-hidden bg-slate-50 items-center justify-center p-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md text-center">
                <svg className="w-16 h-16 mx-auto text-amber-500 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Pending Approval</h1>
                <p className="text-slate-600 mb-8">
                    Your account has been created. Please ask the system administrator (renegml@nv.ccsd.net) to approve your access.
                </p>
                <div className="space-y-4">
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors"
                    >
                        Check Again
                    </button>
                    <button 
                        onClick={logout}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
