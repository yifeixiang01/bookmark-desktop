import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const options = [
  { id: "light", label: "明亮模式", icon: Sun },
  { id: "dark", label: "暗夜模式", icon: Moon },
  { id: "system", label: "跟随系统", icon: Monitor },
] as const;

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <fieldset className="theme-picker">
      <legend className="mb-2 text-sm font-medium">显示模式</legend>
      <p className="mb-4 text-xs leading-5 text-muted-foreground">
        暗夜里，用柔和的蓝灰与青绿陪你浏览。设置仅保存在当前浏览器。
      </p>
      <div className="grid grid-cols-3 gap-2">
        {options.map(({ id, label, icon: Icon }) => (
          <label key={id} className="theme-choice" data-selected={theme === id}>
            <input
              type="radio"
              name="display-theme"
              value={id}
              checked={theme === id}
              onChange={() => setTheme(id)}
              className="sr-only"
            />
            <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
