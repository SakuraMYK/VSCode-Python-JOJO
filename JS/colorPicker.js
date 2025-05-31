const vscode = require("vscode");

const reRGB = /rgb\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gs;

const reRGBA =
  /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3}|1|0|0\.\d+)\s*\)/gs;

const reTupleRGB =
  /(?<!rgb)(?<!rgba)\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/gs;

const reTupleRGBA =
  /(?<!rgb)(?<!rgba)\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3}|1|0|0\.\d+)\s*\)/gs;

const reHEX = /#([0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b/gs;

const reAlphaFloat =
  /\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(1|0|0\.\d+)\s*\)/;

const reAlphaInt =
  /\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(\d{1,3})\s*\)/;

const reHexAlpha = /#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})\b/gs;

const borderRadius = "9px";

/**
 * ColorPicker 类实现 DocumentColorProvider 接口，用于在 VS Code 中提供颜色拾取功能。
 */
class ColorPicker {
  /**
   * 构造函数，初始化缓存属性。
   */
  constructor() {
    this.colorDecorationType = null;
  }

  // 添加一个方法来追踪装饰器统计信息

  /**
   * 提供文档中的颜色信息。
   * @param {vscode.TextDocument} document - 当前活动的文本文档。
   * @returns {vscode.ColorInformation[]} - 文档中的颜色信息数组。
   */
  provideDocumentColors(document) {
    try {
      // 如果没有活动编辑器或文档不匹配，返回空数组，以提高性能
      if (!vscode.window.activeTextEditor) return [];

      const colorAndRanges = getColorAndRangeMaps(document);

      return colorAndRanges.map(
        (item) => new vscode.ColorInformation(item.range, item.color)
      );
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
      const { document, range } = context;
      const colorString = document.getText(range);
      let a = 1;
      let match;
      const r = color.red * 255;
      const g = color.green * 255;
      const b = color.blue * 255;

      if (colorString.startsWith("rgba")) {
        if ((match = reAlphaFloat.exec(colorString))) {
          a = match[1];
        } else if ((match = reAlphaInt.exec(colorString))) {
          a = match[1] / 255;
        } else {
          console.error(
            "provideColorPresentations colorString Invalid alpha value"
          );
          return;
        }
      } else if (colorString.startsWith("rgb")) {
        a = 1;
      } else if (colorString.startsWith("(")) {
        if ((match = reAlphaFloat.exec(colorString))) {
          a = match[1];
        } else if ((match = reAlphaInt.exec(colorString))) {
          a = match[1] / 255;
        } else {
          a = 255;
        }
      } else if (colorString.startsWith("#")) {
        if ((match = reHexAlpha.exec(colorString))) {
          a = parseInt(match[1], 16) / 255;
        }
      } else {
        console.error("Unknown color format: " + colorString);
        return;
      }

      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      const fontColor = brightness > 186 ? "black" : "white";
      // console.info("Brightness: ", brightness, "Font Color: ", fontColor);

      // console.info(`rgba(${r}, ${g}, ${b}, ${a})`);

      // if (this.colorDecorationType) this.colorDecorationType.dispose();
      this.colorDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: `rgba(${r}, ${g}, ${b}, ${a})`,
        borderRadius: borderRadius,
        color: fontColor,
      });
      vscode.window.activeTextEditor.setDecorations(this.colorDecorationType, [
        range,
      ]);

