import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Binary, Mail, Lock, LogIn } from 'lucide-react';

export default function SignInPage({ onGoSignUp }) {
    const { signIn } = useAuth();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        if (!form.email.trim() || !form.password) {
            setError('Please fill in all fields.');
            return;
        }
        setLoading(true);
        const result = signIn(form);
        setLoading(false);
        if (result.error) setError(result.error);
    };

    return (
        <div className="auth-screen">
            <div className="auth-card">
                {/* Logo */}
                <div className="auth-logo">
                    <div className="logo-mark">
                        <Binary size={16} color="var(--bg-primary)" />
                    </div>
                    <span className="auth-logo-name">AskMyNotes</span>
                </div>

                <h2 className="auth-heading">Welcome back</h2>
                <p className="auth-subheading">Sign in to your account to continue</p>

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    <div className="auth-field">
                        <label className="auth-label" htmlFor="signin-email" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Mail size={12} /> Email
                        </label>
                        <input
                            id="signin-email"
                            className="auth-input"
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={handleChange}
                            autoComplete="email"
                            autoFocus
                        />
                    </div>

                    <div className="auth-field">
                        <label className="auth-label" htmlFor="signin-password" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Lock size={12} /> Password
                        </label>
                        <input
                            id="signin-password"
                            className="auth-input"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={handleChange}
                            autoComplete="current-password"
                        />
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button
                        className="btn btn-primary btn-lg auth-submit"
                        type="submit"
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                        {loading ? 'Signing in…' : <><LogIn size={18} /> Sign in</>}
                    </button>
                </form>

                <p className="auth-switch">
                    Don't have an account?{' '}
                    <button className="auth-link" onClick={onGoSignUp}>
                        Create one
                    </button>
                </p>
            </div>
        </div>
    );
}
