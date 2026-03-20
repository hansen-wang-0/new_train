const STORAGE_KEYS = {
  config: "interesting-lab-config",
  favorites: "interesting-lab-favorites",
  history: "interesting-lab-history",
  state: "interesting-lab-state"
};

const describeLexicon = [
  {
    keywords: ["太阳", "阳光", "日头", "晒", "耀眼", "刺眼"],
    vividWords: ["灼亮", "晃眼", "发白", "热烈得近乎蛮横"],
    metaphors: ["像被拧到最亮档的探照灯", "像悬在天上的一枚烧热硬币", "像把街景晒出了一层硬边高光"],
    personifications: ["太阳今天像在强行刷存在感", "它不像照人，更像挨个盘问路人", "太阳像一个不太会克制热情的人"]
  },
  {
    keywords: ["雨", "下雨", "雨天", "潮", "淋"],
    vividWords: ["细密", "绵潮", "湿答答", "像在悄悄返工"],
    metaphors: ["像天花板漏下来的情绪", "像城市忽然被盖了一层灰蓝滤镜", "像有人在高空轻轻撕碎一整卷旧棉絮"],
    personifications: ["雨像在不紧不慢地磨人的脾气", "它不算大，却很会赖着不走", "雨像一个嘴上不吵、手上不停的人"]
  },
  {
    keywords: ["累", "疲惫", "困", "没精神", "下班", "电量"],
    vividWords: ["发虚", "塌下来", "靠惯性续命", "像被掏空"],
    metaphors: ["像脑子里同时开着二十个标签页", "像身体先下班了，人还被留在工位上", "像一台还能亮屏但不太愿意动的旧机器"],
    personifications: ["疲惫今天很敬业，比我更早到岗", "我的精神状态像在悄悄申请离职", "身体没抗议，只是开始用沉默消极怠工"]
  },
  {
    keywords: ["焦虑", "紧张", "慌", "担心", "压力"],
    vividWords: ["发紧", "悬着", "过热", "不停复读"],
    metaphors: ["像后台一直弹窗的系统通知", "像一只看不见的手把神经拧得太紧", "像脑子里一台停不下来的审稿机"],
    personifications: ["焦虑像一个过度负责的实习生", "它最擅长把明天的事提前搬到今天吵", "这份紧张像住在脑子里的临时监工"]
  }
];

const associationWords = [
  "牙刷", "地铁", "窗帘", "云", "台灯", "便利店", "电梯", "耳机",
  "路灯", "外卖", "工牌", "鱼缸", "保温杯", "楼梯", "闹钟", "鞋带",
  "键盘", "雨伞", "毛衣", "月亮", "公交站", "冰箱", "口罩", "自动门"
];

const dom = {
  configForm: document.querySelector("#config-form"),
  enableAi: document.querySelector("#enable-ai"),
  baseUrl: document.querySelector("#base-url"),
  modelName: document.querySelector("#model-name"),
  apiKey: document.querySelector("#api-key"),
  testConfig: document.querySelector("#test-config"),
  clearConfig: document.querySelector("#clear-config"),
  configStatus: document.querySelector("#config-status"),
  installApp: document.querySelector("#install-app"),
  installTip: document.querySelector("#install-tip"),
  describeForm: document.querySelector("#describe-form"),
  describeInput: document.querySelector("#describe-input"),
  describeTone: document.querySelector("#describe-tone"),
  describeOutput: document.querySelector("#describe-output"),
  wordA: document.querySelector("#word-a"),
  wordB: document.querySelector("#word-b"),
  associationInput: document.querySelector("#association-input"),
  associationHint: document.querySelector("#association-hint"),
  associationAnswer: document.querySelector("#association-answer"),
  associationOutput: document.querySelector("#association-output"),
  refreshPair: document.querySelector("#refresh-pair"),
  perspectiveForm: document.querySelector("#perspective-form"),
  perspectiveInput: document.querySelector("#perspective-input"),
  perspectiveOutput: document.querySelector("#perspective-output"),
  favoritesOutput: document.querySelector("#favorites-output"),
  exportFavorites: document.querySelector("#export-favorites"),
  clearFavorites: document.querySelector("#clear-favorites"),
  historyOutput: document.querySelector("#history-output"),
  exportHistory: document.querySelector("#export-history"),
  clearHistory: document.querySelector("#clear-history"),
  resultCardTemplate: document.querySelector("#result-card-template")
};

const currentSourceState = {
  describe: null,
  association: null,
  perspective: null
};

let currentPair = pickAssociationPair();
let deferredInstallPrompt = null;

function readLocalStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getConfig() {
  return readLocalStorage(STORAGE_KEYS.config, {
    enableAi: false,
    baseUrl: "https://api.openai.com/v1",
    model: "",
    apiKey: ""
  });
}

function setConfig(config) {
  writeLocalStorage(STORAGE_KEYS.config, config);
}

function getFavorites() {
  return readLocalStorage(STORAGE_KEYS.favorites, []);
}

