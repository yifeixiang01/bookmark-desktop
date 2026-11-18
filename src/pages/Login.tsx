import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  AtSign,
  Bookmark,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Wallpaper } from "@/components/Wallpaper";

const authErrorMessages = new Set([
  "邮箱或密码不正确",
  "该邮箱已注册，请直接登录",
  "邮箱格式不正确",
  "密码至少 8 位",
  "密码最长 72 位",
]);

function getAuthErrorMessage(message?: string) {
  return message && authErrorMessages.has(message)
    ? message
    : "暂时无法完成请求，请检查网络后重试";
}

export default function Login() {
  const navigate = useNavigate();
  const requestedReturn = new URLSearchParams(window.location.search).get("returnTo");
  const returnTo = requestedReturn?.startsWith("/extension/authorize?") ? requestedReturn : "/";
  const utils = trpc.useUtils();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate(returnTo, { replace: true });
  }, [authLoading, isAuthenticated, navigate, returnTo]);

  const onSuccess = async () => {
    await utils.auth.me.invalidate();
    navigate(returnTo, { replace: true });
  };
  const loginMut = trpc.emailAuth.login.useMutation({ onSuccess });
  const registerMut = trpc.emailAuth.register.useMutation({ onSuccess });
  const pending = loginMut.isPending || registerMut.isPending;
  const mutationError = loginMut.error ?? registerMut.error;
  const serverError = mutationError ? getAuthErrorMessage(mutationError.message) : "";

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordScore = useMemo(() => {
    if (!password) return 0;
    return [
      password.length >= 8,
      /[a-z]/.test(password) && /[A-Z]/.test(password),
      /\d/.test(password),
      /[^a-zA-Z0-9]/.test(password),
    ].filter(Boolean).length;
  }, [password]);
  const passwordLabel = ["", "较弱", "一般", "不错", "很强"][passwordScore];
  const passwordsMatch = confirm.length > 0 && password === confirm;

  const switchMode = (next: "login" | "register") => {
    if (next === mode || pending) return;
    setMode(next);
    setLocalError("");
    setConfirm("");
    loginMut.reset();
    registerMut.reset();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");
    loginMut.reset();
    registerMut.reset();
    if (mode === "register") {
      if (password !== confirm) {
        setLocalError("两次输入的密码不一致");
        return;
      }
      registerMut.mutate({ email, password, name: name.trim() || undefined });
    } else {
      loginMut.mutate({ email, password });
    }
  };

  return (
    <main className="login-page min-h-dvh px-4 py-6 sm:px-8 sm:py-10">
      <Wallpaper id="sea-mist" />
      <div className="login-layout relative z-10 mx-auto grid min-h-[min(760px,calc(100dvh-3rem))] w-full max-w-5xl overflow-hidden rounded-lg border border-white/65 bg-white/65 shadow-[0_28px_90px_rgba(29,48,49,0.18)] backdrop-blur-2xl">
        <section className="login-brand relative flex flex-col justify-between overflow-hidden p-7 text-white sm:p-10 lg:p-12">
          <div className="login-brand-lines" aria-hidden="true" />
          <div className="relative z-10 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md border border-white/20 bg-white/10">
              <Bookmark size={20} strokeWidth={1.8} />
            </span>
            <span className="text-sm font-medium tracking-wide">书签桌面</span>
          </div>

          <div className="relative z-10 my-10 max-w-md lg:my-0">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/80">
              <Sparkles size={13} />
              <span>让收藏井然有序</span>
            </div>
            <h1 className="max-w-sm text-4xl font-semibold leading-[1.12] sm:text-5xl">
              好内容，<br />
              值得随手可达。
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/75">
              登录后继续整理你的网络收藏，在不同设备间保持熟悉的节奏。
            </p>
          </div>

          <div className="relative z-10 hidden items-center gap-2 text-xs text-white/65 sm:flex">
            <ShieldCheck size={15} />
            <span>你的书签，只属于你的空间</span>
          </div>
        </section>

        <section className="login-form-panel flex flex-col justify-center px-6 py-8 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase text-emerald-700">欢迎回来</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {mode === "login" ? "登录你的空间" : "创建一个新空间"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {mode === "login" ? "输入账号信息，继续你的整理。" : "几秒钟后，你的收藏就有了新家。"}
              </p>
            </div>

            <div className="login-segment mb-6 grid grid-cols-2 rounded-md bg-slate-100 p-1" role="tablist" aria-label="账号操作">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                onClick={() => switchMode("login")}
                className={`h-10 rounded transition-colors ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                登录
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                onClick={() => switchMode("register")}
                className={`h-10 rounded transition-colors ${mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                注册
              </button>
            </div>

            <form key={mode} onSubmit={submit} className="login-form flex flex-col gap-4">
              {mode === "register" && (
                <label className="login-field">
                  <span className="login-field-icon"><UserRound size={17} /></span>
                  <span className="login-field-body">
                    <span className="login-field-label">昵称 <span className="font-normal text-slate-400">· 可选</span></span>
                    <input
                      type="text"
                      autoComplete="nickname"
                      placeholder="你希望如何称呼"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </span>
                </label>
              )}

              <label className={`login-field ${email && emailValid ? "is-valid" : ""}`}>
                <span className="login-field-icon"><AtSign size={17} /></span>
                <span className="login-field-body">
                  <span className="login-field-label">邮箱</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </span>
                {email && emailValid && <Check className="login-valid-check" size={17} />}
              </label>

              <div className="flex flex-col gap-2">
                <label className="login-field">
                  <span className="login-field-icon"><LockKeyhole size={17} /></span>
                  <span className="login-field-body">
                    <span className="login-field-label">密码</span>
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      minLength={mode === "register" ? 8 : 1}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      placeholder={mode === "register" ? "至少 8 位" : "输入你的密码"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </span>
                  <button
                    type="button"
                    aria-label={showPw ? "隐藏密码" : "显示密码"}
                    aria-pressed={showPw}
                    onClick={() => setShowPw((value) => !value)}
                    className="login-icon-button"
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </label>

                {mode === "register" && password && (
                  <div className="login-strength" aria-live="polite">
                    <div className="flex gap-1" aria-hidden="true">
                      {[0, 1, 2, 3].map((segment) => (
                        <span key={segment} className={segment < passwordScore ? `strength-${passwordScore}` : ""} />
                      ))}
                    </div>
                    <span>{passwordLabel}</span>
                  </div>
                )}
              </div>

              {mode === "register" && (
                <label className={`login-field ${passwordsMatch ? "is-valid" : ""} ${confirm && !passwordsMatch ? "is-invalid" : ""}`}>
                  <span className="login-field-icon"><LockKeyhole size={17} /></span>
                  <span className="login-field-body">
                    <span className="login-field-label">确认密码</span>
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      placeholder="再次输入密码"
                      value={confirm}
                      onChange={(event) => setConfirm(event.target.value)}
                    />
                  </span>
                  {confirm && (passwordsMatch ? <Check className="login-valid-check" size={17} /> : <X className="login-invalid-check" size={17} />)}
                </label>
              )}

              {(localError || serverError) && (
                <p role="alert" className="login-error">
                  <X size={16} />
                  <span>{localError || serverError}</span>
                </p>
              )}

              <button type="submit" disabled={pending} className="login-submit mt-1">
                <span>{pending ? "正在验证" : mode === "login" ? "登录" : "创建账号"}</span>
                {pending ? <Loader2 className="animate-spin" size={17} /> : <ArrowRight size={17} />}
              </button>
            </form>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
              <ShieldCheck size={14} />
              登录信息通过加密连接传输
            </p>
          </div>
        </section>
      </div>
      <p className="relative z-10 mt-5 text-center text-xs text-slate-600/70">BOOKMARK DESKTOP <span className="mx-1">·</span> YOUR PERSONAL WEB SPACE</p>
    </main>
  );
}
