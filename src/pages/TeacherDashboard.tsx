import React, { useEffect, useState } from 'react';
import { pb, logout } from '../services/pocketbase';
import { handlePocketbaseError } from '../lib/pocketbase-errors';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useNavigate, Link, useLocation } from 'react-router-dom';

export function TeacherDashboard() {
    const { user, role } = useAuth();
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

            const sortedRooms = rooms.sort((a: any, b: any) => {
                const aIsMy = a.teacherIds?.includes(user.id);
                const bIsMy = b.teacherIds?.includes(user.id);
                if (aIsMy && !bIsMy) return -1;
                if (!aIsMy && bIsMy) return 1;
                return a.name.localeCompare(b.name);
            });

            setClassrooms(sortedRooms);

            // Auto-navigate if not explicitly coming to change room and they have at least one of their own classrooms
            const myRooms = sortedRooms.filter((c: any) => c.teacherIds?.includes(user.id));
            if (myRooms.length > 0 && !(location.state as any)?.explicit) {
                navigate(`/classroom/${myRooms[0].id}`, { replace: true });
            }
        } catch (e) {
            handlePocketbaseError(e, 'list', 'classrooms', user);
        }
    };

    return (
        <div className="flex flex-col h-full flex-grow overflow-hidden bg-slate-50">
            <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm flex-shrink-0">
                <div className="flex items-center space-x-4">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Teacher Dashboard</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Manage Classrooms</p>
                    </div>
                </div>
                <div className="flex items-center space-x-6">
                    {role === 'admin' && (
                        <Link to="/admin" className="flex items-center space-x-2 bg-purple-50 px-4 py-2 rounded-full border border-purple-200 hover:bg-purple-100 transition-colors">
                            <span className="text-sm font-bold text-purple-700">Admin View</span>
                        </Link>
                    )}
                    <button onClick={logout} className="flex items-center space-x-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 hover:bg-white transition-colors">
                        <span className="text-sm font-medium text-slate-700">Sign Out</span>
                    </button>
                </div>
            </header>
            <main className="flex-1 overflow-auto p-6 lg:p-10 w-full mx-auto max-w-4xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Classrooms</CardTitle>
                        <CardDescription>Select a classroom to launch the PCA tracking view, or manage students inside it.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {classrooms.map(c => {
                            const isMyRoom = c.teacherIds?.includes(user!.id);
                            return (
                                <div key={c.id} className={`flex items-center justify-between p-4 border rounded shadow-sm ${isMyRoom ? 'border-blue-300 bg-blue-50/30 ring-1 ring-blue-100' : 'hover:border-slate-300'}`}>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-lg text-slate-800">{c.name}</span>
                                        {isMyRoom && <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">Your Classroom</span>}
                                    </div>
                                    <div className="space-x-2">
                                        <Button onClick={() => navigate(`/classroom/${c.id}`)}>Enter / Manage</Button>
                                    </div>
                                </div>
                            );
                        })}
                        {classrooms.length === 0 && <p className="text-gray-500">No classrooms available.</p>}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