function setFavorites(favorites) {
  writeLocalStorage(STORAGE_KEYS.favorites, favorites);
  renderFavorites();
}

function getHistory() {
  return readLocalStorage(STORAGE_KEYS.history, []);
}

function setHistory(history) {
  writeLocalStorage(STORAGE_KEYS.history, history);
  renderHistory();
}

function addHistoryEntry(entry) {
  const history = getHistory();
  const next = [
    {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...entry
    },
    ...history
  ].slice(0, 120);

  setHistory(next);
}

function getAppState() {
  return readLocalStorage(STORAGE_KEYS.state, {
    describe: null,
    association: null,
    perspective: null
  });
}

function setAppState(state) {
  writeLocalStorage(STORAGE_KEYS.state, state);
}

function updateModuleState(moduleKey, patch) {
  const current = getAppState();
  current[moduleKey] = {
    ...(current[moduleKey] || {}),
    ...patch
  };
  setAppState(current);
}

function saveFavorite(entry) {
  setFavorites([
    {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...entry
    },
    ...getFavorites()
  ]);
}

function deleteFavorite(id) {
  setFavorites(getFavorites().filter((item) => item.id !== id));
}

function applyConfigToForm() {
  const config = getConfig();
  dom.enableAi.checked = config.enableAi;
  dom.baseUrl.value = config.baseUrl || "https://api.openai.com/v1";
  dom.modelName.value = config.model || "";
  dom.apiKey.value = config.apiKey || "";
  updateConfigStatus();
}

function updateConfigStatus(message) {
  if (message) {
    dom.configStatus.textContent = message;
    return;
  }

  const config = getConfig();
  const aiReady = config.enableAi && config.baseUrl && config.model && config.apiKey;
  dom.configStatus.textContent = aiReady
    ? `模型增强已开启，当前模型：${config.model}`
    : "当前为本地启发模式。你也可以填入模型设置，得到更发散的表达建议。";
}

function updateInstallUi() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;

  if (isStandalone) {
    dom.installApp.classList.add("hidden-button");
    dom.installTip.textContent = "你现在已经在 App 模式里了，可以像普通安卓应用一样使用。";
    return;
  }

  if (deferredInstallPrompt) {
    dom.installApp.classList.remove("hidden-button");
    dom.installTip.textContent = "检测到可安装，点上面的按钮就能加到安卓主屏。";
    return;
  }

  dom.installApp.classList.add("hidden-button");
  dom.installTip.textContent = "如果没看到安装按钮，可以在安卓 Chrome 菜单里选择“添加到主屏幕”。";
}

function setEmpty(container, text) {
  container.classList.add("empty-state");
  container.innerHTML = `<p>${text}</p>`;
}

function renderCards(container, cards, sourceContext) {
  if (!cards.length) {
    setEmpty(container, "这次没有生成内容，再换一句试试。");
    return;
  }

  container.classList.remove("empty-state");
  container.innerHTML = "";

  cards.forEach((card) => {
    const fragment = dom.resultCardTemplate.content.cloneNode(true);
    fragment.querySelector("h3").textContent = card.title;
    fragment.querySelector("p").textContent = card.text;
    fragment.querySelector(".save-chip").addEventListener("click", () => {
      saveFavorite({
        module: card.module || "训练场",
        title: card.title,
        text: card.text,
        sourceLabel: sourceContext?.label || "",
        sourceText: sourceContext?.text || "",
        sourceKind: sourceContext?.kind || ""
      });
    });
    container.appendChild(fragment);
  });
}

function renderFavorites() {
  const favorites = getFavorites();
  if (!favorites.length) {
    setEmpty(dom.favoritesOutput, "你收藏的句子会出现在这里。");
    return;
  }

  dom.favoritesOutput.classList.remove("empty-state");
  dom.favoritesOutput.innerHTML = "";

  favorites.forEach((favorite) => {
    const card = document.createElement("article");
    card.className = "favorite-card";

    const sourceBlock = favorite.sourceText
      ? `<div class="favorite-source"><strong>${escapeHtml(favorite.sourceLabel || "原始输入")}：</strong>\n${escapeHtml(favorite.sourceText)}</div>`
      : "";

    card.innerHTML = `
      <div class="favorite-card-head">
        <div>
          <h3>${escapeHtml(favorite.title)}</h3>
          <p>${escapeHtml(favorite.text)}</p>
          ${sourceBlock}
        </div>
        <button type="button" data-id="${favorite.id}">删除</button>
      </div>
      <div class="favorites-meta">${escapeHtml(favorite.module)} · ${formatDate(favorite.createdAt)}</div>
    `;

    card.querySelector("button")?.addEventListener("click", () => deleteFavorite(favorite.id));
    dom.favoritesOutput.appendChild(card);
  });
}

