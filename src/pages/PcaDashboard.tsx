import React, { useEffect, useState } from 'react';
import { pb, logout } from '../services/pocketbase';
import { handlePocketbaseError } from '../lib/pocketbase-errors';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

export function PcaDashboard() {
    const { user } = useAuth();
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (user) loadClassrooms();
    }, [user, location.state]);

    const loadClassrooms = async () => {
        if (!user) return;
        try {
            const rooms = await pb.collection('classrooms').getFullList();
            setClassrooms(rooms);

            if (rooms.length > 0 && !(location.state as any)?.explicit) {
                // If there's only 1 classroom in the whole school, just auto-nav.
                // Or maybe we just auto-nav them to the first one until they switch
                navigate(`/pca/${rooms[0].id}/login-bypass`, { replace: true });
            }
        } catch (e) {
            handlePocketbaseError(e, 'list', 'classrooms', user);
        }
    };

    return (
        <div className="flex flex-col h-full flex-grow overflow-hidden bg-slate-50">
            <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm flex-shrink-0">
                <div className="flex items-center space-x-4">
                    <div className="bg-indigo-500 p-2 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight">PCA Dashboard</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Select Classroom</p>
                    </div>
                </div>
                <div className="flex items-center space-x-6">
                    <button onClick={logout} className="flex items-center space-x-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 hover:bg-white transition-colors">
                        <span className="text-sm font-medium text-slate-700">Sign Out</span>
                    </button>
                </div>
            </header>
            <main className="flex-1 overflow-auto p-6 lg:p-10 w-full mx-auto max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Select a Classroom</CardTitle>
                        <CardDescription>Choose a classroom to log PCA services for students</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {classrooms.map(c => (
                            <div key={c.id} className="flex items-center justify-between p-4 border rounded shadow-sm hover:border-indigo-300">
                                <span className="font-semibold text-lg">{c.name}</span>
                                <div className="space-x-2">
                                    <Button onClick={() => navigate(`/pca/${c.id}/login-bypass`)}>Enter</Button>
                                </div>
                            </div>
                        ))}
                        {classrooms.length === 0 && <p className="text-gray-500">No classrooms have been created.</p>}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
