const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { getPythonScriptResult } = require("./runPython.js");

async function applyTheme(themeName) {
  console.info("Applying: ", themeName);
  switch (themeName) {
    case "Disabled":
      themeName = "Default Dark+";
      break;
    case "PyCodeJOJO Random":
      console.info("use Random theme");
      await randomThemeFile();
      break;
  }

  await vscode.workspace
    .getConfiguration()
    .update(
      "workbench.colorTheme",
      themeName,
      vscode.ConfigurationTarget.Global
    );

  await vscode.workspace.getConfiguration("pycodejojo").update("theme"),
    themeName,
    vscode.ConfigurationTarget.Global;
}

class PythonSyntaxHighlighter {
  constructor() {
    this.updateTimeout = null;

    this.privateVarStyle = vscode.window.createTextEditorDecorationType({
      color: "#8EFA58",
      fontWeight: "bold",
      fontStyle: "italic",
    });

    this.privateMethodStyle = vscode.window.createTextEditorDecorationType({
      color: "#576EFF",
      fontWeight: "bold",
      fontStyle: "italic",
    });

    this.magicMethodStyle = vscode.window.createTextEditorDecorationType({
      color: "#67B8EA",
      fontWeight: "bold",
      fontStyle: "",
    });

    this.importNameStyle = vscode.window.createTextEditorDecorationType({
      color: "#67B8EA",
      fontWeight: "bold",
      fontStyle: "",
      // backgroundColor: "#fff", // 背景色
    });
  }

  async update(editor) {
    const rePrivateVar = /(self\s*\.\s*)(_\w+)/g;
    const rePrivateMethod = /(def\s+)(_(?!_)\w+)/g;
    const reMagicMethod = /(def\s+)(__\w+__)/g;

    const reImportNameNotAs = /(?<!#.*)import\s+([\w\.]+)/g;

    const text = editor.document.getText();

    const importNamesRanges = await getPythonScriptResult(
      editor.document,
      "get_import_names_range"
    );

    const editorRanges = [];
    Object.values(importNamesRanges).forEach((range) => {
      if (range.asname) {
        editorRanges.push(
          new vscode.Range(
            editor.document.positionAt(range.asname[0]),
            editor.document.positionAt(range.asname[1])
          )
        );
      }
      range.name.forEach((array) => {
        editorRanges.push(
          new vscode.Range(
            editor.document.positionAt(array[0]),
            editor.document.positionAt(array[1])
          )
        );
      });
    });

    editor.setDecorations(this.importNameStyle, editorRanges);

    // this._setDecorations(editor, text, rePrivateVar, this.privateVarStyle);
    // this._setDecorations(
    //   editor,
    //   text,
    //   rePrivateMethod,
    //   this.privateMethodStyle
    // );
    // this._setDecorations(editor, text, reMagicMethod, this.magicMethodStyle);
    // this._setDecorations(editor, text, a, this.importNameStyle);

    // this._mergeRegexWithoutOverlap([rePrivateVar, rePrivateMethod], text);
  }

  // 合并正则表达式，避免重叠
  _mergeRegexWithoutOverlap(regexes, text) {
    for (const regex of regexes) {
      const matches = text.matchAll(regex);
      if (matches) {
        for (const match of matches) {
          console.error(match);
        }
      }
    }
  }

  _setDecorations(editor, text, regex, style) {
    const decorations = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      const start = match.index + match[1].length;
      const end = start + match[2].length;
      console.error(`===========================`);
      console.error(`match1: ${match[1]}`);
      console.error(`match2: ${match[2]}`);
      decorations.push({
        range: new vscode.Range(
          editor.document.positionAt(start),
          editor.document.positionAt(end)
        ),
      });
    }
    editor.setDecorations(style, decorations);
  }
}

async function randomThemeFile() {
  return new Promise((resolve, reject) => {
    try {
      const dir = "../themes";
      const sourceFile = "dark.json";
      const newFile = "random.json";

      const themeJsonFile = path.join(__dirname, dir, sourceFile);
      const newThemeFile = path.join(__dirname, dir, newFile);

      const reHexColor = new RegExp(/"foreground"\s*:\s*"(.*)"/g);
      const reFontStyle = new RegExp(/"fontStyle"\s*:\s*"(.*)"/g);

      let text = fs.readFileSync(themeJsonFile, "utf-8");

      text = text.replace("PyCodeJOJO Dark", "PyCodeJOJO Random");
      text = text.replace(reHexColor, () => randomHexColor());
      text = text.replace(reFontStyle, () => randomFontStyle());

      fs.writeFileSync(newThemeFile, text, "utf-8");
      setTimeout(resolve, 100);
    } catch (error) {
      console.error(error);
      reject(error);
    }
  });
}

function randomHexColor() {
  return `"foreground": "${
    "#" + Math.floor(Math.random() * 16777215).toString(16)
  }"`;
}

function randomFontStyle(
  weights = { italic: 1, bold: 1, underline: 1, normal: 1 }
) {
  const selectedStyles = [];

  // 遍历每个样式，根据权重决定是否选中
  for (const [style, weight] of Object.entries(weights)) {
    // 跳过 normal，它不是实际的样式
    if (style === "normal") continue;

    // 根据权重计算被选中的概率
    // 权重越高，被选中的概率越大
    const probability = weight / (weight + 5); // 分母加5是为了控制概率范围

    if (Math.random() < probability) {
      selectedStyles.push(style);
    }
  }

  // 返回选中的样式组合，用空格分隔
  // 如果没有选中任何样式，返回空字符串
  return `"fontStyle": "${selectedStyles.join(" ")}"`;
}

module.exports = { applyTheme, PythonSyntaxHighlighter };