function renderHistory() {
  const history = getHistory();
  if (!history.length) {
    setEmpty(dom.historyOutput, "你每次生成的结果会出现在这里。");
    return;
  }

  dom.historyOutput.classList.remove("empty-state");
  dom.historyOutput.innerHTML = "";

  history.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "history-card";

    const sourceBlock = entry.sourceText
      ? `<div class="favorite-source"><strong>${escapeHtml(entry.sourceLabel || "原始输入")}：</strong>\n${escapeHtml(entry.sourceText)}</div>`
      : "";

    const cardsPreview = Array.isArray(entry.cards)
      ? entry.cards
          .map((item) => `【${item.title}】\n${item.text}`)
          .join("\n\n")
      : "";

    card.innerHTML = `
      <div class="history-card-head">
        <div>
          <h3>${escapeHtml(entry.action || entry.module || "历史记录")}</h3>
          <p>${escapeHtml(cardsPreview)}</p>
          ${sourceBlock}
        </div>
        <div class="history-card-head-actions">
          <button type="button" data-restore="${entry.id}">恢复</button>
          <button type="button" data-delete="${entry.id}">删除</button>
        </div>
      </div>
      <div class="history-meta">${escapeHtml(entry.module || "训练场")} · ${formatDate(entry.createdAt)}</div>
    `;

    card.querySelector('[data-restore]')?.addEventListener("click", () => restoreHistoryEntry(entry.id));
    card.querySelector('[data-delete]')?.addEventListener("click", () => deleteHistoryEntry(entry.id));
    dom.historyOutput.appendChild(card);
  });
}

function deleteHistoryEntry(id) {
  setHistory(getHistory().filter((item) => item.id !== id));
}

function formatDate(isoString) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(isoString));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isAiEnabled() {
  const config = getConfig();
  return Boolean(config.enableAi && config.baseUrl && config.model && config.apiKey);
}

function pickAssociationPair() {
  let first = associationWords[Math.floor(Math.random() * associationWords.length)];
  let second = associationWords[Math.floor(Math.random() * associationWords.length)];

  while (second === first) {
    second = associationWords[Math.floor(Math.random() * associationWords.length)];
  }

  return [first, second];
}

function refreshAssociationPair() {
  currentPair = pickAssociationPair();
  dom.wordA.textContent = currentPair[0];
  dom.wordB.textContent = currentPair[1];
  dom.associationInput.value = "";
  currentSourceState.association = null;
  updateModuleState("association", {
    source: buildAssociationSource(currentPair, ""),
    cards: null
  });
  setEmpty(dom.associationOutput, "先自己想，再看提示和参考。重点不是走箭头，而是把它们连成一句话、一个画面，或者一个很短的故事。");
}

function findLexicon(text) {
  const lowerText = text.toLowerCase();
  return describeLexicon.find((item) => item.keywords.some((word) => lowerText.includes(word) || text.includes(word)));
}

function getToneLabel(value) {
  return {
    balanced: "平衡一点",
    visual: "更有画面",
    humor: "更轻一点",
    poetic: "更柔一点",
    chatty: "更口语一点"
  }[value] || "平衡一点";
}

function buildDescribeSource(input, tone) {
  return {
    kind: "describe",
    label: "原句",
    text: `${input}\n风格偏好：${getToneLabel(tone)}`,
    meta: {
      input,
      tone
    }
  };
}

function buildAssociationSource(pair, attempt) {
  return {
    kind: "association",
    label: "原始词组",
    text: attempt?.trim()
      ? `${pair[0]} 和 ${pair[1]}\n我的尝试：${attempt.trim()}`
      : `${pair[0]} 和 ${pair[1]}`,
    meta: {
      pair,
      attempt: attempt?.trim() || ""
    }
  };
}

function buildPerspectiveSource(input) {
  return {
    kind: "perspective",
    label: "原始事件",
    text: input,
    meta: {
      input
    }
  };
}

function buildLocalDescribeCards(input, tone) {
  const base = findLexicon(input) || {
    vividWords: ["更具体", "更贴近身体感受", "更有一点动作", "更有一点场景"],
    metaphors: ["像一件情绪比事实更先到场的小事", "像被生活轻轻推了一下", "像某种不好直接说破的状态"],
    personifications: ["它像有自己的脾气", "这件事像在试探你今天的耐心", "它不算戏剧化，但很会留下余味"]
  };

  const rewritePack = {
    balanced: [
      `${input.replace(/。/g, "")}，但换个说法可以更具体一点：它不是亮，是亮得让人下意识眯眼。`,
      `${input.replace(/。/g, "")}，像把周围的边缘都照得发白。`
    ],
    visual: [
      `${input.replace(/。/g, "")}，${base.metaphors[0]}。`,
      `${input.replace(/。/g, "")}，连空气都像被它晒出了一层反光。`
    ],
    humor: [
      `${input.replace(/。/g, "")}，今天这光线有点像太阳在强行刷存在感。`,
      `${input.replace(/。/g, "")}，亮得让人感觉自己没有隐私。`
    ],
    poetic: [
      `${input.replace(/。/g, "")}，像有一层热意慢慢落在万物表面。`,
      `${input.replace(/。/g, "")}，那种光不是刺出来的，是一点点漫开的。`
    ],
    chatty: [
      `${input.replace(/。/g, "")}，反正就是亮到你根本没法装没看见。`,
      `${input.replace(/。/g, "")}，感觉天上像有人把亮度条直接拉满了。`
    ]
  };

  return [
    { module: "描写扩展器", title: "换一种用词", text: base.vividWords.join(" / ") },
    { module: "描写扩展器", title: "把它说成画面", text: base.metaphors.join("\n") },
    { module: "描写扩展器", title: "如果它会说话", text: base.personifications.join("\n") },
    { module: "描写扩展器", title: "完整改写", text: rewritePack[tone].join("\n\n") }
  ];
}

