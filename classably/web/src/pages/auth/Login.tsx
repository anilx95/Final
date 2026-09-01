import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const loginSchema = z.object({
  email: z.string().min(1, 'Please enter your email or phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginInputs = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleRoleRedirect = (role: string) => {
    if (role === 'admin') navigate('/admin');
    else if (role === 'teacher') navigate('/teacher');
    else navigate('/student');
  };

  const onSubmit = async (data: LoginInputs) => {
    setIsSubmitting(true);
    try {
      const role = await login(data.email, data.password);
      if (rememberMe) {
        localStorage.setItem('classably_remember', 'true');
      } else {
        localStorage.removeItem('classably_remember');
      }
      addToast({
        type: 'success',
        title: 'Authentication Successful',
        description: `Welcome back! Signed in as ${role.toUpperCase()}.`,
      });
      handleRoleRedirect(role);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Login Failed',
        description: err.response?.data?.detail || 'Invalid email or password credentials.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      {/* Brand Header */}
      <div className="login-brand">
        <div className="login-brand__icon">
          <GraduationCap size={24} color="#1d43d9" />
        </div>
        <h1 className="login-brand__name">ClassAbly</h1>
        <p className="login-brand__tagline">Smart Classroom Engine</p>
      </div>

      {/* Login Card */}
      <div className="login-card">
        <h2 className="login-card__title">Welcome Back</h2>
        <p className="login-card__subtitle">Please enter your details to sign in.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form">
          {/* Email / Phone */}
          <div className="login-field">
            <label htmlFor="login-email" className="login-field__label">
              Email or Phone Number
            </label>
            <div className="login-field__input-wrapper">
              <input
                id="login-email"
                type="text"
                autoComplete="username"
                {...register('email')}
                className={`login-field__input${errors.email ? ' login-field__input--error' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="login-field__error">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="login-field">
            <label htmlFor="login-password" className="login-field__label">
              Password
            </label>
            <div className="login-field__input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                {...register('password')}
                className={`login-field__input login-field__input--with-toggle${errors.password ? ' login-field__input--error' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="login-field__toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="login-field__toggle-icon" />
                ) : (
                  <Eye className="login-field__toggle-icon" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="login-field__error">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me */}
          <label className="login-remember" htmlFor="login-remember">
            <input
              id="login-remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="login-remember__checkbox"
            />
            <span className="login-remember__text">Remember me for 30 days</span>
          </label>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="login-submit"
          >
            {isSubmitting ? (
              <span className="login-submit__loading">
                <svg className="login-submit__spinner" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
                </svg>
                Signing in...
              </span>
            ) : (
              'LOGIN'
            )}
          </button>
        </form>
      </div>

      {/* Register Link */}
      <p className="login-register">
        Don't have an account?{' '}
        <Link to="/register" className="login-register__link">
          Register here
        </Link>
      </p>
    </div>
  );
};
