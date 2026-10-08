<div align="center">

# 📁 tabby-better-sidebar-plus

**Tabby 增强连接侧边栏**——提供配置收藏、连接状态、拖放整理，以及内置于侧边栏空间中的 SFTP 文件浏览器。

[English](README.md) · [Français](README.fr.md) · **简体中文**

[![许可证：MIT](https://img.shields.io/github/license/wzwwzb/tabby-better-sidebar-plus?color=0d9488)](LICENSE)

</div>

---

## Fork 来源与新增功能

本仓库是 [TooMuhtsh/tabby-better-sidebar](https://github.com/TooMuhtsh/tabby-better-sidebar) 的独立 fork。侧边栏基础功能和原有特性来自上游项目；本 fork 保留这些功能，并新增：

- **Linux 系统信息页**：查看 SSH 会话对应 Linux 主机的运行时间、负载、CPU、内存、交换空间、进程、网络流量和文件系统。
- **SFTP 终端目录跟踪**：可选择跟随终端报告的当前工作目录，开关状态会在重启后保留；手动选择路径会暂停跟踪。
- **隐藏 SFTP 工具栏按钮**：可隐藏 Tabby 原生 SFTP 按钮，以及已安装 SFTP+ 插件时它注入的替代按钮。

本 fork 保留上游 MIT 许可证和第三方 notices，由 `wzwwzb` 独立维护，并非上游官方版本。

**兼容性提示：不建议与原版 `tabby-better-sidebar` 同时启用。** 两者会提供重复的侧边栏和 SFTP 工具栏入口。

## 🧩 Better Tabby 兼容性

本 fork 保留与上游 [tabby-better-vault](https://github.com/TooMuhtsh/tabby-better-vault) 共享 **Better Tabby** 设置页的集成接口。两者仍是独立插件，没有相互依赖或共享代码：

| 插件 | 功能 |
|---|---|
| 📁 **tabby-better-sidebar-plus**（本 fork） | 连接侧边栏、工作区、SFTP 浏览器及本 fork 的扩展功能 |
| 🔐 [**tabby-better-vault**](https://github.com/TooMuhtsh/tabby-better-vault) | 通过操作系统密钥链自动解锁密码库 |

同时安装时，它们会选出一个插件承载共享设置页，各自在其中显示自己的设置。单独安装时，各自保留独立设置页。集成仅依赖字符串接口 `BetterPanelContribution:<id>`。

## ✨ 配置侧边栏

- **固定收藏**：可固定配置和文件夹
- **实时连接状态**：每个配置显示状态，可选延迟指示；通过该 SSH 会话的 SFTP 往返测量，不是 ICMP ping
- **活跃会话**：顶部显示已打开的 SSH 会话，每个窗格一行，显示连接时长，并可点击切换焦点或打开该会话的 SFTP
- **系统信息**：跟随当前聚焦的 SSH 会话，显示 Linux CPU、内存、交换空间、进程、网络速率和本地文件系统
- **最近使用的配置**：列出最近启动的五个配置，不限类型，默认关闭
- **拖放整理**：调整配置和文件夹顺序，也可移动配置或更改文件夹层级
- **工作区**：按工作区隐藏配置和文件夹；各工作区有独立收藏、排序、图标和可选颜色，并支持标签或下拉选择以及 JSON 导入导出
- **多选操作**：一次处理多个配置
- **SSH 端口转发**：显示 Tabby 当前的转发状态、配置上的隧道标记，并可添加、编辑或删除隧道；会记住会话断开后未能恢复的隧道
- **快速筛选**：搜索名称、描述、主机和用户名，包括当前工作区隐藏的项目
- **右键菜单**：分为“管理”和“更多”子菜单以保持简洁；可创建、删除、重命名配置和文件夹，复制配置、选择图标、添加命令片段和备注、分享文件夹或在当前工作区隐藏项目

## 🎨 图标

图标选择器离线搜索三种来源，不发起网络请求：

- **Font Awesome**：Tabby 使用的图标集
- **[Iconify](https://iconify.design)**：Material Design Icons 和 Tabler
- **[dashboard-icons](https://github.com/homarr-labs/dashboard-icons)**：约 2,400 个自托管服务标志，例如 Proxmox、Pi-hole 和 Nextcloud；为实际服务器或服务命名时，这些标志比通用图形更容易辨认。提供多种配色的图标会在图标卡片上显示颜色圆点，方便在深色主题下切换到浅色版本

最近使用的图标会保留在列表中；可右键固定图标，也可导入经 [DOMPurify](https://github.com/cure53/DOMPurify) 清理的自定义 SVG。两个大型图标集仅在首次搜索时通过独立代码包加载，不增加启动开销。

## 📂 SFTP 文件浏览

SFTP 浏览器在侧边栏中替换配置树，并跟随当前聚焦的 SSH 标签页；每个标签页会记住自己的远程目录，也可以将视图固定到某个会话。

可选工具栏按钮会跟随终端报告的当前工作目录。刷新按钮旁的准星按钮可开启或关闭跟踪；关闭后可自由浏览。手动选择面包屑路径会暂停跟踪，让所选目录保持打开。右键路径可复制完整远程路径。远程 shell 必须向 Tabby 报告当前目录。

- 可配置列：大小、日期、八进制和长格式权限、类型、扩展名；支持文件夹优先、隐藏文件和斑马纹
- 支持文件和文件夹多选、分块加载大型目录、创建、重命名、删除和移动
- 双击文件会用代码编辑器打开，而不是调用操作系统关联程序；因此双击可执行文件会编辑而不是运行。保存前会检查远程文件是否变化，并恢复权限；符号链接会解析到目标文件，编辑目标而不是链接
- “打开方式……”仅在右键菜单中提供
- 可创建、重命名和删除条目；支持 Delete 键删除，并可在设置里选择 HTML 确认框按 Enter 时默认触发的按钮
- 将条目拖到文件夹可在服务器端直接重命名移动，不经过本地
- 可将文件拖出到操作系统；松开鼠标时开始下载
- 侧栏底部有传输管理器，显示进度、速度、预计剩余时间和已用时间，并提供到达检查与取消确认；两种侧栏视图都可查看，无传输时自动隐藏
- 可选自动刷新，默认关闭；没有打开的 SFTP 会话后可自动返回配置视图

## 🖥️ Linux 系统信息

系统信息页跟随当前聚焦的 SSH 会话，显示 Linux 运行时间和负载、CPU 与内存使用率、交换空间、占用较高的进程、各网络接口的短时流量历史以及已挂载的本地文件系统。每两秒通过单独的只读 SSH 命令通道刷新，不安装远程代理，也不向交互式终端写入内容。需要 Linux `/proc`、`ps` 和 `df`。

## 📝 命令片段、备注与分享

- **命令片段**：编写一次后可关联配置、文件夹或全部项目；支持必填 `{{name}}` 和带默认值的 `{{name=default}}`，沿文件夹层级继承，可选择仅输入命令、输入并按 Enter，或先启动会话
- **备注**：为配置或文件夹添加自由文本，并在树中显示标记
- **分享文件夹**：通过剪贴板以 JSON 分享，可选择包含连接信息供自己使用，或不含凭据供他人使用。密码、登录脚本、代理命令和密码库引用在两种模式下都不会分享；提示会列出已移除的内容，粘贴时还会逐字段重新验证 JSON

## 🌍 界面语言

界面语言跟随 Tabby：英文、法文、西班牙文、德文和简体中文覆盖配置树、右键菜单、活跃会话、隧道、SFTP 浏览器、对话框、传输面板和设置页。其他语言回退为英文。

## 其他功能

- <kbd>Ctrl</kbd>+<kbd>Enter</kbd> 在终端中插入换行，而不是提交命令
- 在 Tabby 设置中提供独立设置页；同时安装密码库插件时可共享 **Better Tabby** 设置页

## 📦 安装

需要 Tabby 1.0.231 或更新版本。本插件在 Tabby 1.0.235 上开发和测试。

在 Tabby 中打开 **设置 → 插件**，搜索 `better-sidebar-plus` 并安装，然后完全退出并重新打开 Tabby。

也可以在 Tabby 插件目录中直接使用 npm 安装：

```bash
# Windows: %APPDATA%\tabby\plugins
# macOS/Linux: ~/.config/tabby/plugins
npm install tabby-better-sidebar-plus
```

安装后完全退出并重新打开 Tabby。

## ⚙️ 配置

设置位于 **设置 → Better Sidebar**；同时安装 `tabby-better-vault` 时，也可从 **Better Tabby → 📁 Sidebar** 打开。配置保存在 Tabby 自身 `config.yaml` 的 `sidebarPlus` 下。

<details>
<summary>完整设置及默认值</summary>

**功能区块**可以单独开启或关闭：

| 设置 | 默认值 | 说明 |
|---|---:|---|
| `enabled` | `true` | 显示侧边栏；关闭后侧边栏隐藏，但设置页仍可访问 |
| `showActiveSessions` | `true` | 在侧边栏顶部显示已打开的 SSH 会话 |
| `showRecentProfiles` | `false` | 显示最近启动的五个配置 |
| `showTunnels` | `true` | 显示端口转发面板和配置上的隧道标记 |
| `showWorkspaces` | `true` | 显示工作区栏 |
| `showFilter` | `true` | 显示搜索框和快捷键 |
| `showSftp` | `true` | 显示侧边栏 SFTP 页及面板 |
| `showSystemInfo` | `true` | 显示 Linux 系统信息页 |
| `showTransfers` | `true` | 在侧边栏底部显示传输管理器 |
| `showSnippets` | `true` | 显示命令片段右键入口和专用设置页 |
| `showNotes` | `true` | 显示备注右键入口和标记 |

关闭区块也会停止其后台工作，例如标签扫描、延迟探测和传输跟踪。

**行为设置：**

| 设置 | 默认值 | 说明 |
|---|---:|---|
| `hideNativeTransfersMenu` | `true` | 隐藏 Tabby 自带的传输菜单；侧栏传输面板已显示相同任务 |
| `hideNativeSftpButton` | `false` | 隐藏 SSH 工具栏中的 Tabby 原生及 SFTP+ SFTP 按钮 |
| `workspaceSelectorMode` | `tabs` | 工作区以标签或下拉列表显示 |
| `pingIntervalSeconds` | `0` | 延迟探测间隔；`0` 表示关闭 |
| `sftpAutoRefreshSeconds` | `0` | SFTP 目录自动刷新间隔；`0` 表示关闭 |
| `sftpAutoReturnToProfiles` | `true` | 所有 SSH 会话关闭后返回配置视图 |
| `sftpFollowTerminalDirectory` | `true` | 是否跟随终端目录；用户切换后的状态会被记住 |
| `sftpEditorPath` | 空 | 双击文件时使用的编辑器；为空时由 Windows 决定 |
| `sftpDeleteDefaultButton` | `cancel` | 删除确认框中按 Enter 时默认触发的按钮；默认采用安全的取消选项 |
| `sftpDragOutFolders` | `false` | 是否允许将文件夹拖到操作系统；文件始终可拖出 |
| `sftpColumns` | `size`, `date`, `mode` | SFTP 列表中显示的可选列 |
| `sftpFoldersFirst` | `true` | 文件夹优先排序 |
| `sftpShowHidden` | `true` | 显示以点开头的隐藏文件 |
| `sftpColumnBorders` | `true` | 显示列分隔线 |
| `sftpZebra` | `true` | 使用交替行背景 |

收藏、工作区、命令片段、备注、自定义图标和排序也保存在 `sidebarPlus` 下；它们是数据，不会因关闭某个功能区块而删除。

</details>

## ⚠️ 已知限制

- **远程编辑没有文件锁。** 插件上传前会检查远程文件是否变化；如果检测到变化会拒绝覆盖。但两个人同时编辑同一文件时，仍可能发生后写入者覆盖先写入者的情况。
- **拖到不支持延迟文件传输的目标时可能没有反应。** 例如 Windows Terminal 或 MobaXterm；源应用无法检测目标是否支持。
- **通过剪贴板分享的配置会保留主机和端口。** 这是为了让配置可用，但 JSON 会包含你的网络信息；需要时请使用“不含凭据的复制”。
- **本地 Shell 配置不会被分享**，因为其选项是要执行的命令，不应通过剪贴板传递。

## 🛠️ 开发

```bash
git clone https://github.com/wzwwzb/tabby-better-sidebar-plus.git
cd tabby-better-sidebar-plus
npm install --ignore-scripts
npm run watch
```

本地开发时，先关闭 Tabby，再将项目链接到插件目录。Windows 可使用目录联接；不要使用在 Windows 上不可用的 `TABBY_PLUGINS` 环境变量：

```powershell
New-Item -ItemType Junction -Path "$env:APPDATA\tabby\plugins\node_modules\tabby-better-sidebar-plus" -Target "<项目目录>"
```

每次重新构建后都要完全重启 Tabby；只刷新窗口不会重新加载插件，因为插件加载器状态属于整个进程。

## 相关项目

[**tabby-better-vault**](https://github.com/TooMuhtsh/tabby-better-vault) 是上游的配套插件，详见上方 **Better Tabby 兼容性**。

[**上游 AI 治理文档**](https://toomuhtsh.github.io/tabby-better-sidebar/.AIRules/README.html) 包含原项目的开发章程、不变量、开发日志、路线图和交付记录。

## 致谢

- [TooMuhtsh/tabby-better-sidebar](https://github.com/TooMuhtsh/tabby-better-sidebar)：本 fork 的上游项目；其 MIT 版权和许可声明已保留
- [Eugeny 的 Tabby](https://github.com/Eugeny/tabby)：本插件扩展的终端应用，其原生配置侧边栏是本项目的起点（MIT，见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)）
- [dashboard-icons](https://github.com/homarr-labs/dashboard-icons)：服务图标集（Apache-2.0）
- [Iconify](https://iconify.design) Material Design Icons 和 Tabler，以及 [DOMPurify](https://github.com/cure53/DOMPurify)

## 许可证

MIT，详见 [LICENSE](LICENSE)。