function buildLocalAssociationHintCards(pair) {
  return [
    {
      module: "联想短路器",
      title: "先找共同场景",
      text: `想一想，${pair[0]} 和 ${pair[1]} 有没有可能在同一段日常里出现？先别抽象，先找现场。`
    },
    {
      module: "联想短路器",
      title: "再找共同动作",
      text: "看它们是不是都和等待、切换、保护、整理、赶路这些动作有关。"
    },
    {
      module: "联想短路器",
      title: "最后找共同情绪",
      text: `如果把 ${pair[0]} 和 ${pair[1]} 当成一种生活状态，它们更像匆忙、敷衍、照顾，还是秩序？`
    }
  ];
}

function buildLocalAssociationAnswerCards(pair) {
  return [
    {
      module: "联想短路器",
      title: "一句话连起来",
      text: `${pair[0]} 和 ${pair[1]} 看着不熟，但都像成年人每天默默完成的那种小配合。`
    },
    {
      module: "联想短路器",
      title: "前后顺序版本",
      text: `先让 ${pair[0]} 发生，再让 ${pair[1]} 接上去。很多联系不靠同框，而靠生活里的前后链条。`
    },
    {
      module: "联想短路器",
      title: "把它写成一个小故事",
      text: `把 ${pair[0]} 和 ${pair[1]} 放进一个真实的小场景里，让它们彼此牵动，而不是只是同时出现。`
    },
    {
      module: "联想短路器",
      title: "把它说成比喻",
      text: `${pair[0]} 和 ${pair[1]} 也许可以被说成“生活里那些负责把人从一个状态送到另一个状态的小装置”。`
    }
  ];
}

function buildLocalPerspectiveCards(input) {
  return [
    { module: "视角转换器", title: "旁观者视角", text: `从旁观者看，${input}像是在暴露一个人最不想承认的小习惯。` },
    { module: "视角转换器", title: "小孩视角", text: `如果是小孩来解释，${input}可能会被理解成“大人又在演一种他们自己也没完全懂的东西”。` },
    { module: "视角转换器", title: "导演视角", text: `如果这是电影镜头，${input}不会只是情节，它更像人物状态偷偷漏出来的一帧。` },
    { module: "视角转换器", title: "轻喜剧视角", text: `往轻一点说，${input}像生活故意安排的一次不算恶意但很会拿捏人的试镜。` },
    { module: "视角转换器", title: "更温柔的视角", text: `再温柔一点看，${input}不一定说明你差，可能只是说明你那一刻真的很需要喘口气。` }
  ];
}

async function callModel(messages, temperature = 0.9) {
  let response;

  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        config: getConfig(),
        temperature,
        messages
      })
    });
  } catch {
    if (window.location.protocol === "file:") {
      throw new Error("你现在很可能是直接打开了 index.html。请先在项目目录运行 `node server.mjs`，再访问 http://localhost:4173。");
    }

    throw new Error("浏览器没有连上本地服务。请确认你是通过 http://localhost:4173 打开的页面，并且 `node server.mjs` 还在运行。");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "模型返回失败");
  }

  return (data.text || "").trim();
}

async function requestAiCard(block) {
  const text = await callModel(
    [
      { role: "system", content: block.system },
      { role: "user", content: block.user }
    ],
    block.temperature ?? 0.9
  );

  return {
    module: "模型增强",
    title: block.title,
    text: sanitizeAiText(text)
  };
}

function sanitizeAiText(text) {
  return String(text)
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*]|[0-9]+[.)]|[一二三四五六七八九十]+[、.])\s*/u, "").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function generateFromBlueprint(blocks, fallbackCards) {
  const results = await Promise.allSettled(blocks.map((block) => requestAiCard(block)));

  return results.map((result, index) => {
    if (result.status === "fulfilled" && result.value.text) {
      return result.value;
    }

    return fallbackCards[index];
  });
}

