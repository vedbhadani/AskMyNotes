import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Binary, Mail, Lock, User, UserPlus } from 'lucide-react';

export default function SignUpPage({ onGoSignIn }) {
    const { signUp } = useAuth();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleSubmit = e => {
        e.preventDefault();
        setError('');

        if (!form.name.trim() || !form.email.trim() || !form.password || !form.confirm) {
            setError('Please fill in all fields.');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (form.password !== form.confirm) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        const result = signUp({ name: form.name.trim(), email: form.email.trim(), password: form.password });
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

                <h2 className="auth-heading">Create an account</h2>
                <p className="auth-subheading">Start studying smarter with AI-powered notes</p>

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    <div className="auth-field">
                        <label className="auth-label" htmlFor="signup-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <User size={12} /> Full name
                        </label>
                        <input
                            id="signup-name"
                            className="auth-input"
                            type="text"
                            name="name"
                            placeholder="Jane Doe"
                            value={form.name}
                            onChange={handleChange}
                            autoComplete="name"
                            autoFocus
                        />
                    </div>

                    <div className="auth-field">
                        <label className="auth-label" htmlFor="signup-email" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Mail size={12} /> Email
                        </label>
                        <input
                            id="signup-email"
                            className="auth-input"
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={handleChange}
                            autoComplete="email"
                        />
                    </div>

                    <div className="auth-field">
                        <label className="auth-label" htmlFor="signup-password" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Lock size={12} /> Password
                        </label>
                        <input
                            id="signup-password"
                            className="auth-input"
                            type="password"
                            name="password"
                            placeholder="At least 6 characters"
                            value={form.password}
                            onChange={handleChange}
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="auth-field">
                        <label className="auth-label" htmlFor="signup-confirm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Lock size={12} /> Confirm password
                        </label>
                        <input
                            id="signup-confirm"
                            className="auth-input"
                            type="password"
                            name="confirm"
                            placeholder="••••••••"
                            value={form.confirm}
                            onChange={handleChange}
                            autoComplete="new-password"
                        />
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button
                        className="btn btn-primary btn-lg auth-submit"
                        type="submit"
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                        {loading ? 'Creating account…' : <><UserPlus size={18} /> Create account</>}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account?{' '}
                    <button className="auth-link" onClick={onGoSignIn}>
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    );
}
