const vscode = require("vscode");

async function applyTheme(themeName) {
  console.error("Applying: ", themeName);
  if (themeName === "Disabled") themeName = "Default Dark+";

  await vscode.workspace
    .getConfiguration()
    .update(
      "workbench.colorTheme",
      themeName,
      vscode.ConfigurationTarget.Global
    );
}

module.exports = { applyTheme };