function getDescribeBlueprint(input, tone) {
  const toneLabel = getToneLabel(tone);

  return [
    {
      title: "换一种用词",
      system: "你是中文表达教练。用户会给你一句很直白的话。请只输出恰好 6 行中文短词组，每行一个。至少 2 个偏体感，2 个偏动作或亮度，2 个偏口语。不要整句，不要编号，不要解释，不要用“光芒万丈、金光四射”这种太旧的词。",
      user: `原句：${input}\n风格偏好：${toneLabel}\n请给我一组可以直接拿来替换或借用的词。`
    },
    {
      title: "把它说成画面",
      system: "你是中文表达教练。请只输出 3 条短表达，每条单独一行。重点是把一句直白的话改成具体画面或新鲜比喻。不要编号，不要解释，不要用陈词滥调，优先生活画面。",
      user: `原句：${input}\n风格偏好：${toneLabel}\n请把它说成画面，像什么，或者像哪个场景。`
    },
    {
      title: "如果它会说话",
      system: "你是中文表达教练。请只输出 3 条短表达，每条单独一行。重点是拟人化，让对象像一个有脾气、有态度的人。语言要自然，不要油腻，不要编号，不要解释。",
      user: `原句：${input}\n风格偏好：${toneLabel}\n请给我 3 条拟人化说法。`
    },
    {
      title: "完整改写",
      system: "你是中文表达教练。请只输出 3 句完整改写，每句单独一行。3 句要明显不同：一句偏克制，一句偏口语，一句偏轻微幽默。目标是自然、可模仿、有画面，不要过分华丽，不要编号。",
      user: `原句：${input}\n风格偏好：${toneLabel}\n请给我 3 句不同方向的完整改写。`
    }
  ];
}

function getAssociationHintBlueprint(pair, attempt) {
  const attemptLine = attempt?.trim() ? `\n用户当前已经想到：${attempt.trim()}` : "";

  return [
    {
      title: "先找共同场景",
      system: "你是联想训练教练。请只输出一句简短提示，帮助用户先从同一场景里找到两个词的联系。不要直接给答案，不要编号。",
      user: `词组：${pair[0]} 和 ${pair[1]}${attemptLine}`
    },
    {
      title: "再找共同动作",
      system: "你是联想训练教练。请只输出一句简短提示，帮助用户从共同动作或功能上建立联系。不要直接给答案，不要编号。",
      user: `词组：${pair[0]} 和 ${pair[1]}${attemptLine}`
    },
    {
      title: "最后找共同情绪",
      system: "你是联想训练教练。请只输出一句简短提示，帮助用户从共同情绪、处境或关系上建立联系。不要直接给答案，不要编号。",
      user: `词组：${pair[0]} 和 ${pair[1]}${attemptLine}`
    }
  ];
}

function getAssociationBlueprint(pair, attempt) {
  const attemptLine = attempt?.trim() ? `\n用户自己的尝试：${attempt.trim()}\n请尽量给出不同于用户原尝试的方向。` : "";

  return [
    {
      title: "一句话连起来",
      system: "你是联想训练教练。请只输出一句自然中文，把两个词连成一句完整的话。可以通过前后顺序、因果、隐喻或生活机制建立关系。重点不是让它们同框，而是点出它们之间真实存在的联系。好例子：闹钟和咖啡，一个把人叫醒，一个把人撑到中午。坏例子：我把闹钟放在咖啡旁边。不要用箭头，不要解释，不要编号，不要写成简单的失物或并列句。",
      user: `词组：${pair[0]} 和 ${pair[1]}${attemptLine}`
    },
    {
      title: "前后顺序版本",
      system: "你是联想训练教练。请只输出 1 到 2 句自然中文，用前后顺序或因果链把两个词连起来。重点是说明一个怎样自然地引出另一个。不要解释，不要编号，不要硬塞在同一时刻。",
      user: `词组：${pair[0]} 和 ${pair[1]}${attemptLine}`
    },
    {
      title: "把它写成一个小故事",
      system: "你是联想训练教练。请只输出 2 到 3 句很短的小故事，让两个词之间真的发生关系，而不是只是出现在同一场景。你可以用前后顺序来连接，比如先发生一个，再引出另一个。好例子：她在洗手池前刷完牙，嘴里那点薄荷味还没散，就一路小跑去赶地铁。坏例子：他在地铁上刷牙。故事必须现实、日常、可信，不要奇幻，不要让物体自己行动，不要安排不卫生或不合常理的动作，不要解释，不要编号。",
      user: `词组：${pair[0]} 和 ${pair[1]}${attemptLine}`
    },
    {
      title: "把它说成比喻",
      system: "你是联想训练教练。请只输出 1 到 2 句比喻式连接。重点是把这两个词映射成同一种角色、装置、关系或命运。不要编号，不要只做表面联想。",
      user: `词组：${pair[0]} 和 ${pair[1]}${attemptLine}`
    }
  ];
}

