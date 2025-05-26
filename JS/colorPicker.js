const vscode = require("vscode");
const reRGB = /rgb\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gs;
const NoPrefix_reRGB =
  /(?<!rgb)(?<!rgba)\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gs;
const NoPrefix_reRGB_AInt =
  /(?<!rgb)(?<!rgba)\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gs;
const NoPrefix_reRGB_AFloat =
  /(?<!rgb)(?<!rgba)\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(1(\.0)?|0?\.\d+)\s*\)/gs;
const reRGB_AInt =
  /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gs;
const reRGB_AFloat =
  /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(1(\.0)?|0?\.\d+)\s*\)/gs;
const reHEX = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})/gs;

/**
 * ColorPicker 类实现 DocumentColorProvider 接口，用于在 VS Code 中提供颜色拾取功能。
 */
class ColorPicker {
  /**
   * 构造函数，初始化缓存属性。
   */
  constructor() {
    /**
     * 缓存上一次处理的文档。
     * @type {vscode.TextDocument | null}
     */
    this.lastDocument = null;

    /**
     * 缓存上一次处理的颜色信息。
     * @type {vscode.ColorInformation[]}
     */
    this.lastColorInformations = [];

    /**
     * 缓存上一次处理的文档版本。
     * @type {number}
     */
    this.lastVersion = -1;

    /**
     * 缓存上一次处理的可见范围。
     * @type {vscode.Range[]}
     */
    this.lastVisibleRanges = [];
  }

  /**
   * 提供文档中的颜色信息。
   * @param {vscode.TextDocument} document - 当前活动的文本文档。
   * @returns {vscode.ColorInformation[]} - 文档中的颜色信息数组。
   */
  provideDocumentColors(document) {
    try {
      // 获取当前的活动编辑器
      const activeEditor = vscode.window.activeTextEditor;

      // 如果没有活动编辑器或文档不匹配，返回空数组，以提高性能
      if (!activeEditor) return [];

      // 获取可见范围
      const visibleRange = activeEditor.visibleRanges;
      const rangesEqual = this._areRangesEqual(
        this.lastVisibleRanges,
        visibleRange
      );
      if (
        this.lastDocument === document &&
        this.lastVersion === document.version &&
        rangesEqual
      ) {
        return this.lastColorInformations;
      } else {
        const colorAndRanges = getColorAndRanges(document);

        // 更新缓存
        this.lastDocument = document;
        this.version = document.version;
        this.lastColorInformations = colorAndRanges.map(
          (item) => new vscode.ColorInformation(item.range, item.color)
        );

        return this.lastColorInformations;
      }
    } catch (error) {
      console.error(error);
      return []; // 返回空数组表示没有颜色信息
    }
  }

