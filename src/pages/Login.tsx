import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bookmark, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wallpaper } from "@/components/Wallpaper";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";

const inputCls =
  "h-11 w-full rounded-xl border border-white/20 bg-white/10 px-3.5 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-white/50 focus:bg-white/15";

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
    : "登录失败，请稍后重试";
}

export default function Login() {
  const navigate = useNavigate();
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
    if (!authLoading && isAuthenticated) navigate("/", { replace: true });
  }, [authLoading, isAuthenticated, navigate]);

  const onSuccess = async () => {
    await utils.auth.me.invalidate();
    navigate("/", { replace: true });
  };
  const loginMut = trpc.emailAuth.login.useMutation({ onSuccess });
  const registerMut = trpc.emailAuth.register.useMutation({ onSuccess });

  const pending = loginMut.isPending || registerMut.isPending;
  const mutationError = loginMut.error ?? registerMut.error;
  const serverError = mutationError
    ? getAuthErrorMessage(mutationError.message)
    : "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    loginMut.reset();
    registerMut.reset();
    if (mode === "register") {
      if (password !== confirm) {
        setLocalError("两次输入的密码不一致");
        return;
      }
      registerMut.mutate({ email, password, name: name || undefined });
    } else {
      loginMut.mutate({ email, password });
    }
  };

  return (
    <div className="min-h-screen select-none font-sans">
      <Wallpaper id="dusk-ridge" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="fade-in w-full max-w-sm rounded-3xl border border-white/15 bg-black/30 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white">
              <Bookmark size={26} />
            </div>
            <h1 className="text-xl font-semibold text-white">书签桌面</h1>
            <p className="text-sm text-white/55">
              {mode === "login" ? "登录后同步你的书签桌面" : "注册账号，书签保存在云端"}
            </p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
            {mode === "register" && (
              <input
                type="text"
                autoComplete="nickname"
                placeholder="昵称（可选）"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
              />
            )}
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={mode === "register" ? 8 : 1}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder={mode === "register" ? "密码（至少 8 位）" : "密码"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/80"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {mode === "register" && (
              <input
                type={showPw ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="确认密码"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={inputCls}
              />
            )}

            {(localError || serverError) && (
              <p className="rounded-lg bg-red-500/15 px-3 py-2 text-[13px] text-red-200">
                {localError || serverError}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={pending}
              className="mt-1 h-11 w-full rounded-xl bg-white text-slate-900 hover:bg-white/90"
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? "登录" : "注册并登录"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "login" ? "register" : "login"));
              setLocalError("");
              loginMut.reset();
              registerMut.reset();
            }}
            className="mt-4 w-full text-center text-[13px] text-white/60 hover:text-white/90"
          >
            {mode === "login" ? "没有账号？注册一个" : "已有账号？直接登录"}
          </button>
        </div>
      </div>
    </div>
  );
}
