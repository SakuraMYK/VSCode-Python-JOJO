const vscode = require("vscode");

async function propertyGenerator(document, range) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const classStartLine = getClassStartLine(document, range);
  if (!classStartLine) {
    vscode.window.showErrorMessage("No class found");
    return;
  }

  const classEndLine = getClassEndLine(document, classStartLine);
  const text = document.getText(
    new vscode.Range(classStartLine, 0, classEndLine, 0)
  );

  const selectedText = editor.document.getText(editor.selection);

  const reSelfProperty =
    /\s*self\s*\.\s*_(\w+)\s*[:\w\[\],\.\s]*[=\+\-\*/]+\s*/g;

  const matches = [...selectedText.matchAll(reSelfProperty)];

  if (matches.length === 0) {
    vscode.window.showInformationMessage(
      'Private attribute must start with "_"'
    );
    return;
  }

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
    vscode.window.showInformationMessage("已存在对应property");
    return;
  }

  const insertPosition = new vscode.Position(classEndLine, 0);

  await editor.edit((editBuilder) => {
    editBuilder.insert(insertPosition, pythonCode + "\n");
  });

  // 计算插入代码的结束位置
  const insertedLines = pythonCode.split("\n").length;
  const endPosition = new vscode.Position(
    classEndLine + insertedLines - 1,
    document.lineAt(classEndLine + insertedLines - 1).text.length
  );

  // 创建一个选择区域来高亮显示新插入的代码
  editor.selection = new vscode.Selection(insertPosition, endPosition);

  // 将视图滚动到插入区域
  editor.revealRange(
    new vscode.Range(insertPosition, endPosition),
    vscode.TextEditorRevealType.InCenter
  );

  vscode.window.showInformationMessage("已添加property");
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

module.exports = { propertyGenerator };