function getPerspectiveBlueprint(input) {
  return [
    {
      title: "旁观者视角",
      system: "你是视角训练教练。请只输出 1 到 2 句自然中文，用旁观者口吻重写一件小事。要点出人物状态，但不要评判，不要编号，不要解释。",
      user: `这件小事：${input}`
    },
    {
      title: "小孩视角",
      system: "你是视角训练教练。请只输出 1 到 2 句自然中文，用小孩的理解方式重写一件小事。允许带一点天真误解，但要像人说的话，不要编号，不要解释。",
      user: `这件小事：${input}`
    },
    {
      title: "导演视角",
      system: "你是视角训练教练。请只输出 1 到 2 句自然中文，用导演看镜头和人物状态的方式重写一件小事。最好带一点可拍到的细节，不要编号，不要解释。",
      user: `这件小事：${input}`
    },
    {
      title: "轻喜剧视角",
      system: "你是视角训练教练。请只输出 1 到 2 句自然中文，用轻喜剧但不油腻的方式重写一件小事。要轻一点，但不要夸张，不要编号，不要解释。",
      user: `这件小事：${input}`
    },
    {
      title: "更温柔的视角",
      system: "你是视角训练教练。请只输出 1 到 2 句自然中文，用更体谅人的方式重写一件小事。要理解人，但不要只是安慰，要保留一点具体动作或状态，不要出现“没关系、慢慢来”这种空泛安慰，不要编号，不要解释。",
      user: `这件小事：${input}`
    }
  ];
}

function buildLoadingCards(titles, message) {
  return titles.map((title) => ({
    module: "模型增强",
    title,
    text: message
  }));
}

function persistRenderedModule(moduleKey, source, cards) {
  updateModuleState(moduleKey, {
    source,
    cards
  });
}

function recordHistory(module, action, source, cards) {
  addHistoryEntry({
    module,
    action,
    sourceLabel: source?.label || "",
    sourceText: source?.text || "",
    sourceKind: source?.kind || "",
    sourceMeta: source?.meta || null,
    cards
  });
}

async function testModelConnection() {
  if (!isAiEnabled()) {
    updateConfigStatus("先保存完整的模型配置，再测试连接。");
    return;
  }

  updateConfigStatus("正在测试模型连接...");

  try {
    const text = await callModel(
      [
        { role: "system", content: "You are a concise assistant. Reply with exactly: connection ok." },
        { role: "user", content: "Please reply now." }
      ],
      0.2
    );

    updateConfigStatus(`连接成功。模型返回：${text.slice(0, 60)}`);
  } catch (error) {
    updateConfigStatus(error instanceof Error ? `连接失败：${error.message}` : "连接失败");
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("./service-worker.js");
  } catch {
    // Service worker failure should not block the app.
  }
}