      return [
        new vscode.ColorPresentation(this._colorToString(context, color)),
      ];
    } catch (error) {
      vscode.window.showErrorMessage(error.message);
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

    if (string.startsWith("rgba")) {
      return `rgba(${intR}, ${intG}, ${intB}, ${intA})`;
    } else if (/rgb/.test(string)) {
      if (color.alpha !== 1) {
        return `rgba(${intR}, ${intG}, ${intB}, ${intA})`;
      } else {
        return `rgb(${intR}, ${intG}, ${intB})`;
      }
    } else if (string.startsWith("#")) {
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

function applyBGColorToText(document) {
  getColorAndRangeMaps(document);
  // maps.forEach((map) => {
  //   vscode.window.activeTextEditor.setDecorations(map.decorationType, [
  //     map.range,
  //   ]);
  // });
}

// 获取颜色和范围
function getColorAndRangeMaps(document) {
  const maps = [
    ...getRGBMaps(document),
    ...getRGBAMaps(document),
    ...getTupleRGBMaps(document),
    ...getTupleRGBAMaps(document),
    ...getHexMaps(document),
  ];
  getHexMaps(document).forEach((map) => {
    console.log(document.getText(map.range));
  });
}

function rangesEqual(range1, range2) {
  return (
    range1.start.line === range2.start.line &&
    range1.start.character === range2.start.character &&
    range1.end.line === range2.end.line &&
    range1.end.character === range2.end.character
  );
}

function getRGBMaps(document) {
  const maps = [];
  const matches = [...document.getText().matchAll(reRGB)];

  for (const match of matches) {
    const s = match.index;
    const e = match.index + match[0].length;
    const start = document.positionAt(s);
    const end = document.positionAt(e);
    const R = parseInt(match[1]);
    const G = parseInt(match[2]);
    const B = parseInt(match[3]);

    if (R >= 0 && R <= 255 && G >= 0 && G <= 255 && B >= 0 && B <= 255) {
      maps.push({
        position: [s, e],
        range: new vscode.Range(start, end),
        text: `rgba(${R}, ${G}, ${B}, 1)`,
        color: new vscode.Color(R / 255, G / 255, B / 255, 1),
        decorationType: vscode.window.createTextEditorDecorationType({
          backgroundColor: `rgba(${R}, ${G}, ${B}, 1)`,
          borderRadius: borderRadius,
        }),
      });
    }
  }
  return maps;
}

function getRGBAMaps(document) {
  const maps = [];
  const matches = [...document.getText().matchAll(reRGBA)];
  for (const match of matches) {
    const s = match.index;
    const e = match.index + match[0].length;
    const start = document.positionAt(s);
    const end = document.positionAt(e);
    const R = parseInt(match[1]);
    const G = parseInt(match[2]);
    const B = parseInt(match[3]);
    let A = parseFloat(match[4]);
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
      if (A > 1) A = A / 255;
      maps.push({
        position: [s, e],
        range: new vscode.Range(start, end),
        text: `rgba(${R}, ${G}, ${B}, ${A})`,
        color: new vscode.Color(R / 255, G / 255, B / 255, A),
        decorationType: vscode.window.createTextEditorDecorationType({
          backgroundColor: `rgba(${R}, ${G}, ${B}, ${A})`,
          borderRadius: borderRadius,
        }),
      });
    }
  }
  return maps;
}

function getTupleRGBMaps(document) {
  const maps = [];
  const matches = [...document.getText().matchAll(reTupleRGB)];
  for (const match of matches) {
    const s = match.index;
    const e = match.index + match[0].length;
    const start = document.positionAt(s);
    const end = document.positionAt(e);
    const R = parseInt(match[1]);
    const G = parseInt(match[2]);
    const B = parseInt(match[3]);

    if (R >= 0 && R <= 255 && G >= 0 && G <= 255 && B >= 0 && B <= 255) {
      maps.push({
        position: [s, e],
        range: new vscode.Range(start, end),
        text: `rgba(${R}, ${G}, ${B}, 1)`,
        color: new vscode.Color(R / 255, G / 255, B / 255, 1),
        decorationType: vscode.window.createTextEditorDecorationType({
          backgroundColor: `rgba(${R}, ${G}, ${B}, 1)`,
          borderRadius: borderRadius,
        }),
      });
    }
  }
  return maps;
}

function getTupleRGBAMaps(document) {
  const maps = [];
  const matches = [...document.getText().matchAll(reTupleRGBA)];
  for (const match of matches) {
    const s = match.index;
    const e = match.index + match[0].length;
    const start = document.positionAt(s);
    const end = document.positionAt(e);
    const R = parseInt(match[1]);
    const G = parseInt(match[2]);
    const B = parseInt(match[3]);
    let A = parseFloat(match[4]);
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
      if (A > 1) A = A / 255;
      maps.push({
        position: [s, e],
        range: new vscode.Range(start, end),
        text: `rgba(${R}, ${G}, ${B}, ${A})`,
        color: new vscode.Color(R / 255, G / 255, B / 255, A),
        decorationType: vscode.window.createTextEditorDecorationType({
          backgroundColor: `rgba(${R}, ${G}, ${B}, ${A})`,
          borderRadius: borderRadius,
        }),
      });
    }
  }
  return maps;
}

function getHexMaps(document) {
  const maps = [];
  const matches = [...document.getText().matchAll(reHEX)];
  for (const match of matches) {
    const hex = match[0];
    const hexLength = hex.length;

    const s = match.index;
    const e = match.index + hexLength;
    const start = document.positionAt(s);
    const end = document.positionAt(e);

    let R;
    let G;
    let B;
    let A;

    switch (hexLength) {
      case 3:
        R = parseInt(hex.substring(0, 2), 16);
        G = parseInt(hex.substring(2, 4), 16);
        B = parseInt(hex.substring(4, 6), 16);
        A = 1;
        break;
      case 6:
        R = parseInt(hex.substring(0, 2), 16);
        G = parseInt(hex.substring(2, 4), 16);
        B = parseInt(hex.substring(4, 6), 16);
        A = 1;
        break;
      case 8:
        R = parseInt(hex.substring(0, 2), 16);
        G = parseInt(hex.substring(2, 4), 16);
        B = parseInt(hex.substring(4, 6), 16);
        A = parseInt(hex.substring(6, 8), 16) / 255;
        break;
      default:
        console.error(`Invalid hex length: ${hexLength}`);
        break;
    }

    maps.push({
      position: [s, e],
      range: new vscode.Range(start, end),
      text: `rgba(${R}, ${G}, ${B}, 1)`,
      color: new vscode.Color(R / 255, G / 255, B / 255, A),
      decorationType: vscode.window.createTextEditorDecorationType({
        backgroundColor: `rgba(${R}, ${G}, ${B}, ${A})`,
        borderRadius: borderRadius,
      }),
    });
  }
  return maps;
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

module.exports = { ColorPicker, forceRefreshColors, applyBGColorToText };
