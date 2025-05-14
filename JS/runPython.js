const vscode = require("vscode");
const { spawn } = require("child_process");
const path = require("path");
const pyFile = path.join(__dirname, "..", "python", "main.py");

async function getPythonScriptResult(
  document,
  options = "get_classes_without_parent_init_call"
) {
  const args = [pyFile];

  args.push("--mode", options);

  return new Promise((resolve) => {
    const py = spawn("python", args);
    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data) => (stdout += data));
    py.stderr.on("data", (data) => (stderr += data));
    py.on("close", () => {
      if (stderr) {
        vscode.window.showErrorMessage(
          `Python 插件错误: child_process 执行失败 ${stderr}`
        );
      }
      // 修复：如果没有输出则直接返回空数组，避免 JSON.parse 报错
      if (!stdout || !stdout.trim()) {
        resolve([]);
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        console.error(e);
        resolve([]);
      }
    });
    py.stdin.write(document.getText());
    py.stdin.end();
  });
}

function checkPythonEnvironment() {
  return new Promise((resolve) => {
    const py = spawn("python", ["--version"]);
    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (data) => {
      stdout += data;
    });
    py.stderr.on("data", (data) => {
      stderr += data;
    });
    py.on("close", () => {
      if (stderr) {
        vscode.window.showErrorMessage(stderr);
        vscode.window.showErrorMessage(
          "插件需要Python环境，请安装Python并配置环境变量"
        );
        resolve(false);
      } else {
        vscode.window.showInformationMessage(
          "插件 Python-Ex-JOJO 已启用",
          stdout
        );
        resolve(true);
      }
    });
  });
}

module.exports = { getPythonScriptResult, checkPythonEnvironment };
