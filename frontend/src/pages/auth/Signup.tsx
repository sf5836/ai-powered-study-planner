import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

type SignupValues = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type SignupTouched = {
  fullName: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmailValid(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

function isPasswordValid(value: string): boolean {
  return value.length >= 8;
}

function FocusIqLogo() {
  return (
    <div className="flex items-center gap-3">
      <svg width="46" height="46" viewBox="0 0 46 46" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="28" height="34" rx="5" stroke="#FFFFFF" strokeWidth="2.5" />
        <path d="M17 6V40" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        <path d="M32 16C35.5 12.5 41 15 41.8 20.1C42.5 24.4 39.8 26.9 37 27.8C38.8 30.1 38.4 33.4 35.9 35.2C33 37.3 29 36.1 27.7 33.1" stroke="#00C2CB" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="35.4" cy="21.2" r="1.5" fill="#00C2CB" />
      </svg>
      <h1 className="font-display text-4xl leading-none tracking-tight">
        <span className="font-bold text-white">Focus</span>
        <span className="font-bold text-cyan">IQ</span>
      </h1>
    </div>
  );
}

function DecorativePattern() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <circle cx="20" cy="16" r="6" fill="#7B2FBE" opacity="0.2" />
      <circle cx="75" cy="26" r="9" fill="#00C2CB" opacity="0.12" />
      <circle cx="82" cy="72" r="7" fill="#7B2FBE" opacity="0.13" />
      <circle cx="14" cy="84" r="5" fill="#00C2CB" opacity="0.16" />
      <path d="M52 12 L68 12 L60 26 Z" fill="#00C2CB" opacity="0.18" />
      <path d="M10 52 L24 72 L2 72 Z" fill="#7B2FBE" opacity="0.16" />
      <path d="M70 76 L90 96 L58 96 Z" fill="#00C2CB" opacity="0.1" />
    </svg>
  );
}

function fieldInputClass(hasError: boolean): string {
  const base =
    "w-full rounded-btn border bg-white dark:bg-gray-950 px-3 py-2.5 pr-11 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition";
  if (hasError) {
    return `${base} border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/50`;
  }
  return `${base} border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:border-cyan focus:ring-2 focus:ring-cyan/35 disabled:cursor-not-allowed disabled:opacity-60`;
}

export default function SignupPage() {
  const navigate = useNavigate();
  const signup = useAuthStore((state) => state.signup);

  const [values, setValues] = useState<SignupValues>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [touched, setTouched] = useState<SignupTouched>({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validity = useMemo(
    () => ({
      fullName: values.fullName.trim().length > 0,
      email: isEmailValid(values.email),
      password: isPasswordValid(values.password),
      confirmPassword: values.confirmPassword.length > 0 && values.confirmPassword === values.password,
    }),
    [values]
  );

  const errors = {
    fullName: touched.fullName && !validity.fullName ? "Full Name is required" : "",
    email: touched.email && !values.email.trim() ? "Email is required" : touched.email && !validity.email ? "Enter a valid email address" : "",
    password:
      touched.password && !values.password
        ? "Password is required"
        : touched.password && !validity.password
          ? "Password must be at least 8 characters"
          : "",
    confirmPassword:
      touched.confirmPassword && !values.confirmPassword
        ? "Confirm Password is required"
        : touched.confirmPassword && !validity.confirmPassword
          ? "Passwords must match"
          : "",
  };

  const isFormValid = validity.fullName && validity.email && validity.password && validity.confirmPassword;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
    setSubmitError("");

    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(values.fullName.trim(), values.email.trim(), values.password);
      navigate("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Signup failed";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-lightBg dark:bg-darkBg md:grid md:grid-cols-2">
      <section className="relative hidden md:flex items-center justify-center overflow-hidden bg-navy p-10">
        <DecorativePattern />
        <div className="relative z-10 max-w-sm text-center">
          <FocusIqLogo />
          <p className="mt-6 font-display text-2xl text-white/80">Study smarter. Stay focused.</p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-card border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="font-display text-3xl text-navy dark:text-white">Create your account</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Get started with FocusIQ</p>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="fullName" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-navy dark:text-white">
                Full Name
                {validity.fullName && <CheckCircle2 size={16} className="text-green-600" />}
              </label>
              <input
                id="fullName"
                type="text"
                value={values.fullName}
                onChange={(event) => setValues((prev) => ({ ...prev, fullName: event.target.value }))}
                onBlur={() => setTouched((prev) => ({ ...prev, fullName: true }))}
                className={fieldInputClass(Boolean(errors.fullName))}
                disabled={isSubmitting}
              />
              {errors.fullName && <p className="mt-1.5 text-xs text-red-600">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-navy dark:text-white">
                Email
                {validity.email && <CheckCircle2 size={16} className="text-green-600" />}
              </label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={values.email}
                onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                className={fieldInputClass(Boolean(errors.email))}
                disabled={isSubmitting}
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-navy dark:text-white">
                Password
                {validity.password && <CheckCircle2 size={16} className="text-green-600" />}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={values.password}
                  onChange={(event) => setValues((prev) => ({ ...prev, password: event.target.value }))}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  className={fieldInputClass(Boolean(errors.password))}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-navy dark:text-white">
                Confirm Password
                {validity.confirmPassword && <CheckCircle2 size={16} className="text-green-600" />}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={values.confirmPassword}
                  onChange={(event) => setValues((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                  className={fieldInputClass(Boolean(errors.confirmPassword))}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>}
            </div>

            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-btn bg-cyan px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" fill="none" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" className="opacity-90" fill="none" />
                  </svg>
                </>
              ) : (
                "Create account"
              )}
            </button>

            {submitError && <p className="text-center text-xs text-red-600">{submitError}</p>}

            <p className="text-center text-sm text-gray-600 dark:text-gray-300">
              Already have an account?{" "}
              <Link to="/auth/login" className="font-semibold text-cyan hover:underline">
                Sign in →
              </Link>
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
