import { useEffect, useState } from 'react';
import { pb, logout } from '../services/pocketbase';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { handlePocketbaseError } from '../lib/pocketbase-errors';
import { useAuth } from '../contexts/AuthContext';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { Link, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

export function AdminDashboard() {
    const [users, setUsers] = useState<any[]>([]);
    const [classrooms, setClassrooms] = useState<any[]>([]);
    const [editingClassroom, setEditingClassroom] = useState<any>(null);
    const [newClassName, setNewClassName] = useState("");
    const [newClassTeacherIds, setNewClassTeacherIds] = useState<string[]>([]);
    const [deletingClassroom, setDeletingClassroom] = useState<any>(null);
    const [isCreatingClassroom, setIsCreatingClassroom] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadUsers();
        loadClassrooms();
    }, []);

    const loadUsers = async () => {
        try {
            setUsers(await pb.collection('users').getFullList());
        } catch (e) {
            handlePocketbaseError(e, 'list', 'users', user);
        }
    };

    const loadClassrooms = async () => {
        try {
            setClassrooms(await pb.collection('classrooms').getFullList());
        } catch (e) {
            handlePocketbaseError(e, 'list', 'classrooms', user);
        }
    };

    const updateRole = async (targetUser: any, newRole: string) => {
        if (!user) return;
        try {
            await pb.collection('users').update(targetUser.id, { role: newRole });
            loadUsers();
        } catch (e) {
            handlePocketbaseError(e, 'update', `users/${targetUser.id}`, user);
        }
    };

    const deleteUser = async (id: string) => {
        if (!user) return;
        try {
            await pb.collection('users').delete(id);
            loadUsers();
        } catch (e) {
            handlePocketbaseError(e, 'delete', `users/${id}`, user);
        }
    };

    const confirmDeleteClassroom = async () => {
        if (!user || !deletingClassroom) return;
        try {
            await pb.collection('classrooms').delete(deletingClassroom.id);
            loadClassrooms();
            setDeletingClassroom(null);
        } catch (e) {
            handlePocketbaseError(e, 'delete', `classrooms/${deletingClassroom.id}`, user);
        }
    };

    const confirmEditClassroom = async () => {
        if (!user || !editingClassroom) return;
        try {
            await pb.collection('classrooms').update(editingClassroom.id, {
                name: newClassName.trim() || editingClassroom.name,
                teacherIds: newClassTeacherIds
            });
            loadClassrooms();
            setEditingClassroom(null);
        } catch (e) {
            handlePocketbaseError(e, 'update', `classrooms/${editingClassroom.id}`, user);
        }
    };

    const confirmCreateClassroom = async () => {
        if (!user || !newClassName.trim() || newClassTeacherIds.length === 0) return;
        try {
            await pb.collection('classrooms').create({
                name: newClassName.trim(),
                teacherIds: newClassTeacherIds,
            });
            loadClassrooms();
            setIsCreatingClassroom(false);
            setNewClassName("");
            setNewClassTeacherIds([]);
        } catch (e) {
            handlePocketbaseError(e, 'create', 'classrooms', user);
        }
    };


    return (
        <div className="flex flex-col h-full flex-grow overflow-hidden bg-slate-50">
            <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm flex-shrink-0">
                <div className="flex items-center space-x-4">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight">Admin Dashboard</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">System Management</p>
                    </div>
                </div>
                <div className="flex items-center space-x-6">
                    <Link to="/teacher" className="flex items-center space-x-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors">
                        <span className="text-sm font-bold text-blue-700">Teacher View</span>
                    </Link>
                    <button onClick={logout} className="flex items-center space-x-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 hover:bg-white transition-colors">
                        <span className="text-sm font-medium text-slate-700">Sign Out</span>
                    </button>
                </div>
            </header>
            <main className="flex-1 overflow-auto p-6 lg:p-10 w-full mx-auto max-w-6xl">
            <Tabs defaultValue="classrooms" className="w-full">
                <TabsList className="mb-6 bg-slate-200/50 p-1 rounded-xl">
                    <TabsTrigger value="classrooms" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Classrooms</TabsTrigger>
                    <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Users</TabsTrigger>
                </TabsList>

                <TabsContent value="classrooms" className="outline-none">
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => { setNewClassName(""); setNewClassTeacherIds([]); setIsCreatingClassroom(true); }}>Create Classroom</Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classrooms.map(c => (
                            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/classroom/${c.id}`)}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle>{c.name}</CardTitle>
                                        <div className="flex space-x-2">
                                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setEditingClassroom(c); setNewClassName(c.name); setNewClassTeacherIds(c.teacherIds || []); }}>Edit</Button>
                                            <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); setDeletingClassroom(c); }}>Delete</Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-slate-500">
                                        Teachers: {(c.teacherIds || []).map((tId: string) => users.find(u => u.id === tId)?.name || users.find(u => u.id === tId)?.email || tId).join(', ') || 'None'}
                                    </p>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                        <Button variant="outline" size="sm">View Resources</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {classrooms.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
                                No classrooms have been created yet.
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="users" className="outline-none">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Users</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Display Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map(u => (
                                        <TableRow key={u.id}>
                                            <TableCell>{u.email}</TableCell>
                                            <TableCell>{u.name}</TableCell>
                                            <TableCell>
                                                <select
                                                    value={u.role || 'pending'}
                                                    onChange={(e) => updateRole(u, e.target.value)}
                                                    className="px-2 py-1 rounded text-xs font-medium border border-slate-200 bg-slate-50"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="pca">PCA</option>
                                                    <option value="teacher">Teacher</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </TableCell>
                                            <TableCell className="space-x-2">
                                                <Button variant="destructive" size="sm" onClick={() => deleteUser(u.id)}>Delete</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {users.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-gray-500 py-4">No users found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            </main>

            {/* Create Modal */}
            {isCreatingClassroom && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-bold mb-4">Create Classroom</h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Classroom Name</label>
                                <input
                                    type="text"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Room 101"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Assign Teachers</label>
                                <div className="space-y-2 border border-slate-300 rounded px-3 py-2 max-h-40 overflow-y-auto bg-slate-50">
                                    {users.filter(u => u.role === 'teacher' || u.role === 'admin').map(u => (
                                        <label key={u.id} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={newClassTeacherIds.includes(u.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setNewClassTeacherIds([...newClassTeacherIds, u.id]);
                                                    else setNewClassTeacherIds(newClassTeacherIds.filter(id => id !== u.id));
                                                }}
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700">{u.name || u.email}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <Button variant="outline" onClick={() => setIsCreatingClassroom(false)}>Cancel</Button>
                            <Button onClick={confirmCreateClassroom} disabled={!newClassName.trim() || newClassTeacherIds.length === 0}>Create</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingClassroom && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-bold mb-4">Edit Classroom</h3>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Classroom Name</label>
                                <input
                                    type="text"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    className="w-full border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Assign Teachers</label>
                                <div className="space-y-2 border border-slate-300 rounded px-3 py-2 max-h-40 overflow-y-auto bg-slate-50">
                                    {users.filter(u => u.role === 'teacher' || u.role === 'admin').map(u => (
                                        <label key={u.id} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={newClassTeacherIds.includes(u.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setNewClassTeacherIds([...newClassTeacherIds, u.id]);
                                                    else setNewClassTeacherIds(newClassTeacherIds.filter(id => id !== u.id));
                                                }}
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700">{u.name || u.email}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <Button variant="outline" onClick={() => setEditingClassroom(null)}>Cancel</Button>
                            <Button onClick={confirmEditClassroom} disabled={!newClassName.trim() || newClassTeacherIds.length === 0}>Save Changes</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deletingClassroom && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-bold mb-2">Delete Classroom</h3>
                        <p className="text-slate-600 mb-6">Are you sure you want to delete <strong>{deletingClassroom.name}</strong>? This cannot be undone.</p>
                        <div className="flex justify-end space-x-3">
                            <Button variant="outline" onClick={() => setDeletingClassroom(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={confirmDeleteClassroom}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
