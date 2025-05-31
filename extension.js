const vscode = require("vscode");

const diagnosticCollection =
  vscode.languages.createDiagnosticCollection("python");

const {
  checkForLoopVariableConflict,
  checkImportVsLocalClassConflict,
  checkMissingSuperInit,
} = require("./JS/diagnosticsPython.js");

const {
  ColorPicker,
  forceRefreshColors,
  applyBGColorToText,
} = require("./JS/colorPicker.js");

const { checkPythonEnvironment } = require("./JS/runPython.js");
const { propertyGenerator } = require("./JS/propertyGenerator.js");
const { t, current } = require("./JS/language.js");
const { applyTheme, PythonSyntaxHighlighter } = require("./JS/theme.js");

let enable_CheckForLoopVariableConflict = true;
let enable_CheckImportVsLocalClassConflict = true;
let enable_CheckMissingSuperInit = true;
let enable_ColorPicker = true;

async function checkPythonCode(document) {
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

  if (enable_CheckImportVsLocalClassConflict) {
    const r = await checkImportVsLocalClassConflict(document);
    results.push(...r);
  }

  if (enable_CheckMissingSuperInit) {
    const r = await checkMissingSuperInit(document);
    results.push(...r);
  }

  diagnosticCollection.set(document.uri, results);
}
async function activate(context) {
  if (!(await checkPythonEnvironment())) return;
  const pyHighlighter = new PythonSyntaxHighlighter();

  current.language = vscode.env.language;

  // 读取settings.json中的配置，如果无配置则使用package.json中的默认配置
  const c = vscode.workspace.getConfiguration("pycodejojo");
  enable_CheckForLoopVariableConflict = c.get("checkForLoopVariableConflict");
  enable_CheckImportVsLocalClassConflict = c.get(
    "checkImportVsLocalClassConflict"
  );
  enable_CheckMissingSuperInit = c.get("checkMissingSuperInit");
  enable_ColorPicker = c.get("enableColorPicker");

  if (enable_ColorPicker) {
    context.subscriptions.push(
      // vscode.languages.registerColorProvider("*", new ColorPicker())
    );
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      const config = vscode.workspace.getConfiguration("pycodejojo");
      const map = {
        "pycodejojo.theme": async () => {
          try {
            await applyTheme(config.get("theme"));
          } catch (error) {
            console.error(error);
          }
        },
        "pycodejojo.checkForLoopVariableConflict": () => {
          enable_CheckForLoopVariableConflict = config.get(
            "checkForLoopVariableConflict"
          );
        },
        "pycodejojo.checkImportVsLocalClassConflict": () => {
          enable_CheckImportVsLocalClassConflict = config.get(
            "checkImportVsLocalClassConflict"
          );
        },
        "pycodejojo.checkMissingSuperInit": () => {
          enable_CheckMissingSuperInit = config.get("checkMissingSuperInit");
        },
        "pycodejojo.enableColorPicker": () => {
          enable_ColorPicker = config.get("enableColorPicker");
          current.language = config.get("language");
          // 提示用户重启
          vscode.window
            .showInformationMessage(
              t("enableColorPicker.restartExtension"),
              "Restart Extension"
            )
            .then((selection) => {
              if (selection === "Restart Extension") {
                vscode.commands.executeCommand(
                  "workbench.action.restartExtensionHost"
                );
              }
            });
        },
        "pycodejojo.language": () => {
          current.language = config.get("language");
          vscode.window.showInformationMessage(t("language.changed"));
        },
      };

      Object.keys(map).forEach((key) => {
        if (event.affectsConfiguration(key)) {
          map[key]();
          return;
        }
      });
    }),

    vscode.languages.registerCodeActionsProvider("python", {
      provideCodeActions(document, range, context) {
        const actions = [];
        // 1. 选区非空时，添加自定义操作
        if (!range.isEmpty) {
          const action = new vscode.CodeAction(
            "Convert Private Attribute to Property",
            vscode.CodeActionKind.QuickFix
          );
          action.command = {
            title: "Property Generator",
            command: "pycodejojo.propertyGenerator",
            arguments: [document, range],
          };
          actions.push(action);
        }
        // 2. 诊断修复项
        for (const diag of context.diagnostics) {
          if (diag.code === "need super().__init__()") {
            const fix = new vscode.CodeAction(
              "add super().__init__()",
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
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === "python")
        pyHighlighter.update(editor);
    }),

    vscode.workspace.onDidChangeTextDocument((event) => {
      checkPythonCode(event.document);
      const editor = vscode.window.activeTextEditor;
      if (
        editor &&
        event.document === editor.document &&
        editor.document.languageId === "python"
      ) {
        clearTimeout(pyHighlighter.updateTimeout);
        pyHighlighter.updateTimeout = setTimeout(() => {
          pyHighlighter.update(editor);
        }, 150);
      }
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
        pyHighlighter.update(editor);
      }
    })
  );

  // 注册命令
  const commandMap = {
    "pycodejojo.propertyGenerator": (document, range) => {
      propertyGenerator(document, range);
    },
    "pycodejojo.applyRandomTheme": async () => {
      await applyTheme("PyCodeJOJO Random");
    },
    "pycodejojo.applyDarkTheme": async () => {
      await applyTheme("PyCodeJOJO Dark");
    },
    "pycodejojo.applyDark2Theme": async () => {
      await applyTheme("PyCodeJOJO Dark2");
    },
    "pycodejojo.disableTheme": async () => {
      await applyTheme("Disabled");
    },
  };

  Object.entries(commandMap).forEach(([command, callback]) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, callback)
    );
  });

  if (vscode.window.activeTextEditor) {
    const document = vscode.window.activeTextEditor.document;
    checkPythonCode(document);
    applyBGColorToText(document);
  }
}

module.exports = {
  activate,
  deactivate: () => {},
};
