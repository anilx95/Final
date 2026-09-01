import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const registerSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid Gmail / email address'),
  password: z.string().optional().refine(
    (value) => !value || value.length >= 6,
    'Password must be at least 6 characters',
  ),
  role: z.enum(['student', 'teacher']),
  college_name: z.string().min(2, 'College / Institution Name is mandatory.'),
  phone: z.string().optional(),
  roll_number: z.string().optional(),
  employee_id: z.string().optional(),
  disability_profiles: z.array(z.string()).optional(),
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const { register: registerAccount } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'student',
      disability_profiles: [],
    },
  });

  const selectedRole = watch('role');
  const selectedDisabilities = watch('disability_profiles') || [];

  const handleDisabilityToggle = (profile: string) => {
    setValue(
      'disability_profiles',
      selectedDisabilities.includes(profile)
        ? selectedDisabilities.filter((item) => item !== profile)
        : [...selectedDisabilities, profile],
    );
  };

  const onSubmit = async (data: RegisterFormInputs) => {
    const currentEmail = (data.email || '').trim().toLowerCase();
    setIsSubmitting(true);
    try {
      const role = await registerAccount({ ...data, email: currentEmail });
      addToast({
        type: 'success',
        title: 'Account Registered Successfully',
        description: `Welcome to ClassAbly! Your ${role.toUpperCase()} account is ready.`,
      });

      if (role === 'admin') navigate('/admin');
      else if (role === 'teacher') navigate('/teacher');
      else navigate('/student');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Registration Failed',
        description: err.response?.data?.detail || 'Registration encountered an error. Please try again.',
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

      {/* Register Card */}
      <div className="login-card">
        <h2 className="login-card__title">Create your account</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="login-form">
          {/* Full Name */}
          <div className="login-field">
            <label htmlFor="reg-fullname" className="login-field__label">
              Full Name
            </label>
            <div className="login-field__input-wrapper">
              <input
                id="reg-fullname"
                type="text"
                autoComplete="name"
                required
                {...register('full_name')}
                className={`login-field__input${errors.full_name ? ' login-field__input--error' : ''}`}
              />
            </div>
            {errors.full_name && (
              <p className="login-field__error">{errors.full_name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="login-field">
            <label htmlFor="reg-email" className="login-field__label">
              Email
            </label>
            <div className="login-field__input-wrapper">
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                {...register('email')}
                className={`login-field__input${errors.email ? ' login-field__input--error' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="login-field__error">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="login-field">
            <label htmlFor="reg-phone" className="login-field__label">
              Phone
            </label>
            <div className="login-field__input-wrapper">
              <input
                id="reg-phone"
                type="text"
                {...register('phone')}
                className="login-field__input"
              />
            </div>
          </div>

          {/* College / Institution */}
          <div className="login-field">
            <label htmlFor="reg-college" className="login-field__label">
              College / Institution
            </label>
            <div className="login-field__input-wrapper">
              <input
                id="reg-college"
                type="text"
                required
                {...register('college_name')}
                className={`login-field__input${errors.college_name ? ' login-field__input--error' : ''}`}
              />
            </div>
            {errors.college_name && (
              <p className="login-field__error">{errors.college_name.message}</p>
            )}
          </div>

          {/* Account Details Divider */}
          <div className="login-field__divider">Account details</div>

          {/* Role Selector */}
          <div className="login-field">
            <div className="login-role-grid">
              {(['student', 'teacher'] as const).map((role) => (
                <button
                  type="button"
                  key={role}
                  onClick={() => setValue('role', role)}
                  className={`login-role-btn${selectedRole === role ? ' login-role-btn--active' : ''}`}
                >
                  {role === 'student' ? 'Student' : 'Teacher'}
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label htmlFor="reg-password" className="login-field__label">
              Password
            </label>
            <div className="login-field__input-wrapper">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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

          {/* Role-specific fields */}
          {selectedRole === 'student' ? (
            <>
              <div className="login-field">
                <label htmlFor="reg-roll" className="login-field__label">
                  Roll Number / Student ID
                </label>
                <div className="login-field__input-wrapper">
                  <input
                    id="reg-roll"
                    type="text"
                    {...register('roll_number')}
                    className="login-field__input"
                  />
                </div>
              </div>

              <div className="login-check-grid">
                {([['visual_impairment', 'Visual support'], ['hearing_impairment', 'Hearing support']] as const).map(([id, label]) => (
                  <label key={id} className="login-remember">
                    <input
                      type="checkbox"
                      checked={selectedDisabilities.includes(id)}
                      onChange={() => handleDisabilityToggle(id)}
                      className="login-remember__checkbox"
                    />
                    <span className="login-remember__text">{label}</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <div className="login-field">
              <label htmlFor="reg-empid" className="login-field__label">
                Employee ID
              </label>
              <div className="login-field__input-wrapper">
                <input
                  id="reg-empid"
                  type="text"
                  {...register('employee_id')}
                  className="login-field__input"
                />
              </div>
            </div>
          )}

          {/* Register Button */}
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
                Creating account...
              </span>
            ) : (
              'REGISTER'
            )}
          </button>
        </form>
      </div>

      {/* Login Link */}
      <p className="login-register">
        Already have an account?{' '}
        <Link to="/login" className="login-register__link">
          Login
        </Link>
      </p>
    </div>
  );
};
