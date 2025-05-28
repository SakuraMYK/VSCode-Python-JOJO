/**
 * @file runPython.js
 * @description 提供与 Python 脚本交互的功能
 */

const vscode = require("vscode");
const { spawn } = require("child_process");
const path = require("path");
const { t } = require("./language.js");

/**
 * Python 脚本文件路径
 * @type {string}
 */
const pyFile = path.join(__dirname, "..", "python", "main.py");

/**
 * 获取 Python 脚本执行结果
 * @param {vscode.TextDocument} document - 当前打开的文档
 * @param {string} [options="get_classes_without_parent_init_call"] - 执行模式选项
 * @returns {Promise<Array>} - Python 脚本执行结果的 Promise
 */
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
        vscode.window.showErrorMessage(stderr);
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

/**
 * 检查 Python 环境是否可用
 * @returns {Promise<boolean>} - Python 环境是否可用的 Promise
 */
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
          t("checkPythonEnvironment.needPythonEnvironment")
        );
        resolve(false);
      } else {
        vscode.window.showInformationMessage(
          t("checkPythonEnvironment.pluginEnabled"),
          stdout
        );
        resolve(true);
      }
    });
  });
}

module.exports = { getPythonScriptResult, checkPythonEnvironment };
