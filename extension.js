const vscode = require("vscode");

const diagnosticCollection =
  vscode.languages.createDiagnosticCollection("python");

const {
  checkForLoopVariableConflict,
  checkModulesWithNameConflicts,
  checkUninitializedInherited,
} = require("./JS/diagnosticsPython.js");

const { ColorPicker } = require("./JS/colorPicker.js");

const { checkPythonEnvironment } = require("./JS/runPython.js");

const colorPicker = new ColorPicker();

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

async function checkPythonCode(document) {
  if (document.languageId !== "python") {
    return;
  }

  const diagnostics = [];

  const d1 = checkForLoopVariableConflict(document);
  const d2 = await checkModulesWithNameConflicts(document);
  const d3 = await checkUninitializedInherited(document);

  diagnostics.push(...d1, ...d2, ...d3);
  diagnosticCollection.set(document.uri, diagnostics);
}

async function activate(context) {
  if (!(await checkPythonEnvironment())) {
    return;
  }
  context.subscriptions.push(
    vscode.languages.registerColorProvider("python", colorPicker),
    vscode.languages.registerCodeActionsProvider("python", {
      provideCodeActions(document, range, context) {
        const actions = [];
        for (const diag of context.diagnostics) {
          if (diag.code === "need add super().__init__()") {
            const fix = new vscode.CodeAction(
              "插入 super().__init__()",
              vscode.CodeActionKind.QuickFix
            );
            fix.edit = new vscode.WorkspaceEdit();

            let insertPos;
            const textLength = document.getText().length;
            if (
              typeof diag.initInsertOffset === "number" &&
              diag.initInsertOffset < textLength
            ) {
              insertPos = document.positionAt(diag.initInsertOffset);
              insertPos = new vscode.Position(insertPos.line + 1, 0);
            } else {
              insertPos = new vscode.Position(diag.range.start.line + 1, 0);
            }

            fix.edit.insert(
              document.uri,
              insertPos,
              "        super().__init__()\n"
            );
            fix.diagnostics = [diag];
            actions.push(fix);
          }
        }
        return actions;
      },
    }),
    vscode.workspace.onDidOpenTextDocument((doc) => {
      checkPythonCode(doc);
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      checkPythonCode(event.document);
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      diagnosticCollection.delete(doc.uri);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (
        editor &&
        editor.document &&
        editor.document.languageId === "python"
      ) {
        forceRefreshColors(editor.document);
      }
    })
  );

  if (vscode.window.activeTextEditor) {
    checkPythonCode(vscode.window.activeTextEditor.document);
  }
}

module.exports = {
  activate,
  deactivate: () => {},
};
