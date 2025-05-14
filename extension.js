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
  // 注册颜色提供者
  context.subscriptions.push(
    vscode.languages.registerColorProvider("python", new ColorPicker())
  );

  context.subscriptions.push(
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
    vscode.workspace.onDidChangeTextDocument((doc) => {
      checkPythonCode(doc.document);
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      diagnosticCollection.delete(doc.uri);
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
