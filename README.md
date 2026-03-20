# 有趣训练场

一个轻量网页原型，目标不是替你“生成很会说的话”，而是把这些动作练成习惯：

- 观察一个细节
- 给它换视角
- 把直白表达扩成更有画面感的说法
- 把你真心想学的句子收藏起来

## 现在已经有的内容

- 一个可直接运行的本地网页原型
- 三个核心模块：`描写扩展器`、`联想短路器`、`视角转换器`
- 一个本地收藏夹，方便复盘
- 一个可选的模型增强接口，兼容 OpenAI 风格的 `chat/completions`
- 两份资料文档：
  - [`docs/daily-practice.md`](./docs/daily-practice.md)
  - [`docs/materials/curated-resources.md`](./docs/materials/curated-resources.md)
  - [`docs/materials/micro-patterns.md`](./docs/materials/micro-patterns.md)
  - [`docs/materials/first-principles.md`](./docs/materials/first-principles.md)
  - [`docs/materials/association-bank.md`](./docs/materials/association-bank.md)
  - [`docs/evaluation/iteration-notes.md`](./docs/evaluation/iteration-notes.md)
  - [`docs/android-usage.md`](./docs/android-usage.md)
  - [`docs/deploy-public.md`](./docs/deploy-public.md)
  - [`docs/manual-steps.md`](./docs/manual-steps.md)

## 如何运行

1. 在当前目录打开终端
2. 运行：

```powershell
node server.mjs
```

3. 浏览器打开 `http://localhost:4173`

## 使用方式

### 本地启发模式

默认就能用，不需要 API Key。

适合先开始练：

- 把一句直白的话丢进“描写扩展器”
- 做一组“联想短路器”
- 用“视角转换器”改写今天的一件小事
- 把你喜欢的表达收藏起来

### 模型增强模式

如果你想得到更丰富的结果，可以在页面顶部填入：

- `Base URL`
- `Model`
- `API Key`

保存后，页面会通过本地的 `server.mjs` 把请求转发给模型接口。

## 目录结构

```text
有趣/
├─ app/
│  ├─ app.js
│  ├─ index.html
│  └─ styles.css
├─ docs/
│  ├─ daily-practice.md
│  └─ materials/
│     └─ curated-resources.md
├─ package.json
├─ README.md
└─ server.mjs
```

## 下一步可以继续做

- 加入“每日 10 分钟任务卡”
- 给收藏内容自动打标签，比如“形容疲惫 / 形容天气 / 形容人群”
- 增加“今日三瞬间”记录页
- 做浏览器插件版本，在写消息时随时调用

## 自测与迭代

如果你想继续压测模型输出，可以先启动本地服务，再运行：

```powershell
$env:DEEPSEEK_API_KEY='你的 key'
npm run evaluate
```

结果会写到 `docs/evaluation/` 目录里。

## 公网发布模式

这个项目当前最推荐的公网发布方式是：

- 网页公开可访问
- 每个人自己填自己的 API Key
- 不把任何人的 Key 写进仓库

对应说明见：

- [`docs/deploy-public.md`](./docs/deploy-public.md)
