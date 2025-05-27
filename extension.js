const vscode = require("vscode");

const diagnosticCollection =
  vscode.languages.createDiagnosticCollection("python");

const {
  checkForLoopVariableConflict,
  checkModulesWithNameConflicts,
  checkUninitializedInherited,
} = require("./JS/diagnosticsPython.js");

const { ColorPicker, forceRefreshColors } = require("./JS/colorPicker.js");

const { checkPythonEnvironment } = require("./JS/runPython.js");

const { propertyGenerator } = require("./JS/propertyGenerator.js");

const colorPicker = new ColorPicker();

const config = vscode.workspace.getConfiguration("pycodejojo");

async function checkPythonCode(document) {
  if (document.languageId !== "python") {
    return;
  }
  console.error("Checking Python code: ", document.fileName);
  // 获取 VS Code 的诊断信息
  const diagnostics = vscode.languages.getDiagnostics(document.uri);
  // 检查是否有语法错误（通常 severity 为 0 是 Error）
  const hasSyntaxError = diagnostics.some(
    (diag) => diag.severity === vscode.DiagnosticSeverity.Error
  );

  if (hasSyntaxError) {
    // 有语法错误时不做进一步分析
    diagnosticCollection.set(document.uri, []);
    return;
  }

  const results = [];

  const d1 = checkForLoopVariableConflict(document);
  const d2 = await checkModulesWithNameConflicts(document);
  const d3 = await checkUninitializedInherited(document);

  results.push(...d1, ...d2, ...d3);
  diagnosticCollection.set(document.uri, results);
}

async function activate(context) {
  if (!(await checkPythonEnvironment())) {
    return;
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      console.error("Configuration changed, reloading...", event);
      if (event.affectsConfiguration("pycodejojo.theme")) {
        console.error("get:", config.get("theme"));
      }
    }),

    vscode.languages.registerColorProvider("python", colorPicker),
    vscode.languages.registerCodeActionsProvider("python", {
      provideCodeActions(document, range, context) {
        const actions = [];
        // 1. 选区非空时，添加自定义操作
        if (!range.isEmpty) {
          const makeProperty = new vscode.CodeAction(
            '"_"内部属性生成Property',
            vscode.CodeActionKind.QuickFix
          );
          makeProperty.command = {
            title: "类内部属性生成Property",
            command: "pycodejojo.propertyGenerator",
            arguments: [document, range],
          };
          actions.push(makeProperty);
        }
        // 2. 诊断修复项
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
    }),
    vscode.commands.registerCommand(
      "pycodejojo.propertyGenerator",
      (document, range) => {
        propertyGenerator(document, range);
      }
    )
  );

  if (vscode.window.activeTextEditor) {
    checkPythonCode(vscode.window.activeTextEditor.document);
  }
}

module.exports = {
  activate,
  deactivate: () => {},
};
