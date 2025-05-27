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

const { applyTheme } = require("./JS/theme.js");

let enable_CheckForLoopVariableConflict = true;
let enable_CheckModulesWithNameConflicts = true;
let enable_CheckUninitializedInherited = true;
// let config = vscode.workspace.getConfiguration("pycodejojo");

async function checkPythonCode(document) {
  console.error("Checking Python code...");

  if (document.languageId !== "python") {
    return;
  }
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

  if (enable_CheckForLoopVariableConflict)
    results.push(...checkForLoopVariableConflict(document));

  if (enable_CheckModulesWithNameConflicts) {
    const r = await checkModulesWithNameConflicts(document);
    results.push(...r);
  }

  if (enable_CheckUninitializedInherited) {
    const r = await checkUninitializedInherited(document);
    results.push(...r);
  }

  diagnosticCollection.set(document.uri, results);
}
async function activate(context) {
  try {
    console.error("Python environment is ready.");
  } catch (error) {
    console.error("Failed to check Python environment:", error);
    vscode.window.showErrorMessage(
      "Python环境检查失败，请检查Python环境是否正确安装。"
    );
    return;
  }
  if (!(await checkPythonEnvironment())) {
    return;
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      const config = vscode.workspace.getConfiguration("pycodejojo");
      const map = {
        "pycodejojo.theme": () => {
          applyTheme(config.get("theme"));
        },
        "pycodejojo.checkForLoopVariables": () => {
          enable_CheckForLoopVariableConflict = config.get(
            "checkForLoopVariables"
          );
          console.error(
            "checkForLoopVariables: ",
            enable_CheckForLoopVariableConflict
          );
        },
        "pycodejojo.checkModuleNameConflicts": () => {
          enable_CheckModulesWithNameConflicts = config.get(
            "checkModuleNameConflicts"
          );
        },
        "pycodejojo.checkUninitializedInherited": () => {
          enable_CheckUninitializedInherited = config.get(
            "checkUninitializedInherited"
          );
        },
        "pycodejojo.enablePropertyGenerator": () => {
          enable_CheckUninitializedInherited = config.get(
            "enablePropertyGenerator"
          );
        },
      };

      Object.keys(map).forEach((key) => {
        if (event.affectsConfiguration(key)) {
          map[key]();
          return;
        }
      });
    }),

    vscode.languages.registerColorProvider("python", colorPicker),
    vscode.languages.registerCodeActionsProvider("python", {
      provideCodeActions(document, range, context) {
        const actions = [];
        // 1. 选区非空时，添加自定义操作
        if (!range.isEmpty) {
          const action = new vscode.CodeAction(
            '"_"内部属性生成Property',
            vscode.CodeActionKind.QuickFix
          );
          action.command = {
            title: "类内部属性生成Property",
            command: "pycodejojo.enablePropertyGenerator",
            arguments: [document, range],
          };
          actions.push(action);
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