function restoreHistoryEntry(id) {
  const entry = getHistory().find((item) => item.id === id);
  if (!entry) {
    return;
  }

  if (entry.sourceKind === "describe") {
    const input = entry.sourceMeta?.input || "";
    const tone = entry.sourceMeta?.tone || "balanced";
    dom.describeInput.value = input;
    dom.describeTone.value = tone;
    const source = buildDescribeSource(input, tone);
    currentSourceState.describe = source;
    renderCards(dom.describeOutput, entry.cards || [], source);
    persistRenderedModule("describe", source, entry.cards || []);
    dom.describeInput.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (entry.sourceKind === "association") {
    const pair = entry.sourceMeta?.pair || currentPair;
    currentPair = pair;
    dom.wordA.textContent = pair[0];
    dom.wordB.textContent = pair[1];
    dom.associationInput.value = entry.sourceMeta?.attempt || "";
    const source = buildAssociationSource(pair, entry.sourceMeta?.attempt || "");
    currentSourceState.association = source;
    renderCards(dom.associationOutput, entry.cards || [], source);
    persistRenderedModule("association", source, entry.cards || []);
    dom.associationInput.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (entry.sourceKind === "perspective") {
    const input = entry.sourceMeta?.input || entry.sourceText || "";
    dom.perspectiveInput.value = input;
    const source = buildPerspectiveSource(input);
    currentSourceState.perspective = source;
    renderCards(dom.perspectiveOutput, entry.cards || [], source);
    persistRenderedModule("perspective", source, entry.cards || []);
    dom.perspectiveInput.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function restoreAppState() {
  const state = getAppState();

  if (state.describe?.source?.meta?.input) {
    dom.describeInput.value = state.describe.source.meta.input;
    dom.describeTone.value = state.describe.source.meta.tone || "balanced";
    currentSourceState.describe = state.describe.source;
    if (Array.isArray(state.describe.cards) && state.describe.cards.length) {
      renderCards(dom.describeOutput, state.describe.cards, state.describe.source);
    }
  }

  if (state.association?.source?.meta?.pair?.length === 2) {
    currentPair = state.association.source.meta.pair;
    dom.wordA.textContent = currentPair[0];
    dom.wordB.textContent = currentPair[1];
    dom.associationInput.value = state.association.source.meta.attempt || "";
    currentSourceState.association = state.association.source;
    if (Array.isArray(state.association.cards) && state.association.cards.length) {
      renderCards(dom.associationOutput, state.association.cards, state.association.source);
    }
  }

  if (state.perspective?.source?.meta?.input) {
    dom.perspectiveInput.value = state.perspective.source.meta.input;
    currentSourceState.perspective = state.perspective.source;
    if (Array.isArray(state.perspective.cards) && state.perspective.cards.length) {
      renderCards(dom.perspectiveOutput, state.perspective.cards, state.perspective.source);
    }
  }
}

dom.configForm.addEventListener("submit", (event) => {
  event.preventDefault();
  setConfig({
    enableAi: dom.enableAi.checked,
    baseUrl: dom.baseUrl.value.trim(),
    model: dom.modelName.value.trim(),
    apiKey: dom.apiKey.value.trim()
  });
  updateConfigStatus();
});

dom.clearConfig.addEventListener("click", () => {
  setConfig({
    enableAi: false,
    baseUrl: "https://api.openai.com/v1",
    model: "",
    apiKey: ""
  });
  applyConfigToForm();
});

dom.installApp.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    updateInstallUi();
    return;
  }

  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  if (result?.outcome === "accepted") {
    dom.installTip.textContent = "安装请求已提交，安卓完成后会出现在主屏。";
  }
  deferredInstallPrompt = null;
  updateInstallUi();
});

dom.testConfig.addEventListener("click", async () => {
  await testModelConnection();
});

dom.describeInput.addEventListener("input", () => {
  updateModuleState("describe", {
    source: buildDescribeSource(dom.describeInput.value, dom.describeTone.value)
  });
});

dom.describeTone.addEventListener("change", () => {
  updateModuleState("describe", {
    source: buildDescribeSource(dom.describeInput.value, dom.describeTone.value)
  });
});

dom.describeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = dom.describeInput.value.trim();
  const tone = dom.describeTone.value;

  if (!input) {
    setEmpty(dom.describeOutput, "先写一句你现在最常用、最直白的话。");
    return;
  }

  const source = buildDescribeSource(input, tone);
  currentSourceState.describe = source;
  const fallbackCards = buildLocalDescribeCards(input, tone);

  if (!isAiEnabled()) {
    renderCards(dom.describeOutput, fallbackCards, source);
    persistRenderedModule("describe", source, fallbackCards);
    recordHistory("描写扩展器", "描写扩展", source, fallbackCards);
    return;
  }

  renderCards(dom.describeOutput, buildLoadingCards(fallbackCards.map((card) => card.title), "模型正在逐块生成，不会把一整段话硬拆开。"), source);
  updateConfigStatus("正在逐块生成描写结果...");

  try {
    const cards = await generateFromBlueprint(getDescribeBlueprint(input, tone), fallbackCards);
    renderCards(dom.describeOutput, cards, source);
    persistRenderedModule("describe", source, cards);
    recordHistory("描写扩展器", "描写扩展", source, cards);
    updateConfigStatus("描写结果生成完成。");
  } catch (error) {
    renderCards(dom.describeOutput, fallbackCards, source);
    persistRenderedModule("describe", source, fallbackCards);
    recordHistory("描写扩展器", "描写扩展", source, fallbackCards);
    updateConfigStatus(error instanceof Error ? `模型生成失败，已切回本地模板：${error.message}` : "模型生成失败，已切回本地模板。");
  }
});

dom.refreshPair.addEventListener("click", refreshAssociationPair);

dom.associationInput.addEventListener("input", () => {
  updateModuleState("association", {
    source: buildAssociationSource(currentPair, dom.associationInput.value)
  });
});

dom.associationHint.addEventListener("click", async () => {
  const attempt = dom.associationInput.value.trim();
  const source = buildAssociationSource(currentPair, attempt);
  currentSourceState.association = source;
  const fallbackCards = buildLocalAssociationHintCards(currentPair);

  if (!isAiEnabled()) {
    renderCards(dom.associationOutput, fallbackCards, source);
    persistRenderedModule("association", source, fallbackCards);
    recordHistory("联想短路器", "联想提示", source, fallbackCards);
    return;
  }

  renderCards(dom.associationOutput, buildLoadingCards(fallbackCards.map((card) => card.title), "模型正在给你更像思考过程的提示。"), source);
  updateConfigStatus("正在生成联想提示...");

  try {
    const cards = await generateFromBlueprint(getAssociationHintBlueprint(currentPair, attempt), fallbackCards);
    renderCards(dom.associationOutput, cards, source);
    persistRenderedModule("association", source, cards);
    recordHistory("联想短路器", "联想提示", source, cards);
    updateConfigStatus("联想提示生成完成。");
  } catch (error) {
    renderCards(dom.associationOutput, fallbackCards, source);
    persistRenderedModule("association", source, fallbackCards);
    recordHistory("联想短路器", "联想提示", source, fallbackCards);
    updateConfigStatus(error instanceof Error ? `模型提示失败，已切回本地提示：${error.message}` : "模型提示失败，已切回本地提示。");
  }
});

