const vscode = require("vscode");
const { getPythonScriptResult } = require("./runPython.js");

async function applyTheme(themeName) {
  console.error("Applying: ", themeName);
  if (themeName === "Disabled") themeName = "Default Dark+";

  await vscode.workspace
    .getConfiguration()
    .update(
      "workbench.colorTheme",
      themeName,
      vscode.ConfigurationTarget.Global
    );
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
      backgroundColor: "#fff", // 背景色
    });
  }

  async update(editor) {
    const rePrivateVar = /(self\s*\.\s*)(_\w+)/g;
    const rePrivateMethod = /(def\s+)(_(?!_)\w+)/g;
    const reMagicMethod = /(def\s+)(__\w+__)/g;

    const reImportNameNotAs = /(?<!#.*)import\s+([\w\.]+)/g;

    const text = editor.document.getText();

    const ranges = await getPythonScriptResult(editor.document,'test');

    // this._setDecorations(editor, text, rePrivateVar, this.privateVarStyle);
    // this._setDecorations(
    //   editor,
    //   text,
    //   rePrivateMethod,
    //   this.privateMethodStyle
    // );
    // this._setDecorations(editor, text, reMagicMethod, this.magicMethodStyle);
    // this._setDecorations(editor, text, a, this.importNameStyle);

    this._mergeRegexWithoutOverlap([rePrivateVar, rePrivateMethod], text);
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

module.exports = { applyTheme, PythonSyntaxHighlighter };
