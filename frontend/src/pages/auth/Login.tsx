import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

type LoginValues = {
  email: string;
  password: string;
};

type LoginTouched = {
  email: boolean;
  password: boolean;
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
      <circle cx="14" cy="18" r="7" fill="#00C2CB" opacity="0.2" />
      <circle cx="72" cy="22" r="5" fill="#7B2FBE" opacity="0.18" />
      <circle cx="84" cy="64" r="9" fill="#00C2CB" opacity="0.12" />
      <circle cx="23" cy="78" r="6" fill="#7B2FBE" opacity="0.15" />
      <path d="M58 8 L66 22 L50 22 Z" fill="#00C2CB" opacity="0.18" />
      <path d="M12 58 L22 76 L2 76 Z" fill="#7B2FBE" opacity="0.14" />
      <path d="M72 78 L86 96 L60 96 Z" fill="#00C2CB" opacity="0.12" />
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

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [values, setValues] = useState<LoginValues>({
    email: "",
    password: "",
  });
  const [touched, setTouched] = useState<LoginTouched>({
    email: false,
    password: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validity = useMemo(
    () => ({
      email: isEmailValid(values.email),
      password: isPasswordValid(values.password),
    }),
    [values]
  );

  const errors = {
    email: touched.email && !values.email.trim() ? "Email is required" : touched.email && !validity.email ? "Enter a valid email address" : "",
    password:
      touched.password && !values.password
        ? "Password is required"
        : touched.password && !validity.password
          ? "Password must be at least 8 characters"
          : "",
  };

  const isFormValid = validity.email && validity.password;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    setSubmitError("");

    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
      navigate("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
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
          <h2 className="font-display text-3xl text-navy dark:text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Sign in to your account</p>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
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

            <div className="text-right">
              <button type="button" className="text-xs font-medium text-cyan hover:underline">
                Forgot password?
              </button>
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
                "Sign in"
              )}
            </button>

            {submitError && <p className="text-center text-xs text-red-600">{submitError}</p>}

            <div className="flex items-center gap-3 pt-1">
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <span className="text-xs text-gray-500 dark:text-gray-400">or</span>
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-btn border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.8-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.6-2.5C16.8 2.9 14.6 2 12 2 6.9 2 2.7 6.3 2.7 11.8S6.9 21.6 12 21.6c6.9 0 9.1-4.9 9.1-7.4 0-.5 0-.9-.1-1.2H12z" />
              </svg>
              Sign in with Google
            </button>

            <p className="text-center text-sm text-gray-600 dark:text-gray-300">
              Don&apos;t have an account?{" "}
              <Link to="/auth/signup" className="font-semibold text-cyan hover:underline">
                Sign up →
              </Link>
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
