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

class PrivateHighlight {
  constructor() {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      color: "#8EFA58",
      fontWeight: "bold",
      fontStyle: "italic",
    });
    this.updateTimeout = null;
  }

  update(editor) {
    const text = editor.document.getText();
    const decorations = [];
    const regex = /self\._\w+/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const startPos = editor.document.positionAt(match.index);
      const endPos = editor.document.positionAt(match.index + match[0].length);

      decorations.push({
        range: new vscode.Range(startPos, endPos),
      });
    }

    editor.setDecorations(this.decorationType, decorations);
  }
}

module.exports = { applyTheme, PrivateHighlight };
