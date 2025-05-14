# python-ex

## 简介

- 本插件旨在帮助开发者检测 Python 代码中的潜在问题，包括 for 循环变量名冲突、模块名称冲突、未调用父类初始化方法、未使用的导入以及颜色值的快速选择。通过实时诊断和快速修复功能，提升代码质量和开发效率。

- This plugin is designed to help developers detect potential issues in Python code, such as for loop variable name conflicts, module name conflicts, missing parent class initialization calls, unused imports, and quick color selection for color values. It provides real-time diagnostics and quick fixes to improve code quality and development efficiency.

## 功能

- **检测 for 循环变量名冲突**  
  检查 for 循环的变量名是否与函数参数名重复，并给出中文警告（波浪线提示）。  
  Detects if the variable name in a for loop conflicts with function parameters and provides a warning (wavy underline).

- **检测模块名称冲突**  
  检测当前文件中是否存在与类同名的模块导入，并给出警告。  
  Checks for module imports that have the same name as a class in the file and provides a warning.

- **检测未调用父类初始化方法**  
  检测类是否未调用父类初始化方法（`super().__init__()`），并提供快速修复选项。  
  Detects if a class does not call the parent class's initialization method (`super().__init__()`) and provides a quick fix option.

- **检测未使用的导入**  
  检测当前文件中是否存在未使用的模块导入，并给出警告。  
  Checks for unused module imports in the file and provides a warning.

- **取色器功能**  
  提供一个内置的取色器工具，支持从屏幕任意位置吸取颜色，并将颜色值插入到代码中。支持以下所有颜色格式：  
  - RGB 格式（例如 `(255, 136, 0)`）  
  - HEX 格式（例如 `#FF8800`）  
  - rgba() 格式（例如 `rgba(255, 136, 0, 1)`）  
  - 带前缀的括号表示法（如 `rgb(255, 136, 0)`）  
  - 无前缀的括号表示法（如 `(255, 136, 0)`）  
  Includes a built-in color picker tool that allows you to pick colors from anywhere on the screen and insert them into your code. Supports all of the following color formats:  
  - RGB format (e.g., `(255, 136, 0)`)
  - HEX format (e.g., `#FF8800`)
  - rgba() format (e.g., `rgba(255, 136, 0, 1)`)
  - Parenthetical notation with prefix (e.g., `rgb(255, 136, 0)`)
  - Parenthetical notation without prefix (e.g., `(255, 136, 0)`)

## 插件仓库描述

欢迎访问 python-ex 插件的官方仓库！本插件专为 Python 开发者设计，旨在通过实时诊断和快速修复功能，帮助开发者检测并解决代码中的潜在问题。插件支持的功能包括：

- 检测 for 循环变量名冲突
- 检测模块名称冲突
- 检测未调用父类初始化方法
- 检测未使用的导入
- 提供内置取色器工具，支持多种颜色格式

本插件致力于提升 Python 开发者的编码效率和代码质量。如果您在使用过程中遇到任何问题或有改进建议，请随时提交 Issue 或 Pull Request。

感谢您对 python-ex 插件的支持！

## 使用方法

- **安装后自动生效**  
  1. 安装插件后，打开包含 Python 代码的文件。
  2. 插件会自动检测代码中的潜在问题，并在编辑器中显示警告信息。
  3. 对于未调用父类初始化方法的问题，插件会提供快速修复选项，点击即可插入 `super().__init__()`。
  4. 对于未使用的导入，插件会提供快速修复选项，点击即可删除未使用的导入。
  5. 要使用取色器功能，请将光标放在现有颜色值上（如 `(255, 136, 0)` 或 `#FF8800`），然后激活插件提供的命令，插件将弹出取色器窗口，支持 RGB、HEX 和 rgba 格式的颜色选取和切换。

- **English Usage Instructions**  
  1. After installing the plugin, open a file containing Python code.
  2. The plugin will automatically detect potential issues in the code and display warning messages in the editor.
  3. For issues where the parent class initialization method is not called, the plugin will provide a quick fix option to insert `super().__init__()`.
  4. For unused imports, the plugin will provide a quick fix option to delete the unused imports.
  5. To use the color picker, place the cursor over an existing color value (e.g., `(255, 136, 0)` or `#FF8800`), then activate the command provided by the plugin. A color picker window will pop up, supporting color picking and switching between RGB, HEX, and rgba formats.

## Requirements

- 本插件依赖 Python 环境，请确保您的系统已安装 Python。如果未安装，插件将无法正常工作。

## Known Issues

- 如果系统未安装 Python，插件将无法正常运行，请确保已安装 Python 并将其添加到系统环境变量中。

## Release Notes

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

- Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux)
- Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux)
- Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets

## For more information

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**