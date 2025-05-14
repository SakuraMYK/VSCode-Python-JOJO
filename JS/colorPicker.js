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

// 实现 DocumentColorProvider 接口
class ColorPicker {
  constructor() {
    this.lastDocument = null;
    this.lastColorInformations = [];
    this.lastVersion = -1;
    this.lastVisibleRanges = [];
  }

  provideDocumentColors(document) {
    try {
      // 获取当前的活动编辑器
      const activeEditor = vscode.window.activeTextEditor;

      // 如果没有活动编辑器或文档不匹配，返回空数组，以提高性能
      if (!activeEditor || activeEditor.document !== document) {
        return [];
      }

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

  // 当用户修改颜色时调用
  async provideColorPresentations(color, context) {
    try {
      return [new vscode.ColorPresentation(this.colorToString(context, color))];
    } catch (error) {
      console.error(error);
    }
  }

  colorToString(context, color) {
    const { document, range } = context;
    const string = document.getText(range);

    const intR = Math.round(color.red * 255);
    const intG = Math.round(color.green * 255);
    const intB = Math.round(color.blue * 255);

    const hexR = intR.toString(16).padStart(2, "0");
    const hexG = intG.toString(16).padStart(2, "0");
    const hexB = intB.toString(16).padStart(2, "0");

    if (/rgba/.test(string)) {
      return `rgba(${intR}, ${intG}, ${intB}, ${color.alpha})`;
    } else if (/rgb/.test(string)) {
      return `rgb(${intR}, ${intG}, ${intB})`;
    } else if (/#/.test(string)) {
      return `#${hexR}${hexG}${hexB}`;
    } else {
      return `(${intR}, ${intG}, ${intB})`;
    }
  }

  // 辅助方法：比较两个范围数组是否相等
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

function getColorAndRanges(document) {
  const colorAndRanges = [
    ...getColorNoPrefixRGBAndRanges(document),
    ...getColorNoPrefixRGB_AIntAndRanges(document),
    ...getColorNoPrefixRGB_AFloatAndRanges(document),
    ...getColorRGB_AFloatAndRanges(document),
    ...getColorRGB_AIntAndRanges(document),
    ...getColorRGBAndRanges(document),
    ...getColorHexAndRanges(document),
  ];
  return colorAndRanges;
}

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

module.exports = { ColorPicker };
