const vscode = require("vscode");

async function makePythonProperty(document, range) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const classStartLine = getClassStartLine(document, range);
  if (!classStartLine) return;
  const classEndLine = getClassEndLine(document, classStartLine);
  const text = document.getText(
    new vscode.Range(classStartLine, 0, classEndLine, 0)
  );

  const selectedText = editor.document.getText(editor.selection);

  const reSelfProperty = /\s*self\s*\.\s*_(\w+)\s*[:\w\[\],\.]*\s*=\s*/g;
  const matches = [...selectedText.matchAll(reSelfProperty)];
  if (matches.length === 0) return;

  let pythonCode = "";

  for (const match of matches) {
    const name = match[1];
    const rePropertyFunc = new RegExp(
      `@\\s*property\\s+def\\s${name}\\s*\\(\\s*self`,
      "gs"
    );
    const rePropertySetterFunc = new RegExp(
      `@\\s*${name}\\s*\\.\\s*setter\\s+def\\s+${name}\\s*\\(\\s*self`,
      "gs"
    );

    if (!text.match(rePropertyFunc)) {
      pythonCode += `
    @property
    def ${name}(self):
        return self._${name}
    `;
    }
    if (!text.match(rePropertySetterFunc)) {
      pythonCode += `
    @${name}.setter
    def ${name}(self, value):
        self._${name} = value
    `;
    }
  }

  if (!pythonCode) {
    vscode.window.showInformationMessage("已存在对应属性");
    return;
  }

  await editor.edit((editBuilder) => {
    editBuilder.insert(new vscode.Position(classEndLine, 0), pythonCode + "\n");
  });
  vscode.window.showInformationMessage("已添加属性");
}

function getClassStartLine(document, range) {
  // 1. 向上查找class定义
  let classLine = range.start.line;
  while (classLine >= 0) {
    const lineText = document.lineAt(classLine).text;
    if (/^\s*class\s+\w+/.test(lineText)) return classLine;
    classLine--;
  }

  if (classLine < 0) return null;
}

function getClassEndLine(document, classStartLine) {
  const classIndent =
    document.lineAt(classStartLine).firstNonWhitespaceCharacterIndex;

  let endLine = classStartLine + 1;
  for (; endLine < document.lineCount; endLine++) {
    const lineText = document.lineAt(endLine).text;
    if (lineText.trim() === "") continue;
    const indent = document.lineAt(endLine).firstNonWhitespaceCharacterIndex;
    if (indent <= classIndent) break;
  }
  return endLine;
}

module.exports = { makePythonProperty };
