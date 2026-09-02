import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pb, logout } from '../services/pocketbase';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { format } from 'date-fns';

const SERVICES = [
    "Toileting/Diapering",
    "Eating/Meal Prep",
    "Mobility/Ambulation",
    "Positioning/Transferring",
    "Dressing"
];

export function PcaMobileView() {
    const { classroomId, token, pcaId } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'initializing' | 'invalid' | 'ready'>('initializing');
    const [errorMsg, setErrorMsg] = useState('');

    const [classroomName, setClassroomName] = useState('Loading...');
    const [pcas, setPcas] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [activeLogs, setActiveLogs] = useState<any[]>([]);

    const [selectedPca, setSelectedPca] = useState<any>(null);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'logging' | 'reporting'>('logging');
    const [reportDate, setReportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [reportLogs, setReportLogs] = useState<any[]>([]);

    const [now, setNow] = useState(Date.now());
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // A staff (Google/email) session covers its own access via the `pca` role -
    // no per-classroom token is needed or sent. Anyone else is a QR-code device:
    // every request must carry the classroom's current token as a query param,
    // which is exactly what the `pcas`/`students`/`serviceLogs` API rules check.
    const isStaffMode = !token || token === 'login-bypass';
    const authQuery = isStaffMode ? {} : { query: { token } };

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);

        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        let wakeLock: any = null;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                    wakeLock.addEventListener('release', () => {
                        console.log('Screen Wake Lock released:', wakeLock?.released);
                    });
                    console.log('Screen Wake Lock acquired:', !wakeLock.released);
                }
            } catch (err: any) {
                console.error(`${err.name}, ${err.message}`);
            }
        };

        requestWakeLock();

        const handleVisibilityChange = async () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                await requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLock) {
                wakeLock.release().catch(console.error);
            }
        };
    }, []);

    useEffect(() => {
        setupSession();
    }, [classroomId, token]);

    const setupSession = async () => {
        if (!classroomId || !token) return;
        try {
            if (isStaffMode && !pb.authStore.isValid) {
                navigate('/login');
                return;
            }

            // A get() here both loads the classroom name and proves the token is
            // valid - if it's stale or bogus, the `classrooms` API rule denies it
            // and this throws, which the catch below reports.
            const classroom = await pb.collection('classrooms').getOne(classroomId, authQuery as any);
            setClassroomName(classroom.name);

            const pcasList = await pb.collection('pcas').getFullList({ filter: `classroom = "${classroomId}"`, ...authQuery });
            setPcas(pcasList);
            if (pcaId) {
                const found = pcasList.find(p => p.id === pcaId);
                if (found) setSelectedPca(found);
            }

            const studentsList = await pb.collection('students').getFullList({ filter: `classroom = "${classroomId}"`, ...authQuery });
            setStudents(studentsList);

            setStatus('ready');
        } catch (error: any) {
            console.error('Error setting up PCA session:', error);
            if (error?.status === 404 || error?.status === 403) {
                setErrorMsg('Invalid or expired QR code link. Please ask the teacher to show you the QR code again.');
            } else {
                setErrorMsg('Failed to connect to the classroom session. details: ' + (error?.message || JSON.stringify(error)));
            }
            setStatus('invalid');
        }
    };

    useEffect(() => {
        if (status !== 'ready' || !classroomId) return;
        const today = format(new Date(), 'yyyy-MM-dd');

        let unsubscribe: (() => void) | null = null;
        let cancelled = false;

        const load = async () => {
            const logs = await pb.collection('serviceLogs').getFullList({
                filter: `classroom = "${classroomId}" && date = "${today}"`,
                ...authQuery,
            });
            if (!cancelled) setActiveLogs(logs.filter((l: any) => !l.endTime));
        };
        load().catch(e => console.error('Error loading active logs', e));

        pb.collection('serviceLogs').subscribe('*', (e) => {
            setActiveLogs(prev => {
                if (e.record.date !== today) return prev;
                if (e.action === 'delete') return prev.filter(l => l.id !== e.record.id);
                const withoutRecord = prev.filter(l => l.id !== e.record.id);
                return e.record.endTime ? withoutRecord : [...withoutRecord, e.record];
            });
        }, { filter: `classroom = "${classroomId}"`, ...authQuery }).then(unsub => { unsubscribe = unsub; });

        return () => {
            cancelled = true;
            unsubscribe?.();
        };
    }, [status, classroomId]);

    const loadReportLogs = async (date: string) => {
        if (!classroomId || !selectedStudent || !selectedPca) return;
        const logs = await pb.collection('serviceLogs').getFullList({
            filter: `classroom = "${classroomId}" && date = "${date}" && student = "${selectedStudent.id}" && pca = "${selectedPca.id}"`,
            ...authQuery,
        });
        setReportLogs(logs.filter((l: any) => l.endTime).sort((a: any, b: any) => b.startTime - a.startTime));
    };

    useEffect(() => {
        if (viewMode === 'reporting' && selectedStudent && selectedPca) {
            loadReportLogs(reportDate).catch(e => console.error('Error loading report logs', e));
        }
    }, [viewMode, reportDate, selectedStudent, selectedPca]);

    const startService = async (service: string) => {
        if (!selectedPca || !selectedStudent || !classroomId) return;

        // Ensure PCA only does one task at once across all students
        if (activeLogs.some((l: any) => l.pca === selectedPca.id)) {
            alert("Warning: You are already performing an active task for a student. Please stop your current task before starting a new one.");
            return;
        }

        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const now = Date.now();
            await pb.collection('serviceLogs').create({
                classroom: classroomId,
                student: selectedStudent.id,
                pca: selectedPca.id,
                serviceType: service,
                startTime: now,
                date: today,
                createdAt: now,
                updatedAt: now,
            }, authQuery as any);
        } catch (e: any) {
            console.error('Failed to start service: ', e);
        }
    };

    const stopService = async (logId: string) => {
        try {
            await pb.collection('serviceLogs').update(logId, {
                endTime: Date.now(),
                updatedAt: Date.now(),
            }, authQuery as any);
        } catch (e: any) {
            console.error('Failed to stop service: ', e);
        }
    };

    if (status === 'initializing') {
        return <div className="p-8 text-center"><p className="text-xl">Connecting to classroom...</p></div>;
    }

    if (status === 'invalid') {
        return (
            <div className="p-8 text-center max-w-md mx-auto mt-10">
                <Card className="border-red-200">
                    <CardHeader className="bg-red-50 text-red-800 rounded-t-xl">
                        <CardTitle>Session Error</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <p className="text-slate-700">{errorMsg}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const uncompletedServices = SERVICES.filter(s =>
        !activeLogs.some((l: any) => l.pca === selectedPca?.id && l.student === selectedStudent?.id && l.serviceType === s)
    );
    const currentActiveForSelection = activeLogs.filter((l: any) => l.pca === selectedPca?.id && l.student === selectedStudent?.id);

    const pcaActiveTask = selectedPca ? activeLogs.find((l: any) => l.pca === selectedPca.id) : null;
    const pcaActiveTaskStudent = pcaActiveTask ? students.find((s: any) => s.id === pcaActiveTask.student) : null;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 relative pb-16">
            <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex flex-col items-center relative">
                {isOffline && (
                    <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-xs font-bold text-center py-1 truncate uppercase tracking-wider items-center flex justify-center z-50">
                        <span className="animate-pulse h-2 w-2 rounded-full bg-white mr-2"></span>
                        Offline Mode - Data will sync when reconnected
                    </div>
                )}
                {isStaffMode && (
                    <button
                        onClick={() => navigate('/pca-dashboard', { state: { explicit: true } })}
                        className={`absolute left-4 ${isOffline ? 'top-8' : 'top-4'} text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full`}
                    >
                        Change Room
                    </button>
                )}
                <h1 className={`text-xl font-bold text-slate-800 ${isOffline ? 'mt-4' : ''}`}>{classroomName}</h1>
                <p className="text-xs font-bold text-slate-400 tracking-wider">PCA LOGGING VIEW</p>
                {isStaffMode && (
                    <div className={`absolute right-4 ${isOffline ? 'top-8' : 'top-4'}`}>
                        <button
                            onClick={() => { logout(); window.location.reload(); }}
                            className="text-sm font-semibold text-slate-500 hover:text-slate-800"
                        >
                            Sign Out
                        </button>
                    </div>
                )}
            </header>

            <main className="flex-grow p-4 max-w-lg mx-auto w-full">
                {!selectedPca && (
                    <div className="animate-in fade-in slide-in-from-bottom-2">
                        <h2 className="text-lg font-bold text-slate-700 mb-4">Tap Your Name</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {pcas.map(p => (
                                <button key={p.id} onClick={() => setSelectedPca(p)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 active:bg-blue-50 transition-colors flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl mb-2">{p.name.substring(0,2).toUpperCase()}</div>
                                    <span className="font-medium text-slate-700">{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {selectedPca && !selectedStudent && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center gap-2 mb-4">
                            <button onClick={() => setSelectedPca(null)} className="text-blue-600 font-bold hover:underline">← Back</button>
                            <span className="text-slate-400">/</span>
                            <span className="font-bold text-slate-700">{selectedPca.name}</span>
                        </div>

                        <h2 className="text-lg font-bold text-slate-700 mb-4">Select Student</h2>
                        <div className="space-y-2 mb-6">
                            {students.map(s => (
                                <button key={s.id} onClick={() => setSelectedStudent(s)} className="w-full text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 active:bg-blue-50 transition-colors font-medium text-slate-700">
                                    {s.name}
                                </button>
                            ))}
                        </div>

                        {pcaActiveTask && (() => {
                            const elapsedMins = Math.floor((now - pcaActiveTask.startTime) / 60000);
                            const isOvertime = elapsedMins > 120;
                            return (
                            <div className="mb-6">
                                <h3 className={`text-sm font-bold uppercase mb-3 ${isOvertime ? 'text-red-600' : 'text-amber-600'}`}>Your Current Task</h3>
                                <Card className={`shadow-none border-2 border-dashed ${isOvertime ? 'border-red-400 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <p className="font-bold text-slate-800">{pcaActiveTask.serviceType}</p>
                                            <p className="text-sm text-slate-800 font-semibold mb-1">with {pcaActiveTaskStudent?.name || "Student"}</p>
                                            <div className={`mt-2 font-semibold text-sm flex items-center space-x-2 ${
                                                isOvertime ? 'text-red-600' : 'text-amber-700'
                                            }`}>
                                                <span className={`animate-pulse h-2 w-2 rounded-full ${
                                                    isOvertime ? 'bg-red-600' : 'bg-amber-600'
                                                }`}></span>
                                                <span>Running: {elapsedMins}m</span>
                                                {isOvertime && <span className="font-bold ml-2">⚠️ Forgot to Stop?</span>}
                                            </div>
                                        </div>
                                        <Button onClick={() => stopService(pcaActiveTask.id)} className="bg-red-500 hover:bg-red-600 font-bold py-6 px-8 text-lg">Stop Task</Button>
                                    </CardContent>
                                </Card>
                            </div>
                        )})}
                    </div>
                )}

                {selectedPca && selectedStudent && (
                    <div className="animate-in fade-in slide-in-from-right-4 space-y-6">
                        <div className="flex items-center gap-2 mb-6">
                            <button onClick={() => setSelectedStudent(null)} className="text-blue-600 font-bold hover:underline">← Back</button>
                            <span className="text-slate-400">/</span>
                            <span className="font-bold text-slate-700">{selectedPca.name}</span>
                        </div>

                        <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg">
                            <p className="text-sm font-medium text-slate-400 mb-1">Services for</p>
                            <p className="text-2xl font-bold">{selectedStudent.name}</p>
                        </div>

                        <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                            <button
                                onClick={() => setViewMode('logging')}
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${viewMode === 'logging' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Log Data
                            </button>
                            <button
                                onClick={() => setViewMode('reporting')}
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${viewMode === 'reporting' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                View Past Data
                            </button>
                        </div>

                        {viewMode === 'logging' && (
                            <div className="space-y-6 animate-in fade-in">
                                {currentActiveForSelection.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-amber-600 uppercase mb-3">Currently Active</h3>
                                        <div className="space-y-3">
                                            {currentActiveForSelection.map((log:any) => {
                                                const elapsedMins = Math.floor((now - log.startTime) / 60000);
                                                const isOvertime = elapsedMins > 120;
                                                return (
                                                <Card key={log.id} className={`shadow-none border-2 border-dashed ${isOvertime ? 'border-red-400 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                                                    <CardContent className="p-4 flex flex-col items-start gap-4">
                                                        <div>
                                                            <p className="font-bold text-slate-800">{log.serviceType}</p>
                                                            <div className={`mt-1 font-semibold text-sm flex items-center space-x-2 ${isOvertime ? 'text-red-600' : 'text-amber-700'}`}>
                                                                <span className={`animate-pulse h-2 w-2 rounded-full ${isOvertime ? 'bg-red-600' : 'bg-amber-600'}`}></span>
                                                                <span>Running: {elapsedMins}m</span>
                                                                {isOvertime && <span className="font-bold ml-2 text-xs">⚠️ Overtime</span>}
                                                            </div>
                                                        </div>
                                                        <Button onClick={() => stopService(log.id)} className="w-full bg-red-500 hover:bg-red-600 font-bold py-6 text-xl shadow-lg">STOP {log.serviceType}</Button>
                                                    </CardContent>
                                                </Card>
                                            )})}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 mt-6">Start New Service</h3>
                                    <div className="space-y-2">
                                        {activeLogs.some((l:any) => l.pca === selectedPca.id) ? (
                                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                                                <p className="text-yellow-800 text-sm font-semibold">You already have an active task running. Please stop it first.</p>
                                            </div>
                                        ) : (
                                            <>
                                                {uncompletedServices.map(service => (
                                                    <button
                                                        key={service}
                                                        onClick={() => startService(service)}
                                                        className="w-full text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:bg-blue-50 hover:border-blue-400 transition-colors font-bold text-slate-700 flex justify-between items-center"
                                                    >
                                                        {service}
                                                        <span className="text-blue-500">→</span>
                                                    </button>
                                                ))}
                                                {uncompletedServices.length === 0 && (
                                                    <p className="text-slate-500 italic text-sm">All services are currently active for this student.</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {viewMode === 'reporting' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Select Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-3 rounded-lg border border-slate-300"
                                        value={reportDate}
                                        onChange={(e) => setReportDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-3 mt-4">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase">Completed Services</h3>
                                    {reportLogs.length === 0 ? (
                                        <p className="text-slate-500 text-sm italic">No completed services found on this date.</p>
                                    ) : (
                                        reportLogs.map(log => (
                                            <div key={log.id} className="bg-white p-4 justify-between items-center flex rounded-xl border border-slate-200 shadow-sm">
                                                <div>
                                                    <p className="font-bold text-slate-800">{log.serviceType}</p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {format(log.startTime, 'h:mm a')} - {log.endTime ? format(log.endTime, 'h:mm a') : 'Ongoing'}
                                                    </p>
                                                </div>
                                                <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                    {log.endTime ? Math.max(1, Math.round((log.endTime - log.startTime) / 60000)) + ' min' : ''}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </main>
        </div>
    );
}
