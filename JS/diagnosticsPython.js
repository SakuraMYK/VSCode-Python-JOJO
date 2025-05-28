const vscode = require("vscode");
const { getPythonScriptResult } = require("./runPython.js");
const { t } = require("./language.js");

function checkForLoopVariableConflict(document) {
  const text = document.getText();
  // 正则表达式匹配 for 循环的循环变量和迭代对象
  const re = /for\s+([0-9a-zA-Z_]+)\s+in\s+([0-9a-zA-Z_]+):/g;
  const match = re.exec(text);
  const diagnostics = [];
  if (match) {
    const variable = match[1]; // 循环变量
    const iterable = match[2]; // 迭代对象
    const all = match[0]; // 完整的匹配字符串
    if (variable === iterable) {
      // 如果循环变量与迭代对象重名，创建诊断信息
      const start1 = match.index + all.indexOf(variable);
      const end1 = start1 + variable.length;

      const start2 = match.index + all.lastIndexOf(iterable);
      const end2 = start2 + iterable.length;

      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(
          document.positionAt(start1),
          document.positionAt(end1)
        ),
        t("checkForLoopVariableConflict.variableConflict"),
        vscode.DiagnosticSeverity.Warning
      );
      const diagnostic2 = new vscode.Diagnostic(
        new vscode.Range(
          document.positionAt(start2),
          document.positionAt(end2)
        ),
        t("checkForLoopVariableConflict.variableConflict"),
        vscode.DiagnosticSeverity.Warning
      );
      diagnostics.push(diagnostic, diagnostic2); // 添加诊断信息
    }
  }
  return diagnostics;
}

async function checkImportVsLocalClassConflict(document) {
  const ranges = await getPythonScriptResult(
    document,
    "get_modules_with_name_conflicts"
  );
  if (!ranges) return [];

  const diagnostics = [];
  for (const item of ranges) {
    const d_class = new vscode.Diagnostic(
      new vscode.Range(
        document.positionAt(item.class[0]),
        document.positionAt(item.class[1])
      ),
      t("checkImportVsLocalClassConflict.importConflict"),
      vscode.DiagnosticSeverity.Warning
    );
    const d_import = new vscode.Diagnostic(
      new vscode.Range(
        document.positionAt(item.import[0]),
        document.positionAt(item.import[1])
      ),
      t("checkImportVsLocalClassConflict.importConflict"),
      vscode.DiagnosticSeverity.Warning
    );
    diagnostics.push(d_class, d_import);
  }
  return diagnostics;
}

async function checkMissingSuperInit(document) {
  const ranges = await getPythonScriptResult(
    document,
    "get_classes_without_parent_init_call"
  );
  if (!ranges) return [];
  const diagnostics = [];
  for (const item of ranges) {
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(
        document.positionAt(item.class[0]),
        document.positionAt(item.class[1])
      ),
      t("checkMissingSuperInit.missingSuperInit"),
      vscode.DiagnosticSeverity.Warning
    );
    diagnostic.code = "need super().__init__()";
    diagnostic.initInsertOffset = item.func[0];
    diagnostics.push(diagnostic);
  }
  return diagnostics;
}

module.exports = {
  checkForLoopVariableConflict,
  checkImportVsLocalClassConflict,
  checkMissingSuperInit,
};
