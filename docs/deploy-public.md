# 公网部署

如果你不想和手机连同一个 Wi-Fi，最省事的方式是把这个项目部署到公网。

我已经给项目补好了：

- [render.yaml](../render.yaml)
- [.gitignore](../.gitignore)

这意味着现在最短路径就是用 Render 部署。

## 这份方案的核心原则

这不是“把你的 API Key 放在服务器上给所有人共用”的方案。

这是：

- 网页公开可访问
- 每个访问者自己填写自己的 API Key
- Key 保存在各自浏览器本地
- 不写进仓库代码

这也是目前最适合你这套工具的公网方式。

## 推荐路线：Render

### 1. 把项目传到 GitHub

在项目目录执行：

```powershell
git init
git add .
git commit -m "Initial deploy"
```

然后把仓库推到 GitHub。

### 2. 去 Render 创建服务

打开：

- [Render Dashboard](https://dashboard.render.com/)

然后：

1. 选择 `New +`
2. 选择 `Blueprint`
3. 连接你的 GitHub 仓库
4. Render 会自动识别项目里的 `render.yaml`

### 3. 部署完成后拿到公网网址

Render 会给你一个类似这样的地址：

```text
https://interesting-practice-lab.onrender.com
```

以后你手机直接打开这个网址就行，不需要再连同一个 Wi-Fi。

## 公网发布后，实际怎么用

你自己打开这个网址时：

- 在页面里填你自己的 DeepSeek Key
- 浏览器会把它保存在你当前这台设备的本地存储里

别人打开同一个网址时：

- 他们看不到你本地存的 Key
- 他们如果要用模型增强，也得填他们自己的 Key

也就是说：

- 网址是公开的
- 但 Key 不是共享的

## 这条路的优点

- 不用自己配服务器
- 不用手动猜启动命令
- 你的项目现在已经有 `healthCheckPath`
- 前端和 Node 代理可以一起跑

## 你需要注意的一点

目前模型 key 是在页面里手填的。

这意味着：

- 你自己用没问题
- 别人打开时只能看到同样的网页界面
- 他们不会自动继承你的 Key

如果后面你想把它变成真正“只有你能用”的版本，下一步要做的是：

- 加一个简单登录
- 或者把模型 key 放到服务端环境变量，而不是前端本地保存

## 发布前一定要确认

1. 不要把 API Key 写进代码文件
2. 不要把 API Key 提交到 GitHub
3. 公网版本默认就是“每人自己填自己的 Key”
4. 如果你想独占使用，再加密码或登录

## 和 APK 的区别

部署公网后：

- 你手机可以直接打开网址
- 也可以继续“添加到主屏幕”
- 但它仍然是网页 App，不是原生 APK

如果你后面还是想要 APK，那是下一条路线。
