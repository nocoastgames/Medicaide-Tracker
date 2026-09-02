import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#a4de6c'];

export function ClassroomAnalytics({
    logs,
    students,
    pcas
}: {
    logs: any[];
    students: any[];
    pcas: any[];
}) {
    // Analytics calculations
    const stats = useMemo(() => {
        let totalMinutes = 0;
        const studentMins: Record<string, number> = {};
        const pcaMins: Record<string, number> = {};
        const serviceMins: Record<string, number> = {};

        logs.forEach(log => {
            if (!log.endTime) return;
            const duration = (log.endTime - log.startTime) / 60000;
            if (duration < 0 || duration > 1440) return; // ignore invalid or > 24hr

            totalMinutes += duration;
            studentMins[log.student] = (studentMins[log.student] || 0) + duration;
            pcaMins[log.pca] = (pcaMins[log.pca] || 0) + duration;
            serviceMins[log.serviceType] = (serviceMins[log.serviceType] || 0) + duration;
        });

        // Format for charts
        const studentData = Object.entries(studentMins).map(([id, val]) => ({
            name: students.find(s => s.id === id)?.name || id,
            minutes: Math.round(val)
        })).sort((a, b) => b.minutes - a.minutes);

        const pcaData = Object.entries(pcaMins).map(([id, val]) => ({
            name: pcas.find(p => p.id === id)?.name || id,
            minutes: Math.round(val)
        })).sort((a, b) => b.minutes - a.minutes);

        const serviceData = Object.entries(serviceMins).map(([name, val]) => ({
            name,
            value: Math.round(val)
        })).sort((a, b) => b.value - a.value);

        return {
            totalHours: (totalMinutes / 60).toFixed(1),
            totalSessions: logs.filter(l => l.endTime).length,
            studentData,
            pcaData,
            serviceData
        };
    }, [logs, students, pcas]);

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xl">Total Service Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-blue-600">{stats.totalHours} <span className="text-lg text-slate-500 font-medium">hours</span></div>
                        <p className="text-slate-500 mt-1">Across {stats.totalSessions} completed sessions</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Time per Student (Minutes)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                        {stats.studentData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.studentData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} />
                                    <Tooltip />
                                    <Bar dataKey="minutes" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="flex bg-slate-50 h-full items-center justify-center text-slate-500 rounded">No data</div>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Time per PCA (Minutes)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                        {stats.pcaData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.pcaData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} />
                                    <Tooltip />
                                    <Bar dataKey="minutes" fill="#10b981" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="flex bg-slate-50 h-full items-center justify-center text-slate-500 rounded">No data</div>}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Service Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80 flex flex-col items-center">
                        {stats.serviceData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.serviceData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={true}
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {stats.serviceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `${value} min`} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <div className="flex bg-slate-50 w-full h-full items-center justify-center text-slate-500 rounded">No data</div>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
