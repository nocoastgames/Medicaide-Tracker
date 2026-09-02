import { loginWithPassword, registerAccount } from '../services/pocketbase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState, FormEvent } from 'react';
import { Loader2 } from 'lucide-react';

export function Login() {
    const { user, role, loading } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        if (!loading && user) {
             if (role === 'admin') navigate('/admin');
             else if (role === 'teacher') navigate('/teacher');
             else if (role === 'pending') navigate('/pending');
             else if (role === 'pca') navigate('/pca-dashboard');
        }
    }, [user, role, loading, navigate]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        setErrorMsg("");

        try {
            if (mode === 'signin') {
                await loginWithPassword(email, password);
            } else {
                await registerAccount(email, password, name);
            }
        } catch (e: any) {
            console.error(`${mode} failed`, e);
            setErrorMsg(e?.response?.message || e.message || `An error occurred. Please try again.`);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Medicaid Time Tracker</CardTitle>
                    <CardDescription>{mode === 'signin' ? 'Login to manage or record service times' : 'Create an account to request access'}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200">
                            {errorMsg}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {mode === 'signup' && (
                            <div className="space-y-1">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                        )}
                        <div className="space-y-1">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                        </div>
                        <Button type="submit" disabled={isSubmitting || loading} size="lg" className="w-full">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Please wait...
                                </>
                            ) : mode === 'signin' ? "Sign In" : "Create Account"}
                        </Button>
                    </form>
                    <button
                        type="button"
                        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErrorMsg(""); }}
                        className="text-sm text-slate-500 hover:text-slate-800"
                    >
                        {mode === 'signin' ? "Need an account? Create one" : "Already have an account? Sign in"}
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}
