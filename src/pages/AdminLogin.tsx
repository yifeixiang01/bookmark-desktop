import { useState } from "react";
import { Link, Navigate } from "react-router";
import {
  Bookmark,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  LockKeyhole,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import "./admin-login.css";

export default function AdminLogin() {
  const auth = useAuth({ redirectPath: "/admin/login" });
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const login = trpc.emailAuth.login.useMutation({
    onSuccess: async () => {
      setPassword("");
      await utils.auth.me.invalidate();
    },
    onError: failure => {
      setError(
        failure.data?.code === "UNAUTHORIZED"
          ? "邮箱或密码不正确"
          : failure.data?.code === "FORBIDDEN"
            ? "账号已禁用，请联系管理员"
            : "登录失败，请检查网络后重试"
      );
    },
  });
  if (auth.user?.role === "admin")
    return <Navigate to="/admin/overview" replace />;
  const busy = login.isPending || auth.isLoading;
  return (
    <div className="mgmt-login">
      <header className="mgmt-login-topbar">
        <Link to="/" className="mgmt-login-brand">
          <Bookmark size={23} aria-hidden="true" />
          <span>书签桌面</span>
          <span className="mgmt-login-tag">管理中心</span>
        </Link>
        <Link to="/" className="mgmt-login-back">
          <ArrowLeft size={15} aria-hidden="true" />
          返回桌面
        </Link>
      </header>
      <main className="mgmt-login-main">
        <section className="mgmt-login-card" aria-labelledby="mgmt-login-title">
          <div className="mgmt-login-symbol">
            <ShieldCheck size={27} aria-hidden="true" />
          </div>
          <h1 id="mgmt-login-title">管理员登录</h1>
          <p className="mgmt-login-intro">
            登录管理中心，查看用户与服务运行情况。
          </p>
          {auth.isLoading ? (
            <p className="mgmt-login-status" role="status">
              <Loader2 size={18} aria-hidden="true" />
              正在检查登录状态…
            </p>
          ) : auth.user ? (
            <div className="mgmt-login-denied">
              <p role="alert">当前账号没有管理权限</p>
              <p>
                {auth.user.email || auth.user.name}
                ，请切换至已授权的管理员账号。
              </p>
              <button
                className="mgmt-login-submit"
                disabled={auth.isLoggingOut}
                onClick={() => {
                  setError("");
                  void auth
                    .logout()
                    .catch(() => setError("退出失败，请稍后重试"));
                }}
              >
                {auth.isLoggingOut ? "正在退出…" : "切换账号"}
              </button>
              {error && (
                <p className="mgmt-login-error" role="alert">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <form
              onSubmit={event => {
                event.preventDefault();
                setError("");
                login.mutate({ email, password });
              }}
            >
              <label htmlFor="mgmt-email">管理员邮箱</label>
              <input
                id="mgmt-email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="请输入管理员邮箱"
                value={email}
                onChange={event => setEmail(event.target.value)}
                maxLength={320}
                required
                disabled={busy}
              />
              <label htmlFor="mgmt-password">密码</label>
              <div className="mgmt-login-password">
                <input
                  id="mgmt-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  maxLength={72}
                  required
                  disabled={busy}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {(error || auth.error) && (
                <p className="mgmt-login-error" role="alert">
                  {error || "无法检查登录状态，请重试登录。"}
                </p>
              )}
              <button
                className="mgmt-login-submit"
                type="submit"
                disabled={busy}
              >
                {busy ? (
                  <>
                    <Loader2 size={17} aria-hidden="true" />
                    正在登录…
                  </>
                ) : (
                  "登录管理中心"
                )}
              </button>
            </form>
          )}
          <div className="mgmt-login-access">
            <LockKeyhole size={16} aria-hidden="true" />
            <span>仅限已授权的管理员账号访问</span>
          </div>
        </section>
        <p className="mgmt-login-help">需要访问权限？请联系系统负责人。</p>
      </main>
      <footer className="mgmt-login-footer">书签桌面 · 后台管理系统</footer>
    </div>
  );
}
