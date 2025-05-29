const vscode = require("vscode");

const reRGB = /rgb\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gs;

const NoPrefix_reRGB =
  /(?<!rgb)(?<!rgba)\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gs;

const NoPrefix_reRGBA_Int =
  /(?<!rgb)(?<!rgba)\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gs;

const NoPrefix_reRGBA_Float =
  /(?<!rgb)(?<!rgba)\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(1(\.0)?|0?\.\d+)\s*\)/gs;

const reRGBA_Int =
  /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gs;

const reRGBA_Float =
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
    this.currentEditor = null;
  }

  /**
   * 提供文档中的颜色信息。
   * @param {vscode.TextDocument} document - 当前活动的文本文档。
   * @returns {vscode.ColorInformation[]} - 文档中的颜色信息数组。
   */
  provideDocumentColors(document) {
    try {
      // 获取当前的活动编辑器
      this.currentEditor = vscode.window.activeTextEditor;

      // 如果没有活动编辑器或文档不匹配，返回空数组，以提高性能
      if (!this.currentEditor) return [];

      // 获取可见范围
      const visibleRange = this.currentEditor.visibleRanges;

      // 如果文档、版本或可见范围与缓存相同，则返回缓存的颜色信息
      if (
        this.lastDocument === document &&
        this.lastVersion === document.version &&
        this._areRangesEqual(this.lastVisibleRanges, visibleRange)
      ) {
        return this.lastColorInformations;
      } else {
        const colorAndRanges = this._getColorAndRangeMaps(document);

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
      const r = color.red * 255;
      const g = color.green * 255;
      const b = color.blue * 255;
      const a = color.alpha;

      this.currentEditor.setDecorations(
        vscode.window.createTextEditorDecorationType({
          backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})`,
        }),
        [context.range]
      );
      return [
        new vscode.ColorPresentation(this._colorToString(context, color)),
      ];
    } catch (error) {
      console.error(error);
    }
  }

  // 获取颜色和范围
  _getColorAndRangeMaps(document) {
    const hexMaps = getColorHexRangeMaps(document);
    const rgbMaps = getColorRGBRangeMaps(document);
    const rgbaMaps = [
      ...getColorRGBA_Float_RangeMaps(document),
      ...getColorRGBA_Int_RangeMaps(document),
    ];

    const maps = [];

    maps.push(...hexMaps, ...rgbMaps, ...rgbaMaps);

    for (const get of getColorNoPrefixRGBRangeMaps(document)) {
      if (!maps.some((map) => rangesEqual(map.range, get.range))) {
        maps.push(get);
      }
    }

    for (const get of getColorNoPrefixRGBA_Float_RangeMaps(document)) {
      if (!maps.some((map) => rangesEqual(map.range, get.range))) {
        maps.push(get);
      }
    }

    for (const get of getColorNoPrefixRGBA_Int_RangeMaps(document)) {
      if (!maps.some((map) => rangesEqual(map.range, get.range))) {
        maps.push(get);
      }
    }

    return maps;
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
      if (!rangesEqual(r1, r2)) return false;
    }

    return true;
  }

  /**
   * 将颜色转换为字符串表示形式。
   * @param {object} context - 包含文档和范围的对象。
   * @param {vscode.Color} color - 要转换的颜色。
   * @returns {string} - 颜色的字符串表示形式。
   */
  _colorToString(context, color) {
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
}

function rangesEqual(range1, range2) {
  return (
    range1.start.line === range2.start.line &&
    range1.start.character === range2.start.character &&
    range1.end.line === range2.end.line &&
    range1.end.character === range2.end.character
  );
}

/**
 * 从文档中提取所有颜色及其范围。
 * @param {vscode.TextDocument} document - 文档对象。
 * @returns {Array} - 包含颜色和范围的对象数组。
 */

/**
 * 从文档中提取 rgb(...) 格式的颜色及其范围。
 * @param {vscode.TextDocument} document - 文档对象。
 * @returns {Array} - 包含颜色和范围的对象数组。
 */
function getColorRGBRangeMaps(document) {
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
function getColorNoPrefixRGBRangeMaps(document) {
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
function getColorRGBA_Int_RangeMaps(document) {
  const map_list = [];
  const matches = [...document.getText().matchAll(reRGBA_Int)];
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
function getColorRGBA_Float_RangeMaps(document) {
  const map_list = [];
  const matches = [...document.getText().matchAll(reRGBA_Float)];
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
function getColorNoPrefixRGBA_Int_RangeMaps(document) {
  const map_list = [];
  const matches = [...document.getText().matchAll(NoPrefix_reRGBA_Int)];
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
function getColorNoPrefixRGBA_Float_RangeMaps(document) {
  const map_list = [];
  const matches = [...document.getText().matchAll(NoPrefix_reRGBA_Float)];
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
function getColorHexRangeMaps(document) {
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
