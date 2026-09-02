import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { pb } from "../services/pocketbase";
import { useAuth } from "../contexts/AuthContext";
import { handlePocketbaseError } from "../lib/pocketbase-errors";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "react-qr-code";

import { ClassroomAnalytics } from './ClassroomAnalytics';

export function ClassroomView() {
  const { classroomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [classroomName, setClassroomName] = useState("Loading...");
  const [pcas, setPcas] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [activeToken, setActiveToken] = useState<string | null>(null);

  // Management state
  const [newItemName, setNewItemName] = useState("");

  const [exportStartDate, setExportStartDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [exportEndDate, setExportEndDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user || !classroomId) return;
    loadClassroom();
    loadPcas();
    loadStudents();
    loadAllLogs();

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    pb.collection("serviceLogs")
      .subscribe("*", (e) => {
        setAllLogs((prev) => {
          const withoutRecord = prev.filter((l) => l.id !== e.record.id);
          const next = e.action === "delete" ? withoutRecord : [...withoutRecord, e.record];
          return next.sort((a: any, b: any) => b.startTime - a.startTime);
        });
      }, { filter: `classroom = "${classroomId}"` })
      .then((unsub) => { if (cancelled) unsub(); else unsubscribe = unsub; })
      .catch((e) => console.error("Error subscribing to logs", e));

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user, classroomId]);

  const loadClassroom = async () => {
    try {
      const classroom = await pb.collection("classrooms").getOne(classroomId as string);
      setClassroomName(classroom.name);
      if (!classroom.activeToken) {
        await resetActiveToken();
      } else {
        setActiveToken(classroom.activeToken);
      }
    } catch (e) {
      handlePocketbaseError(e, "get", `classrooms/${classroomId}`, user);
    }
  };

  const resetActiveToken = async () => {
    try {
      const newToken = crypto.randomUUID();
      await pb.collection("classrooms").update(classroomId as string, {
        activeToken: newToken,
      });
      setActiveToken(newToken);
    } catch (e) {
      handlePocketbaseError(e, "update", `classrooms/${classroomId}`, user);
    }
  };

  const loadPcas = async () => {
    try {
      const list = await pb.collection("pcas").getFullList({
        filter: `classroom = "${classroomId}"`,
      });
      setPcas(list);
    } catch (e) {
      handlePocketbaseError(e, "list", "pcas", user);
    }
  };

  const loadStudents = async () => {
    try {
      const list = await pb.collection("students").getFullList({
        filter: `classroom = "${classroomId}"`,
      });
      setStudents(list);
    } catch (e) {
      handlePocketbaseError(e, "list", "students", user);
    }
  };

  const loadAllLogs = async () => {
    try {
      const list = await pb.collection("serviceLogs").getFullList({
        filter: `classroom = "${classroomId}"`,
      });
      setAllLogs(list.sort((a: any, b: any) => b.startTime - a.startTime));
    } catch (e) {
      handlePocketbaseError(e, "list", "serviceLogs", user);
    }
  };

  const handleAddItem = async (collectionName: "pcas" | "students") => {
    if (!newItemName.trim() || !user || !classroomId) return;
    try {
      await pb.collection(collectionName).create({
        classroom: classroomId,
        name: newItemName.trim(),
      });
      setNewItemName("");
      collectionName === "pcas" ? loadPcas() : loadStudents();
    } catch (e) {
      handlePocketbaseError(e, "create", collectionName, user);
    }
  };

  const handleDeleteItem = async (
    collectionName: "pcas" | "students",
    id: string,
  ) => {
    if (!user) return;
    try {
      await pb.collection(collectionName).delete(id);
      collectionName === "pcas" ? loadPcas() : loadStudents();
    } catch (e) {
      handlePocketbaseError(e, "delete", `${collectionName}/${id}`, user);
    }
  };

  return (
    <div className="w-full h-full">
      <div className="flex flex-col h-full flex-grow overflow-hidden print:hidden">
        {isOffline && (
            <div className="w-full bg-red-600 text-white text-xs font-bold text-center py-1 truncate uppercase tracking-wider items-center flex justify-center z-50">
                <span className="animate-pulse h-2 w-2 rounded-full bg-white mr-2"></span>
                Offline Mode - Data will sync when reconnected
            </div>
        )}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                ></path>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">
                {classroomName}
              </h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                Tracker & Management
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">
                {format(new Date(), "EEEE, MMM d")}
              </p>
            </div>
            <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
            <button
              onClick={() => navigate("/teacher", { state: { explicit: true } })}
              className="flex items-center space-x-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 hover:bg-white transition-colors"
            >
              <span className="text-sm font-medium text-slate-700">
                Back to Dashboard
              </span>
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                ></path>
              </svg>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 bg-slate-50">
          <Tabs defaultValue="tracker" className="w-full max-w-6xl mx-auto">
            <TabsList className="mb-6 h-12 w-full justify-start overflow-x-auto pb-4 border-b border-slate-200/50">
              <TabsTrigger
                value="tracker"
                className="text-sm font-bold tracking-tight data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50 data-[state=active]:shadow-sm rounded-lg px-4"
              >
                Live Tracker
              </TabsTrigger>
              <TabsTrigger
                value="pcas"
                className="text-sm font-bold tracking-tight data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50 data-[state=active]:shadow-sm rounded-lg px-4"
              >
                Manage PCAs
              </TabsTrigger>
              <TabsTrigger
                value="students"
                className="text-sm font-bold tracking-tight data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50 data-[state=active]:shadow-sm rounded-lg px-4"
              >
                Manage Students
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="text-sm font-bold tracking-tight data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50 data-[state=active]:shadow-sm rounded-lg px-4"
              >
                Service Data / Logs
              </TabsTrigger>
              <TabsTrigger
                value="export"
                className="text-sm font-bold tracking-tight data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50 data-[state=active]:shadow-sm rounded-lg px-4"
              >
                Print / Export
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="text-sm font-bold tracking-tight data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50 data-[state=active]:shadow-sm rounded-lg px-4"
              >
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tracker" className="mt-0">
              <TrackerApp
                pcas={pcas}
                students={students}
                classroomId={classroomId!}
                user={user}
                activeToken={activeToken}
                resetActiveToken={resetActiveToken}
              />
            </TabsContent>

            <TabsContent value="pcas">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Care Assistants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-6">
                    <Input
                      placeholder="New PCA Name"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                    <Button onClick={() => handleAddItem("pcas")}>
                      Add PCA
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {pcas.map((p) => (
                      <div
                        key={p.id}
                        className="flex justify-between items-center p-3 border rounded bg-white"
                      >
                        <span className="font-medium text-slate-800">
                          {p.name}
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteItem("pcas", p.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ))}
                    {pcas.length === 0 && (
                      <p className="text-gray-500">No PCAs added yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students">
              <Card>
                <CardHeader>
                  <CardTitle>Students in Classroom</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-6">
                    <Input
                      placeholder="New Student Name"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                    <Button onClick={() => handleAddItem("students")}>
                      Add Student
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {students.map((s) => (
                      <div
                        key={s.id}
                        className="flex justify-between items-center p-3 border rounded bg-white"
                      >
                        <span className="font-medium text-slate-800">
                          {s.name}
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteItem("students", s.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ))}
                    {students.length === 0 && (
                      <p className="text-gray-500">No students added yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs">
              <ServiceLogsManager
                logs={allLogs}
                user={user}
                classroomId={classroomId!}
                pcas={pcas}
                students={students}
              />
            </TabsContent>

            <TabsContent value="export">
              <ExportManager
                logs={allLogs}
                pcas={pcas}
                students={students}
                exportStartDate={exportStartDate}
                setExportStartDate={setExportStartDate}
                exportEndDate={exportEndDate}
                setExportEndDate={setExportEndDate}
              />
            </TabsContent>

            <TabsContent value="analytics">
              <ClassroomAnalytics logs={allLogs} students={students} pcas={pcas} />
            </TabsContent>
          </Tabs>
        </main>
        <footer className="h-12 bg-slate-800 text-slate-400 px-6 flex items-center justify-between text-[10px] font-medium tracking-widest uppercase flex-shrink-0">
          <div className="flex space-x-6">
            <span>Tracker Ver: 1.0.0</span>
            <span>System Status: Online</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

// -----------------------------------------
// TRACKER APP FOR PCA (The actual tracking interface)
// -----------------------------------------

const SERVICES = [
  "Dressing",
  "Eating/Meal Prep",
  "Mobility/Ambulation",
  "Positioning/Transferring",
  "Toileting/Diapering",
];

function TrackerApp({
  pcas,
  students,
  classroomId,
  user,
  activeToken,
  resetActiveToken,
}: {
  pcas: any[];
  students: any[];
  classroomId: string;
  user: any;
  activeToken: string | null;
  resetActiveToken: () => void;
}) {
  const [selectedPca, setSelectedPca] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [activeLogs, setActiveLogs] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!classroomId) return;

    const today = format(new Date(), "yyyy-MM-dd");

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    const load = async () => {
      const logs = await pb.collection("serviceLogs").getFullList({
        filter: `classroom = "${classroomId}" && date = "${today}"`,
      });
      if (!cancelled) setActiveLogs(logs.filter((l: any) => !l.endTime));
    };
    load().catch((e) => console.error("Error heavily fetching active logs", e));

    pb.collection("serviceLogs")
      .subscribe("*", (e) => {
        if (e.record.date !== today) return;
        setActiveLogs((prev) => {
          const withoutRecord = prev.filter((l) => l.id !== e.record.id);
          if (e.action === "delete" || e.record.endTime) return withoutRecord;
          return [...withoutRecord, e.record];
        });
      }, { filter: `classroom = "${classroomId}"` })
      .then((unsub) => { if (cancelled) unsub(); else unsubscribe = unsub; })
      .catch((e) => console.error("Error subscribing to active logs", e));

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [classroomId]);

  const startService = async (serviceType: string) => {
    if (!selectedPca || !selectedStudent || !classroomId || !user) return;
    const now = Date.now();
    const todayStr = format(now, "yyyy-MM-dd");

    try {
      await pb.collection("serviceLogs").create({
        classroom: classroomId,
        student: selectedStudent.id,
        pca: selectedPca.id,
        serviceType,
        startTime: now,
        date: todayStr,
        createdAt: now,
        updatedAt: now,
      });
      // reset selection
      setSelectedPca(null);
      setSelectedStudent(null);
    } catch (e) {
      handlePocketbaseError(e, "create", "serviceLogs", user);
    }
  };

  const endService = async (logId: string) => {
    if (!user) return;
    try {
      await pb.collection("serviceLogs").update(logId, {
        endTime: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (e) {
      handlePocketbaseError(e, "update", `serviceLogs/${logId}`, user);
    }
  };

  // If no one is selected, show PCA selection if there are active logs? Wait, PCAs click their name FIRST.
  // If PCA is selected, they pick a student, then click Start.
  const getPcaName = (id: string) =>
    pcas.find((p) => p.id === id)?.name || "Unknown PCA";
  const getStudentName = (id: string) =>
    students.find((s) => s.id === id)?.name || "Unknown Student";

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Left Col: Main Tracker Flow */}
      <div className="flex-grow flex flex-col space-y-6">
        {!selectedPca && (
          <div className="flex-grow flex flex-col space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Who are you? (Select PCA)
                </h2>
                <p className="text-slate-500 mt-1">
                  Tap your name to begin logging services.
                </p>
              </div>
              {activeToken && (
                <div className="flex flex-col items-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetActiveToken}
                    className="text-xs"
                  >
                    Reset QR Codes
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
              {pcas.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPca(p)}
                  className="bg-white border-2 border-slate-100 p-6 rounded-2xl shadow-sm hover:border-blue-400 cursor-pointer group flex flex-col items-center justify-center min-h-[160px] transition-all"
                >
                  <div className="bg-white p-2 mb-4 rounded-lg border border-slate-200 shadow-sm transition-transform group-hover:scale-105 pointer-events-none">
                    <QRCode
                       value={`${window.location.origin}${window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/'}#/pca/${classroomId}/${activeToken}/${p.id}`}
                       size={80}
                     />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 text-center">
                    {p.name}
                  </h3>
                </div>
              ))}
              {pcas.length === 0 && (
                <p className="text-slate-500 col-span-3 text-center py-10 border border-dashed rounded-xl border-slate-300">
                  Please ask the teacher to add PCAs first.
                </p>
              )}
            </div>
          </div>
        )}

        {selectedPca && !selectedStudent && (
          <div className="flex-grow flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-700">
                  Hi, {selectedPca.name}
                </h2>
                <p className="text-sm text-slate-500">
                  Which student are you helping?
                </p>
              </div>
              <button
                onClick={() => setSelectedPca(null)}
                className="text-xs font-semibold px-3 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition-colors"
              >
                ← Not you?
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {students.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className="bg-white border-2 border-slate-100 p-5 rounded-2xl shadow-sm hover:border-blue-400 cursor-pointer group transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                      {s.name.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{s.name}</h3>
                </div>
              ))}
              {students.length === 0 && (
                <p className="text-slate-500 col-span-3 text-center py-10 border border-dashed rounded-xl border-slate-300">
                  No students found. Add them first.
                </p>
              )}
            </div>
          </div>
        )}

        {selectedPca && selectedStudent && (
          <div className="flex-grow flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-700">
                  Student: {selectedStudent.name}
                </h2>
                <p className="text-sm text-slate-500">
                  Select the service to start tracking time.
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-xs font-semibold px-3 py-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition-colors"
              >
                ← Change Student
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {SERVICES.map((srv) => (
                <div
                  key={srv}
                  className="bg-white border-2 border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col items-center"
                >
                  <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">
                    {srv}
                  </h3>
                  <button
                    onClick={() => startService(srv)}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                  >
                    START SESSION
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Col: Active Sessions */}
      <aside className="w-full lg:w-80 flex flex-col space-y-4 shrink-0 mt-6 lg:mt-0">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-14rem)]">
          <h2 className="text-sm font-bold text-slate-800 mb-4 flex items-center">
            <svg
              className="w-4 h-4 mr-2 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.414L11 9.586V6z"></path>
            </svg>
            Active Services ({activeLogs.length})
          </h2>
          <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
            {activeLogs.map((log) => {
              const pcaName = getPcaName(log.pca);
              const studentName = getStudentName(log.student);
              const elapsedMins = Math.floor((now - log.startTime) / 60000);
              const isOvertime = elapsedMins > 120;

              return (
                <div
                  key={log.id}
                  className={`border-2 p-4 rounded-2xl shadow-sm mb-4 ${
                    isOvertime ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm ${
                      isOvertime ? 'bg-red-600' : 'bg-blue-600'
                    }`}>
                      {studentName.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <h3 className={`text-md font-bold ${
                    isOvertime ? 'text-red-900' : 'text-blue-900'
                  }`}>
                    {studentName}
                  </h3>
                  <p className={`text-[10px] uppercase font-bold mb-2 ${
                    isOvertime ? 'text-red-700' : 'text-blue-700'
                  }`}>
                    {log.serviceType} • {pcaName}
                  </p>
                  <div className={`flex items-center space-x-2 my-2 ${
                    isOvertime ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    <span className={`animate-pulse h-2 w-2 rounded-full ${
                      isOvertime ? 'bg-red-600' : 'bg-blue-600'
                    }`}></span>
                    <span className="text-sm font-bold flex flex-col">
                      <span>Recording: {elapsedMins}m</span>
                      {isOvertime && <span className="text-xs font-bold text-red-500 mt-1 uppercase">⚠️ Forgot to Stop?</span>}
                    </span>
                  </div>
                  <button
                    onClick={() => endService(log.id)}
                    className="w-full py-2 mt-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm shadow-md shadow-red-100 transition-colors active:scale-95"
                  >
                    END SESSION
                  </button>
                </div>
              );
            })}
            {activeLogs.length === 0 && (
              <div className="text-center p-8 text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                No services currently running.
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

// -----------------------------------------
// DATA MANAGER
// -----------------------------------------

function ServiceLogsManager({
  logs,
  user,
  classroomId,
  pcas,
  students,
}: any) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [studentId, setStudentId] = useState("");
  const [pcaId, setPcaId] = useState("");
  const [serviceType, setServiceType] = useState("Dressing");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:15");

  const [editingLog, setEditingLog] = useState<any>(null);

  const addManualLog = async () => {
    if (!studentId || !pcaId || !date || !startTime || !endTime) return;

    try {
      // Parse start and end times into milliseconds
      const startD = new Date(`${date}T${startTime}`);
      const endD = new Date(`${date}T${endTime}`);

      await pb.collection("serviceLogs").create({
        classroom: classroomId,
        student: studentId,
        pca: pcaId,
        serviceType,
        date,
        startTime: startD.getTime(),
        endTime: endD.getTime(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (e) {
      handlePocketbaseError(e, "create", "serviceLogs", user);
    }
  };

  const deleteLog = async (id: string) => {
    try {
      await pb.collection("serviceLogs").delete(id);
      // The realtime subscription in the parent will pick up the delete event.
    } catch (e) {
      handlePocketbaseError(e, "delete", `serviceLogs/${id}`, user);
    }
  };

  const saveEditLog = async () => {
    if (!editingLog) return;
    try {
      const startD = new Date(`${editingLog.editDate}T${editingLog.editStartTime}`);
      const endD = editingLog.editEndTime ? new Date(`${editingLog.editDate}T${editingLog.editEndTime}`) : null;

      await pb.collection("serviceLogs").update(editingLog.id, {
        date: editingLog.editDate,
        student: editingLog.student,
        pca: editingLog.pca,
        serviceType: editingLog.serviceType,
        startTime: startD.getTime(),
        ...(endD ? { endTime: endD.getTime() } : {}),
        updatedAt: Date.now()
      });
      setEditingLog(null);
    } catch (e) {
      handlePocketbaseError(e, "update", `serviceLogs/${editingLog.id}`, user);
    }
  };

  const startEditLog = (log: any) => {
    setEditingLog({
      ...log,
      editDate: log.date || format(log.startTime, "yyyy-MM-dd"),
      editStartTime: format(log.startTime, "HH:mm"),
      editEndTime: log.endTime ? format(log.endTime, "HH:mm") : "",
    });
  };

  const getPcaName = (id: string) =>
    pcas.find((p: any) => p.id === id)?.name || "Unknown";
  const getStudentName = (id: string) =>
    students.find((s: any) => s.id === id)?.name || "Unknown";

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-lg">Manual Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Student
              </label>
              <select
                className="w-full h-10 px-3 border rounded-md"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              >
                <option value="">Select Student...</option>
                {students.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">
                PCA
              </label>
              <select
                className="w-full h-10 px-3 border rounded-md"
                value={pcaId}
                onChange={(e) => setPcaId(e.target.value)}
              >
                <option value="">Select PCA...</option>
                {pcas.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Service
              </label>
              <select
                className="w-full h-10 px-3 border rounded-md"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              >
                {SERVICES.map((srv) => (
                  <option key={srv} value={srv}>
                    {srv}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Start Time
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">
                End Time
              </label>
              <div className="flex space-x-2 w-full">
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
                <Button className="shrink-0" onClick={addManualLog}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {editingLog && (
        <Card className="border-amber-400 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg text-amber-900">Edit Log Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-700 uppercase">Date</label>
                <Input type="date" value={editingLog.editDate} onChange={(e) => setEditingLog({ ...editingLog, editDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-700 uppercase">Student</label>
                <select className="w-full h-10 px-3 border rounded-md" value={editingLog.student} onChange={(e) => setEditingLog({ ...editingLog, student: e.target.value })}>
                  {students.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-700 uppercase">PCA</label>
                <select className="w-full h-10 px-3 border rounded-md" value={editingLog.pca} onChange={(e) => setEditingLog({ ...editingLog, pca: e.target.value })}>
                  {pcas.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-700 uppercase">Service</label>
                <select className="w-full h-10 px-3 border rounded-md" value={editingLog.serviceType} onChange={(e) => setEditingLog({ ...editingLog, serviceType: e.target.value })}>
                  {SERVICES.map((srv) => <option key={srv} value={srv}>{srv}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-700 uppercase">Start Time</label>
                <Input type="time" value={editingLog.editStartTime} onChange={(e) => setEditingLog({ ...editingLog, editStartTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-700 uppercase">End Time</label>
                <div className="flex space-x-2 w-full">
                  <Input type="time" value={editingLog.editEndTime} onChange={(e) => setEditingLog({ ...editingLog, editEndTime: e.target.value })} />
                  <Button className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white" onClick={saveEditLog}>Save</Button>
                  <Button variant="outline" className="shrink-0" onClick={() => setEditingLog(null)}>Cancel</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historical Service Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>PCA</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => (
                <TableRow key={log.id} className={editingLog?.id === log.id ? "bg-amber-50" : ""}>
                  <TableCell>{log.date}</TableCell>
                  <TableCell className="font-medium">
                    {getStudentName(log.student)}
                  </TableCell>
                  <TableCell>{getPcaName(log.pca)}</TableCell>
                  <TableCell>{log.serviceType}</TableCell>
                  <TableCell>{format(log.startTime, "h:mm a")}</TableCell>
                  <TableCell>
                    {log.endTime ? (
                      format(log.endTime, "h:mm a")
                    ) : (
                      <span className="text-orange-500 font-bold text-xs uppercase">
                        Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => startEditLog(log)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteLog(log.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-slate-500 py-4"
                  >
                    No logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------------------
// EXPORT & PRINT
// -----------------------------------------

function ExportManager({
  logs,
  pcas,
  students,
  exportStartDate,
  setExportStartDate,
  exportEndDate,
  setExportEndDate,
}: {
  logs: any[];
  pcas: any[];
  students: any[];
  exportStartDate: string;
  setExportStartDate: any;
  exportEndDate: string;
  setExportEndDate: any;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterPca, setFilterPca] = useState("ALL");
  const [filterStudent, setFilterStudent] = useState("ALL");

  const handlePrint = async () => {
    setIsGenerating(true);
    try {
      let filteredLogs = logs.filter(
        (l) => l.date >= exportStartDate && l.date <= exportEndDate,
      );
      if (filterPca !== "ALL")
        filteredLogs = filteredLogs.filter((l) => l.pca === filterPca);
      if (filterStudent !== "ALL")
        filteredLogs = filteredLogs.filter(
          (l) => l.student === filterStudent,
        );

      if (filteredLogs.length === 0) {
        alert("No logs found for the selected criteria.");
        setIsGenerating(false);
        return;
      }

      // Group logs
      const map = new Map<string, any[]>();
      filteredLogs.forEach((l) => {
        const minKey = `${l.date}_${l.student}_${l.pca}`;
        if (!map.has(minKey)) map.set(minKey, []);
        map.get(minKey)!.push(l);
      });

      const sheets: any[] = [];
      map.forEach((sheetLogs, key) => {
        const [date, studentId, pcaId] = key.split("_");
        const studentName =
          students.find((s) => s.id === studentId)?.name || "Unknown";
        const pcaName = pcas.find((p) => p.id === pcaId)?.name || "Unknown";
        sheets.push({ date, studentName, pcaName, logs: sheetLogs });
      });
      sheets.sort((a, b) => b.date.localeCompare(a.date));

      const pdf = new jsPDF("l", "pt", "letter");

      sheets.forEach((sheet, index) => {
        if (index > 0) pdf.addPage();

        // Add top header table
        autoTable(pdf, {
          theme: "grid",
          body: [
            [
              `Date:\n${sheet.date}`,
              `Student Name:\n${sheet.studentName}`,
              `Personal Care Assistant:\n${sheet.pcaName}`,
              "Service\ndocumented in\nEdPlan/EasyTrac",
            ],
          ],
          styles: {
            lineWidth: 1,
            lineColor: [0, 0, 0],
            textColor: [0, 0, 0],
            fontSize: 12,
            minCellHeight: 40,
            halign: "center",
            valign: "middle",
          },
          margin: { top: 40, left: 40, right: 40 },
        });

        // Prepare services body
        const bodyLines: any[] = [];
        SERVICES.forEach((service) => {
          const srvLogs = sheet.logs
            .filter((l: any) => l.serviceType === service)
            .sort((a: any, b: any) => a.startTime - b.startTime);

          const row = [service];
          for (let i = 0; i < 4; i++) {
            const log = srvLogs[i];
            if (log) {
              row.push(
                `${format(log.startTime, "h:mm a")} - ${log.endTime ? format(log.endTime, "h:mm a") : "..."}`,
              );
            } else {
              row.push("-");
            }
          }
          row.push(""); // PCA Initial
          bodyLines.push(row);
        });

        // Main form table
        autoTable(pdf, {
          theme: "grid",
          head: [
            [
              "Service Type:",
              "Start Time - End Time",
              "Start Time - End Time",
              "Start Time - End Time",
              "Start Time - End Time",
              "PCA initial",
            ],
          ],
          body: bodyLines,
          styles: {
            lineWidth: 1,
            lineColor: [0, 0, 0],
            textColor: [0, 0, 0],
            fontSize: 10,
            cellPadding: 10,
            halign: "center",
            valign: "middle",
            minCellHeight: 60,
          },
          headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            fontStyle: "bold",
          },
          margin: { left: 40, right: 40 },
          // By default autoTable places the table right after the prev if setting startY
          // but we can just use the finalY from the previous table
          startY: (pdf as any).lastAutoTable.finalY + 10,
        });
      });

      pdf.save(`Medicaid_Logs_${exportStartDate}_to_${exportEndDate}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export & Print</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-slate-600">
          Generate a Medicaid compliance PDF matching the standard paper form.
          It will create one page per PCA/Student combination for each date they
          worked together.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="space-y-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Start Date
            </label>
            <Input
              type="date"
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-500 uppercase">
              End Date
            </label>
            <Input
              type="date"
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-500 uppercase">
              PCA Filter
            </label>
            <select
              className="w-full h-10 px-3 border rounded-md"
              value={filterPca}
              onChange={(e) => setFilterPca(e.target.value)}
            >
              <option value="ALL">All PCAs</option>
              {pcas.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Student Filter
            </label>
            <select
              className="w-full h-10 px-3 border rounded-md"
              value={filterStudent}
              onChange={(e) => setFilterStudent(e.target.value)}
            >
              <option value="ALL">All Students</option>
              {students.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            disabled={isGenerating}
            onClick={handlePrint}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 shadow-md"
          >
            {isGenerating ? (
              "Generating..."
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  ></path>
                </svg>
                Generate PDF
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
