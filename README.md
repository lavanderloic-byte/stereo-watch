# 脑立体空位雷达

GitHub Pages 网页入口： https://lavanderloic-byte.github.io/stereo-watch/

汇总脑立体定位仪的公开预约日历，按设备、日期、每日时段和连续空闲时长筛选。

## 使用

首次使用需要专属链接或访问码。专属链接中的 fragment 在网页初始化时被移除，不发送给 GitHub，也不保存在代码仓库。用户可以自行勾选“在这台设备记住访问码”。请不要公开分享自己的访问链接。

网页代码公开，预约数据、云端规则和设置接口需要专属访问码。接口只接受受支持的操作；错误访问码和不受允许的浏览器来源会被拒绝。实际预约在学校平台完成，本工具不提交预约，也不保存学校登录凭据。

当前微信通道仍需使用者绑定 PushPlus 后配置，不因网页入口迁移而自动开启。

## 结构

- `src/`：React + Vite 静态网页；浏览器只调用经过认证的 Supabase 网关。
- `supabase/functions/stereo-watch-gateway/`：网关源码。运行时从 Supabase Vault 读取受保护配置，使用默认服务端权限调用限定的配置函数。
- `supabase/gateway-config.sql`：配置函数定义，执行权限仅授予 service_role；该函数为 SECURITY INVOKER。
- `.github/workflows/deploy-pages.yml`：测试、构建和部署。

GitHub Pages 不执行后端定时任务。现有云端定时器和数据存储继续运行，不依赖用户电脑开机。每分钟检查最多 4 台，17 台约 5 分钟轮完。

网关使用专属访问码的 SHA-256 进行认证；代码和前端中不包含原始访问码、学校 Cookie、Supabase 管理密钥或私有站点服务令牌。凭据只在运行环境中使用。

## 本地验证

Node.js 22.13 以上，`npm ci`、`npm test`、`npm run build`。`npm run dev` 在回环地址 5174 端口运行。

学校公开日历是空闲参考，实际部件组合、账号资格、维护和预约规则仍以学校平台为准。源数据读取失败或过期时不把旧数据视为当前可用。
