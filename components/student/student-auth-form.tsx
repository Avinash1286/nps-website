"use client";

import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/student-client";

const fieldClass =
  "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2e3192] focus:ring-4 focus:ring-sky-100 aria-invalid:border-red-400 aria-invalid:ring-red-100";

function safeAuthError(error: unknown, register: boolean) {
  const details = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const status = Number(details.status ?? details.statusCode ?? 0);
  if (status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  return register
    ? "We could not create your account. Check the details and try again."
    : "The email address or password is incorrect.";
}

export function StudentAuthForm({
  mode,
  registrationComplete = false,
}: {
  mode: "login" | "register";
  registrationComplete?: boolean;
}) {
  const register = mode === "register";
  const router = useRouter();
  const alertRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirmation = String(data.get("passwordConfirmation") ?? "");

    if (register && password !== confirmation) {
      setError("The passwords do not match. Please enter them again.");
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }

    setSubmitting(true);
    try {
      const result = register
        ? await authClient.signUp.email({ name, email, password, termsAccepted: true })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(safeAuthError(result.error, register));
        requestAnimationFrame(() => alertRef.current?.focus());
        setSubmitting(false);
        return;
      }
      router.replace(register ? "/student/login?registered=1" : "/student/articles");
      router.refresh();
    } catch {
      setError("We could not connect to the student account service. Please try again.");
      requestAnimationFrame(() => alertRef.current?.focus());
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-[#f7f8fd] px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1fr)] lg:items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold tracking-[.2em] text-[#2e3192] uppercase">
            Student publishing
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-[-.04em] text-[#12123a] sm:text-5xl">
            {register ? "Create your student account" : "Welcome back"}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
            {register
              ? "Write school-appropriate articles, save private drafts, and send finished work to authorised staff for review."
              : "Sign in to continue writing, review staff feedback, or check whether an article has been approved."}
          </p>
          <div className="mt-7 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-950">
            <p className="font-extrabold">How student publishing works</p>
            <p className="mt-2">
              Your drafts stay private. Submitting an article sends it to school staff for review; it does not
              make the article public immediately.
            </p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_22px_70px_rgba(30,31,92,.12)] sm:p-9"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#eef0fb] text-[#2e3192]">
              {register ? (
                <UserPlus size={21} aria-hidden="true" />
              ) : (
                <LockKeyhole size={21} aria-hidden="true" />
              )}
            </span>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#12123a]">
                {register ? "Register" : "Student login"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {register ? "Use an email address you can access." : "Use your student publishing account."}
              </p>
            </div>
          </div>

          {error && (
            <div
              ref={alertRef}
              role="alert"
              tabIndex={-1}
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800 outline-none focus:ring-4 focus:ring-red-100"
            >
              {error}
            </div>
          )}

          {!register && registrationComplete && !error && (
            <div
              role="status"
              className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800"
            >
              Your account is ready. Sign in with the email address and password you registered.
            </div>
          )}

          <div className="mt-6 space-y-5">
            {register && (
              <label className="block text-sm font-bold text-slate-700">
                Your name <span className="text-red-600">*</span>
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  className={fieldClass}
                />
              </label>
            )}
            <label className="block text-sm font-bold text-slate-700">
              Email address <span className="text-red-600">*</span>
              <input
                name="email"
                required
                type="email"
                maxLength={160}
                autoComplete="email"
                inputMode="email"
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Password <span className="text-red-600">*</span>
              <span className="relative mt-2 block">
                <input
                  name="password"
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={register ? 10 : 1}
                  maxLength={128}
                  autoComplete={register ? "new-password" : "current-password"}
                  aria-describedby={register ? "student-password-help" : undefined}
                  className={`${fieldClass} mt-0 pr-13`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 grid min-h-11 min-w-11 place-items-center rounded-r-xl text-slate-500 hover:text-[#2e3192]"
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </span>
              {register && (
                <span
                  id="student-password-help"
                  className="mt-2 block text-xs leading-5 font-medium text-slate-500"
                >
                  Use at least 10 characters. Avoid reusing a password from another account.
                </span>
              )}
            </label>
            {register && (
              <label className="block text-sm font-bold text-slate-700">
                Confirm password <span className="text-red-600">*</span>
                <input
                  name="passwordConfirmation"
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  className={fieldClass}
                />
              </label>
            )}
          </div>

          {register && (
            <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-slate-600">
              <input type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-[#2e3192]" />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="font-bold text-[#2e3192] underline">
                  terms of use
                </Link>{" "}
                and acknowledge the{" "}
                <Link href="/privacy" className="font-bold text-[#2e3192] underline">
                  privacy notice
                </Link>
                . <span className="text-red-600">*</span>
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2e3192] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#262873] focus:ring-4 focus:ring-sky-200 focus:outline-none disabled:cursor-wait disabled:opacity-60"
          >
            {submitting && <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />}
            {submitting
              ? register
                ? "Creating account…"
                : "Signing in…"
              : register
                ? "Create account"
                : "Sign in"}
          </button>

          {!register && (
            <p className="mt-5 text-center text-sm leading-6 text-slate-600">
              Cannot access your account?{" "}
              <Link href="/contact" className="font-bold text-[#2e3192] underline">
                Contact the school
              </Link>
              .
            </p>
          )}

          <p className="mt-6 text-center text-sm leading-6 text-slate-600">
            {register ? "Already have an account?" : "New to student publishing?"}{" "}
            <Link
              href={register ? "/student/login" : "/student/register"}
              className="font-extrabold text-[#2e3192] underline hover:text-[#12123a]"
            >
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}