dom.associationAnswer.addEventListener("click", async () => {
  const attempt = dom.associationInput.value.trim();
  const source = buildAssociationSource(currentPair, attempt);
  currentSourceState.association = source;
  const fallbackCards = buildLocalAssociationAnswerCards(currentPair);

  if (!isAiEnabled()) {
    renderCards(dom.associationOutput, fallbackCards, source);
    persistRenderedModule("association", source, fallbackCards);
    recordHistory("联想短路器", "联想参考", source, fallbackCards);
    return;
  }

  renderCards(dom.associationOutput, buildLoadingCards(fallbackCards.map((card) => card.title), "模型正在把这两个词连成一句话、一个故事和一个比喻。"), source);
  updateConfigStatus("正在生成联想参考...");

  try {
    const cards = await generateFromBlueprint(getAssociationBlueprint(currentPair, attempt), fallbackCards);
    renderCards(dom.associationOutput, cards, source);
    persistRenderedModule("association", source, cards);
    recordHistory("联想短路器", "联想参考", source, cards);
    updateConfigStatus("联想参考生成完成。");
  } catch (error) {
    renderCards(dom.associationOutput, fallbackCards, source);
    persistRenderedModule("association", source, fallbackCards);
    recordHistory("联想短路器", "联想参考", source, fallbackCards);
    updateConfigStatus(error instanceof Error ? `模型参考失败，已切回本地模板：${error.message}` : "模型参考失败，已切回本地模板。");
  }
});

dom.perspectiveInput.addEventListener("input", () => {
  updateModuleState("perspective", {
    source: buildPerspectiveSource(dom.perspectiveInput.value)
  });
});

dom.perspectiveForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = dom.perspectiveInput.value.trim();

  if (!input) {
    setEmpty(dom.perspectiveOutput, "写一件越小越好的小事，比如“今天下楼买咖啡时突然不知道自己想喝什么”。");
    return;
  }

  const source = buildPerspectiveSource(input);
  currentSourceState.perspective = source;
  const fallbackCards = buildLocalPerspectiveCards(input);

  if (!isAiEnabled()) {
    renderCards(dom.perspectiveOutput, fallbackCards, source);
    persistRenderedModule("perspective", source, fallbackCards);
    recordHistory("视角转换器", "视角转换", source, fallbackCards);
    return;
  }

  renderCards(dom.perspectiveOutput, buildLoadingCards(fallbackCards.map((card) => card.title), "模型正在为同一件小事逐个生成不同视角。"), source);
  updateConfigStatus("正在生成视角结果...");

  try {
    const cards = await generateFromBlueprint(getPerspectiveBlueprint(input), fallbackCards);
    renderCards(dom.perspectiveOutput, cards, source);
    persistRenderedModule("perspective", source, cards);
    recordHistory("视角转换器", "视角转换", source, cards);
    updateConfigStatus("视角结果生成完成。");
  } catch (error) {
    renderCards(dom.perspectiveOutput, fallbackCards, source);
    persistRenderedModule("perspective", source, fallbackCards);
    recordHistory("视角转换器", "视角转换", source, fallbackCards);
    updateConfigStatus(error instanceof Error ? `视角生成失败，已切回本地模板：${error.message}` : "视角生成失败，已切回本地模板。");
  }
});

dom.exportFavorites.addEventListener("click", async () => {
  const favorites = getFavorites();

  if (!favorites.length) {
    setEmpty(dom.favoritesOutput, "还没有收藏内容，先存几句你想学的话。");
    return;
  }

  const exportText = favorites
    .map((item) => {
      const source = item.sourceText ? `\n${item.sourceLabel || "原始输入"}：${item.sourceText}` : "";
      return `[${item.module}] ${item.title}\n${item.text}${source}`;
    })
    .join("\n\n");

  try {
    await navigator.clipboard.writeText(exportText);
    updateConfigStatus("收藏内容已复制到剪贴板。");
  } catch {
    alert("复制到剪贴板失败，可以稍后再试。");
  }
});

dom.clearFavorites.addEventListener("click", () => {
  setFavorites([]);
});

dom.exportHistory.addEventListener("click", async () => {
  const history = getHistory();
  if (!history.length) {
    setEmpty(dom.historyOutput, "还没有历史内容，先做几次练习。");
    return;
  }

  const exportText = history
    .map((item) => {
      const cards = (item.cards || []).map((card) => `[${card.title}] ${card.text}`).join("\n");
      return `${item.action} · ${item.module}\n${item.sourceLabel || "原始输入"}：${item.sourceText}\n${cards}`;
    })
    .join("\n\n");

  try {
    await navigator.clipboard.writeText(exportText);
    updateConfigStatus("历史记录已复制到剪贴板。");
  } catch {
    alert("复制历史失败，可以稍后再试。");
  }
});

dom.clearHistory.addEventListener("click", () => {
  setHistory([]);
});

applyConfigToForm();
renderFavorites();
renderHistory();
refreshAssociationPair();
restoreAppState();
registerServiceWorker();
updateInstallUi();

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallUi();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallUi();
});
