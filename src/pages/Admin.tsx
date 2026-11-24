import { useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router";
import {
  Bookmark,
  LayoutDashboard,
  Users,
  KeyRound,
  ScrollText,
  Server,
  Settings,
  LogOut,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import "./admin.css";

const date = (value: Date | null | undefined) =>
  value ? new Date(value).toLocaleString("zh-CN") : "尚未同步";
const bytes = (value: number) =>
  value < 1024
    ? `${value} B`
    : value < 1048576
      ? `${(value / 1024).toFixed(1)} KB`
      : `${(value / 1048576).toFixed(1)} MB`;
const actions: Record<string, string> = {
  disable_user: "禁用账号",
  enable_user: "恢复账号",
  revoke_extension: "撤销扩展授权",
  change_password: "修改管理员密码",
};
const nav = [
  ["overview", "数据概览", LayoutDashboard],
  ["users", "用户管理", Users],
  ["extension-sessions", "扩展授权", KeyRound],
  ["audit-logs", "操作日志", ScrollText],
  ["system", "系统状态", Server],
  ["settings", "账号设置", Settings],
] as const;
function Feedback({
  loading,
  error,
}: {
  loading: boolean;
  error: { message: string } | null;
}) {
  return loading ? (
    <p role="status" className="admin-message">
      正在加载…
    </p>
  ) : error ? (
    <p role="alert" className="admin-error">
      加载失败：{error.message}，请点击刷新重试。
    </p>
  ) : null;
}
function Pager({
  page,
  total,
  setPage,
}: {
  page: number;
  total: number;
  setPage: (n: number) => void;
}) {
  return (
    <footer className="admin-pager">
      <span>
        共 {total} 条 · 第 {page} 页
      </span>
      <div>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          上一页
        </button>
        <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>
          下一页
        </button>
      </div>
    </footer>
  );
}
function Overview() {
  const query = trpc.admin.overview.useQuery();
  return (
    <>
      <Feedback loading={query.isLoading} error={query.error} />
      {query.data && (
        <>
          <div className="admin-metrics">
            {[
              ["用户总数", query.data.users, "全部注册账号"],
              ["近 7 天新增", query.data.newUsers, "按注册时间统计"],
              ["已存储桌面", query.data.synced, "包含注册时的初始桌面"],
              ["书签总量", query.data.bookmarks, "包含文件夹内的书签"],
            ].map(([label, value, note]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{note}</small>
              </article>
            ))}
          </div>
          <section className="admin-panel">
            <h2>数据与账号</h2>
            <dl className="admin-facts">
              <div>
                <dt>有效扩展授权</dt>
                <dd>{query.data.sessions}</dd>
              </div>
              <div>
                <dt>已禁用账号</dt>
                <dd>{query.data.disabled}</dd>
              </div>
              <div>
                <dt>桌面数据总量</dt>
                <dd>{bytes(query.data.bytes)}</dd>
              </div>
              <div>
                <dt>统计更新时间</dt>
                <dd>{date(query.data.checkedAt)}</dd>
              </div>
            </dl>
            <p className="admin-note">
              桌面数量包含初始化数据。最近登录与同步时间可在用户详情中查看。
            </p>
            <Link className="admin-link" to="/admin/users">
              进入用户管理
            </Link>
          </section>
        </>
      )}
    </>
  );
}
function UserDetail({ id, close }: { id: number; close: () => void }) {
  const query = trpc.admin.user.useQuery({ id });
  const utils = trpc.useUtils();
  const mutation = trpc.admin.setDisabled.useMutation({
    onSuccess: () => {
      void utils.admin.invalidate();
    },
  });
  const user = query.data;
  return (
    <section className="admin-panel">
      <button onClick={close}>
        <ArrowLeft size={16} aria-hidden="true" /> 返回列表
      </button>
      <Feedback loading={query.isLoading} error={query.error} />
      {user && (
        <>
          <h2>{user.name || user.email || `用户 #${id}`}</h2>
          <p className="admin-note">
            {user.email} · 用户 #{id}
          </p>
          <dl className="admin-facts">
            {[
              ["账号状态", user.disabled ? "已禁用" : "正常"],
              ["角色", user.role === "admin" ? "管理员" : "用户"],
              ["注册时间", date(user.createdAt)],
              ["最近登录", date(user.lastSignInAt)],
              ["最近同步", date(user.syncedAt)],
              ["同步版本", user.revision],
              ["书签", user.stats.bookmarks],
              ["文件夹", user.stats.folders],
              ["分区", user.stats.partitions],
              ["数据大小", bytes(user.stats.bytes)],
              ["有效扩展授权", user.sessions],
            ].map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {user.role !== "admin" && (
            <div className="admin-danger">
              <h3>账号状态管理</h3>
              <p>禁用后网页会话和扩展授权立即失效。恢复后需要重新登录。</p>
              <button
                disabled={mutation.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `确定${user.disabled ? "恢复" : "禁用"}用户「${user.name || user.email || id}」？`
                    )
                  )
                    mutation.mutate({ id, disabled: !user.disabled });
                }}
              >
                {mutation.isPending
                  ? "正在处理…"
                  : user.disabled
                    ? "恢复账号"
                    : "禁用账号"}
              </button>
              {mutation.error && (
                <p role="alert" className="admin-error">
                  {mutation.error.message}
                </p>
              )}
              {mutation.isSuccess && <p role="status">账号状态已更新</p>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
function UserList() {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "disabled">("all");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const location = useLocation();
  const rawId = location.pathname.split("/")[3];
  const selected = rawId && /^[1-9]\d*$/.test(rawId) ? Number(rawId) : null;
  const query = trpc.admin.users.useQuery({ search, status, page });
  if (selected !== null)
    return <UserDetail id={selected} close={() => navigate("/admin/users")} />;
  return (
    <section className="admin-panel">
      <form
        className="admin-filters"
        onSubmit={event => {
          event.preventDefault();
          setSearch(draft);
          setPage(1);
        }}
      >
        <label>
          搜索用户
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="姓名或邮箱"
            maxLength={100}
          />
        </label>
        <label>
          账号状态
          <select
            value={status}
            onChange={e => {
              setStatus(e.target.value as typeof status);
              setPage(1);
            }}
          >
            <option value="all">全部状态</option>
            <option value="active">正常</option>
            <option value="disabled">已禁用</option>
          </select>
        </label>
        <button type="submit">搜索</button>
      </form>
      <Feedback loading={query.isLoading} error={query.error} />
      {query.data && (
        <>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>用户</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>注册时间</th>
                  <th>最近登录</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {query.data.rows.map(user => (
                  <tr key={user.id}>
                    <td>
                      <b>{user.name || "未命名"}</b>
                      <small>{user.email || `用户 #${user.id}`}</small>
                    </td>
                    <td>{user.role === "admin" ? "管理员" : "用户"}</td>
                    <td>
                      <span
                        className={`admin-badge ${user.disabled ? "disabled" : ""}`}
                      >
                        {user.disabled ? "已禁用" : "正常"}
                      </span>
                    </td>
                    <td>{date(user.createdAt)}</td>
                    <td>{date(user.lastSignInAt)}</td>
                    <td>
                      <button
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.data.rows.length && (
            <p className="admin-message">
              没有符合条件的用户，请调整搜索条件。
            </p>
          )}
          <Pager page={page} total={query.data.total} setPage={setPage} />
        </>
      )}
    </section>
  );
}
function Sessions() {
  const [page, setPage] = useState(1);
  const query = trpc.admin.sessions.useQuery({ page });
  const utils = trpc.useUtils();
  const mutation = trpc.admin.revokeSession.useMutation({
    onSuccess: () => {
      void utils.admin.invalidate();
    },
  });
  return (
    <section className="admin-panel">
      <h2>有效扩展授权</h2>
      <p className="admin-note">撤销后，对应浏览器扩展需要重新授权。</p>
      <Feedback
        loading={query.isLoading}
        error={query.error || mutation.error}
      />
      {mutation.isSuccess && <p role="status">授权已撤销</p>}
      {query.data && (
        <>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>用户</th>
                  <th>邮箱</th>
                  <th>到期时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {query.data.rows.map(row => (
                  <tr key={row.id}>
                    <td>{row.name || `用户 #${row.userId}`}</td>
                    <td>{row.email || "—"}</td>
                    <td>{date(row.expiresAt)}</td>
                    <td>
                      <button
                        disabled={mutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `确定撤销「${row.name || row.email || row.userId}」的这条扩展授权？`
                            )
                          )
                            mutation.mutate({ id: row.id });
                        }}
                      >
                        撤销授权
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.data.rows.length && (
            <p className="admin-message">暂无有效扩展授权。</p>
          )}
          <Pager page={page} total={query.data.total} setPage={setPage} />
        </>
      )}
    </section>
  );
}
function Logs() {
  const [page, setPage] = useState(1);
  const query = trpc.admin.logs.useQuery({ page });
  return (
    <section className="admin-panel">
      <h2>管理操作记录</h2>
      <p className="admin-note">记录已成功提交的账号状态变更、扩展授权撤销与管理员密码修改。</p>
      <Feedback loading={query.isLoading} error={query.error} />
      {query.data && (
        <>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>管理员</th>
                  <th>操作</th>
                  <th>目标用户</th>
                  <th>结果</th>
                </tr>
              </thead>
              <tbody>
                {query.data.rows.map(row => (
                  <tr key={row.id}>
                    <td>{date(row.createdAt)}</td>
                    <td>{row.actorName || `管理员 #${row.actorId}`}</td>
                    <td>{actions[row.action] || row.action}</td>
                    <td>用户 #{row.targetId}</td>
                    <td>成功</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!query.data.rows.length && (
            <p className="admin-message">暂无管理操作记录。</p>
          )}
          <Pager page={page} total={query.data.total} setPage={setPage} />
        </>
      )}
    </section>
  );
}
function SettingsPage() {
  const profile = trpc.admin.profile.useQuery();
  const mutation = trpc.admin.changePassword.useMutation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (newPassword !== confirmPassword) {
      setMessage("两次输入的新密码不一致");
      return;
    }
    mutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setMessage("密码已更新，请使用新密码重新登录");
        },
        onError: error => setMessage(error.message),
      }
    );
  };
  return (
    <div className="admin-settings-grid">
      <section className="admin-panel">
        <h2>管理员账号</h2>
        <Feedback loading={profile.isLoading} error={profile.error} />
        {profile.data && (
          <dl className="admin-facts">
            <div>
              <dt>姓名</dt>
              <dd>{profile.data.name || "未设置"}</dd>
            </div>
            <div>
              <dt>邮箱</dt>
              <dd>{profile.data.email || "未设置"}</dd>
            </div>
            <div>
              <dt>角色</dt>
              <dd>管理员</dd>
            </div>
            <div>
              <dt>注册时间</dt>
              <dd>{date(profile.data.createdAt)}</dd>
            </div>
            <div>
              <dt>最近登录</dt>
              <dd>{date(profile.data.lastSignInAt)}</dd>
            </div>
          </dl>
        )}
      </section>
      <section className="admin-panel">
        <h2>修改密码</h2>
        <p className="admin-note">
          修改后当前会话会失效，需要重新登录。建议使用 12
          位以上且包含大小写、数字和符号的密码。
        </p>
        <form className="admin-password-form" onSubmit={submit}>
          <label>
            当前密码
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
              maxLength={72}
            />
          </label>
          <label>
            新密码
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={8}
              maxLength={72}
            />
          </label>
          <label>
            确认新密码
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              maxLength={72}
            />
          </label>
          {message && (
            <p
              className={
                message === "密码已更新，请使用新密码重新登录"
                  ? "admin-success"
                  : "admin-error"
              }
              role={message.startsWith("密码已") ? "status" : "alert"}
            >
              {message}
            </p>
          )}
          {mutation.isSuccess && <a className="admin-link" href="/admin/login">使用新密码重新登录</a>}
          <button type="submit" disabled={mutation.isPending || mutation.isSuccess}>
            {mutation.isPending ? "正在更新…" : "更新密码"}
          </button>
        </form>
      </section>
    </div>
  );
}
function System() {
  const query = trpc.admin.system.useQuery();
  return (
    <section className="admin-panel">
      <h2>服务运行情况</h2>
      <Feedback loading={query.isLoading} error={query.error} />
      {query.data && (
        <dl className="admin-facts">
          {[
            ["数据库", "连接正常"],
            ["应用版本", query.data.version],
            ["Node.js", query.data.node],
            ["服务运行时长", `${Math.floor(query.data.uptime / 60)} 分钟`],
            ["检查时间", date(query.data.checkedAt)],
          ].map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
export default function Admin() {
  const auth = useAuth({ redirectPath: "/admin/login" });
  const location = useLocation();
  const utils = trpc.useUtils();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const section = location.pathname.split("/")[2] || "overview";
  const current = nav.find(item => item[0] === section);
  if (auth.isLoading)
    return (
      <div className="admin-shell">
        <p role="status" className="admin-message">
          正在验证管理权限…
        </p>
      </div>
    );
  if (auth.error)
    return (
      <div className="admin-shell">
        <p role="alert" className="admin-error">
          无法验证登录状态，请检查网络。
        </p>
        <button onClick={() => void auth.refresh()}>重试</button>
      </div>
    );
  if (!auth.user) return <Navigate to="/admin/login" replace />;
  if (auth.user.role !== "admin")
    return (
      <div className="admin-shell admin-denied">
        <Bookmark size={36} />
        <h1>此账号没有管理权限</h1>
        <p>请使用已授权的管理员账号登录。</p>
        <Link to="/">返回书签桌面</Link>
        <button onClick={() => void auth.logout()}>退出登录</button>
      </div>
    );
  if (
    !current ||
    location.pathname === "/admin" ||
    location.pathname === "/admin/"
  )
    return <Navigate to="/admin/overview" replace />;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/admin/overview" className="admin-brand">
          <Bookmark aria-hidden="true" />
          <span>
            书签桌面<small>管理中心</small>
          </span>
        </Link>
        <nav aria-label="后台导航">
          {nav.map(([path, label, Icon]) => (
            <NavLink key={path} to={`/admin/${path}`}>
              <Icon size={19} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link to="/">返回书签桌面</Link>
          <span>{auth.user.name || auth.user.email}</span>
          <button
            disabled={auth.isLoggingOut}
            onClick={() => void auth.logout()}
          >
            <LogOut size={16} aria-hidden="true" />
            退出登录
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-header">
          <div>
            <p>书签桌面 / 管理中心</p>
            <h1>{current[1]}</h1>
          </div>
          <button
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              setRefreshError("");
              try {
                await utils.admin.invalidate();
              } catch {
                setRefreshError("刷新失败，请稍后重试");
              } finally {
                setRefreshing(false);
              }
            }}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {refreshing ? "正在刷新…" : "刷新数据"}
          </button>
        </header>
        {refreshError && (
          <p role="alert" className="admin-error">
            {refreshError}
          </p>
        )}
        {section === "settings" ? (
          <SettingsPage />
        ) : section === "overview" ? (
          <Overview />
        ) : section === "users" ? (
          <UserList />
        ) : section === "extension-sessions" ? (
          <Sessions />
        ) : section === "audit-logs" ? (
          <Logs />
        ) : (
          <System />
        )}
      </main>
    </div>
  );
}
