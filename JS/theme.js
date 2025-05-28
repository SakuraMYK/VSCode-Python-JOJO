const vscode = require("vscode");

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
    });
  }

  update(editor) {
    const rePrivateVar = /(self\s*\.\s*)(_\w+)/g;
    const rePrivateMethod = /(def\s+)(_(?!_)\w+)/g;
    const reMagicMethod = /(def\s+)(__\w+__)/g;
    const reImportName =
      /(import\s+)([\.\w]+)\s*(?!as)/g;

    const text = editor.document.getText();

    // this._setDecorations(editor, text, rePrivateVar, this.privateVarStyle);
    // this._setDecorations(
    //   editor,
    //   text,
    //   rePrivateMethod,
    //   this.privateMethodStyle
    // );
    // this._setDecorations(editor, text, reMagicMethod, this.magicMethodStyle);
    this._setDecorations(editor, text, reImportName, this.importNameStyle);
  }

  _setDecorations(editor, text, regex, style) {
    const decorations = [];
    let match;
    console.error(`regex: ${regex}`);

    while ((match = regex.exec(text)) !== null) {
      const start = match.index + match[1].length;
      const end = start + match[2].length;
      console.error(`match: ${match[2]}`);
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
