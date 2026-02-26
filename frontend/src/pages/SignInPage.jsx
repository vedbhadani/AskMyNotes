import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

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
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                        </svg>
                    </div>
                    <span className="auth-logo-name">AskMyNotes</span>
                </div>

                <h2 className="auth-heading">Welcome back</h2>
                <p className="auth-subheading">Sign in to your account to continue</p>

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    <div className="auth-field">
                        <label className="auth-label" htmlFor="signin-email">Email</label>
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
                        <label className="auth-label" htmlFor="signin-password">Password</label>
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
                    >
                        {loading ? 'Signing in…' : 'Sign in'}
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