  /**
   * 当用户修改颜色时调用，提供颜色表示形式。
   * @param {vscode.Color} color - 用户选择的颜色。
   * @param {object} context - 包含文档和范围的对象。
   * @returns {Promise<vscode.ColorPresentation[]>} - 颜色表示形式的 Promise。
   */
  async provideColorPresentations(color, context) {
    try {
      return [new vscode.ColorPresentation(this.colorToString(context, color))];
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * 将颜色转换为字符串表示形式。
   * @param {object} context - 包含文档和范围的对象。
   * @param {vscode.Color} color - 要转换的颜色。
   * @returns {string} - 颜色的字符串表示形式。
   */
  colorToString(context, color) {
    const { document, range } = context;
    const string = document.getText(range);

    const intR = Math.round(color.red * 255);
    const intG = Math.round(color.green * 255);
    const intB = Math.round(color.blue * 255);

    const hexR = intR.toString(16).padStart(2, "0");
    const hexG = intG.toString(16).padStart(2, "0");
    const hexB = intB.toString(16).padStart(2, "0");

    const intA = Math.round(color.alpha * 255);

    if (/rgba/.test(string)) {
      return `rgba(${intR}, ${intG}, ${intB}, ${intA})`;
    } else if (/rgb/.test(string)) {
      if (color.alpha !== 1) {
        return `rgba(${intR}, ${intG}, ${intB}, ${intA})`;
      } else {
        return `rgb(${intR}, ${intG}, ${intB})`;
      }
    } else if (/#/.test(string)) {
      return `#${hexR}${hexG}${hexB}`;
    } else {
      if (string.split(",").length === 4) {
        return `(${intR}, ${intG}, ${intB}, ${intA})`;
      } else {
        if (color.alpha !== 1) {
          return `(${intR}, ${intG}, ${intB}, ${intA})`;
        } else {
          return `(${intR}, ${intG}, ${intB})`;
        }
      }
    }
  }

  /**
   * 比较两个范围数组是否相等。
   * @param {vscode.Range[]} ranges1 - 第一个范围数组。
   * @param {vscode.Range[]} ranges2 - 第二个范围数组。
   * @returns {boolean} - 如果两个范围数组相等，则返回 true；否则返回 false。
   */
  _areRangesEqual(ranges1, ranges2) {
    if (ranges1.length !== ranges2.length) {
      return false;
    }

    for (let i = 0; i < ranges1.length; i++) {
      const r1 = ranges1[i];
      const r2 = ranges2[i];
      if (
        r1.start.line !== r2.start.line ||
        r1.start.character !== r2.start.character ||
        r1.end.line !== r2.end.line ||
        r1.end.character !== r2.end.character
      ) {
        return false;
      }
    }

    return true;
  }
}

/**
 * 从文档中提取所有颜色及其范围。
 * @param {vscode.TextDocument} document - 文档对象。
 * @returns {Array} - 包含颜色和范围的对象数组。
 */
// 获取颜色和范围
function getColorAndRanges(document) {
  // 获取颜色和范围（十六进制）
  const hexRanges = getColorHexAndRanges(document);
  // 获取颜色和范围（RGB）
  const rgbRanges = getColorRGBAndRanges(document);
  const rgbaRanges = [
    // 获取颜色和范围（RGBA，浮点数）
    ...getColorRGB_AFloatAndRanges(document),
    // 获取颜色和范围（RGBA，整数）
    ...getColorRGB_AIntAndRanges(document),
  ];

  // 定义范围数组
  const ranges = [];
  // 将十六进制范围添加到范围数组中
  ranges.push(...hexRanges, ...rgbRanges, ...rgbaRanges);

  // 先匹配带 rgb | rgba 前缀的颜色 避免重复匹配问题
  if (rgbRanges.length === 0)
    ranges.push(...getColorNoPrefixRGBAndRanges(document));

  if (rgbaRanges.length === 0)
    ranges.push(
      ...getColorNoPrefixRGB_AFloatAndRanges(document),
      ...getColorNoPrefixRGB_AIntAndRanges(document)
    );

  // 返回范围数组
  return ranges;
}

/**
 * 从文档中提取 rgb(...) 格式的颜色及其范围。
 * @param {vscode.TextDocument} document - 文档对象。
 * @returns {Array} - 包含颜色和范围的对象数组。
 */
function getColorRGBAndRanges(document) {
  const map_list = [];
  const matches = [...document.getText().matchAll(reRGB)];

  for (const match of matches) {
    const start = document.positionAt(match.index);
    const end = document.positionAt(match.index + match[0].length);
    const R = parseInt(match[1]);
    const G = parseInt(match[2]);
    const B = parseInt(match[3]);

    if (R >= 0 && R <= 255 && G >= 0 && G <= 255 && B >= 0 && B <= 255) {
      const map = {};
      map["color"] = new vscode.Color(R / 255, G / 255, B / 255, 1);
      map["range"] = new vscode.Range(start, end);
      map_list.push(map);
    }
  }
  return map_list;
}

/**
 * 从文档中提取 rgb(...) 格式的颜色及其范围。
 * @param {vscode.TextDocument} document - 文档对象。
 * @returns {Array} - 包含颜色和范围的对象数组。
 */
function getColorNoPrefixRGBAndRanges(document) {
  const map_list = [];
  const matches = [...document.getText().matchAll(NoPrefix_reRGB)];
  for (const match of matches) {
    const start = document.positionAt(match.index);
    const end = document.positionAt(match.index + match[0].length);
    const R = parseInt(match[1]);
    const G = parseInt(match[2]);
    const B = parseInt(match[3]);

    if (R >= 0 && R <= 255 && G >= 0 && G <= 255 && B >= 0 && B <= 255) {
      const map = {};
      map["color"] = new vscode.Color(R / 255, G / 255, B / 255, 1);
      map["range"] = new vscode.Range(start, end);
      map_list.push(map);
    }
  }
  return map_list;
}

/**
 * 从文档中提取 rgba(...) 格式的颜色及其范围。
 * @param {vscode.TextDocument} document - 文档对象。
 * @returns {Array} - 包含颜色和范围的对象数组。
 */
function getColorRGB_AIntAndRanges(document) {
  const map_list = [];
  const matches = [...document.getText().matchAll(reRGB_AInt)];
  for (const match of matches) {
    const start = document.positionAt(match.index);
    const end = document.positionAt(match.index + match[0].length);
    const R = parseInt(match[1]);
    const G = parseInt(match[2]);
    const B = parseInt(match[3]);
    const A = parseInt(match[4]);
    if (
      R >= 0 &&
      R <= 255 &&
      G >= 0 &&
      G <= 255 &&
      B >= 0 &&
      B <= 255 &&
      A >= 0 &&
      A <= 255
    ) {
      const range = new vscode.Range(start, end);
      const map = {};
      map["color"] = new vscode.Color(R / 255, G / 255, B / 255, A);
      map["range"] = range;
      map_list.push(map);
    }
  }
  return map_list;
}

/**
 * 从文档中提取 rgba(...) 格式的颜色及其范围。
 * @param {vscode.TextDocument} document - 文档对象。
 * @returns {Array} - 包含颜色和范围的对象数组。
 */
function getColorRGB_AFloatAndRanges(document) {
  const map_list = [];
  const matches = [...document.getText().matchAll(reRGB_AFloat)];
  for (const match of matches) {
    const start = document.positionAt(match.index);
    const end = document.positionAt(match.index + match[0].length);
    const R = parseInt(match[1]);
    const G = parseInt(match[2]);
    const B = parseInt(match[3]);
    const A = parseFloat(match[4]);
    if (
      R >= 0 &&
      R <= 255 &&
      G >= 0 &&
      G <= 255 &&
      B >= 0 &&
      B <= 255 &&
      A >= 0 &&
      A <= 1
    ) {
      const range = new vscode.Range(start, end);
      const map = {};
      map["color"] = new vscode.Color(R / 255, G / 255, B / 255, A);
      map["range"] = range;
      map_list.push(map);
    }
  }
  return map_list;
}

/**
 * 从文档中提取 rgb(...) 格式的颜色及其范围。
 * @param {vscode.TextDocument} document - 文档对象。
 * @returns {Array} - 包含颜色和范围的对象数组。
 */
function getColorNoPrefixRGB_AIntAndRanges(document) {
  const map_list = [];
  const matches = [...document.getText().matchAll(NoPrefix_reRGB_AInt)];
  for (const match of matches) {
    const start = document.positionAt(match.index);
    const end = document.positionAt(match.index + match[0].length);
    const R = parseInt(match[1]);
    const G = parseInt(match[2]);
    const B = parseInt(match[3]);
    const A = parseInt(match[4]);
    if (
      R >= 0 &&
      R <= 255 &&
      G >= 0 &&
      G <= 255 &&
      B >= 0 &&
      B <= 255 &&
      A >= 0 &&
      A <= 255
    ) {
      const range = new vscode.Range(start, end);
      const map = {};
      map["color"] = new vscode.Color(R / 255, G / 255, B / 255, A);
      map["range"] = range;
      map_list.push(map);
    }
  }
  return map_list;
}

/**
 * 从文档中提取 rgb(...) 格式的颜色及其范围。
 * @param {vscode.TextDocument} document - 文档对象。
 * @returns {Array} - 包含颜色和范围的对象数组。
 */
function getColorNoPrefixRGB_AFloatAndRanges(document) {
  const map_list = [];
  const matches = [...document.getText().matchAll(NoPrefix_reRGB_AFloat)];
  for (const match of matches) {
    const start = document.positionAt(match.index);
    const end = document.positionAt(match.index + match[0].length);
    const R = parseInt(match[1]);
    const G = parseInt(match[2]);
    const B = parseInt(match[3]);
    const A = parseFloat(match[4]);
    if (
      R >= 0 &&
      R <= 255 &&
      G >= 0 &&
      G <= 255 &&
      B >= 0 &&
      B <= 255 &&
      A >= 0 &&
      A <= 1
    ) {
      const range = new vscode.Range(start, end);
      const map = {};
      map["color"] = new vscode.Color(R / 255, G / 255, B / 255, A);
      map["range"] = range;
      map_list.push(map);
    }
  }
  return map_list;
}

/**
 * 从文档中提取 #RRGGBB 格式的颜色及其范围。
 * @param {vscode.TextDocument} document - 文档对象。
 * @returns {Array} - 包含颜色和范围的对象数组。
 */
function getColorHexAndRanges(document) {
  const map_list = [];
  const matches = [...document.getText().matchAll(reHEX)];
  for (const match of matches) {
    const start = document.positionAt(match.index);
    const end = document.positionAt(match.index + match[0].length);
    const map = {};
    const hex = match[0].substring(1);
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    map["color"] = new vscode.Color(r, g, b, 1);
    map["range"] = new vscode.Range(start, end);
    map_list.push(map);
  }
  return map_list;
}

// 强制刷新颜色的函数
function forceRefreshColors(document) {
  /* 实测后，onDidOpenTextDocument 、 onDidChangeTextDocument 均无法触发装饰器的更新，因此需要手动触发
   同时发现了Pylance插件存在的一个bug（不知道是不是我引起的，废了不少时间找原因没找出来，放弃了），当快速在py和非py文件直接进行切换时，会引发Pylance的一个报错：TypeError: Cannot set properties of undefined (setting 'name')*/
  if (!document) {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor || !activeEditor.document) return;
    document = activeEditor.document;
  }

  // 只处理 Python 文件
  if (document.languageId !== "python") return;

  // 通过模拟编辑操作来强制刷新颜色装饰器
  const edit = new vscode.WorkspaceEdit();
  const lastLine = document.lineCount - 1;
  const lastChar = document.lineAt(lastLine).text.length;

  // 在文档末尾添加一个空格然后立即删除
  const position = new vscode.Position(lastLine, lastChar);
  edit.insert(document.uri, position, " ");

  vscode.workspace.applyEdit(edit).then(() => {
    // 立即撤销这个编辑操作，不会影响用户体验
    setTimeout(() => {
      vscode.commands.executeCommand("undo");
    }, 0);
  });
}

module.exports = { ColorPicker, forceRefreshColors };
