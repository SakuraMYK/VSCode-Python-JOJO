# PyCodeJOJO

一个简洁实用的 VS Code Python 开发扩展，提供代码诊断、颜色选择器、属性生成器等辅助功能，帮助提升 Python 开发体验。

A simple and practical VS Code Python development extension that provides code diagnostics, color picker, property generator and other helpful features to enhance your Python development experience.

## ✨ 主要特性 / Main Features

### 🎨 智能颜色选择器 / Smart Color Picker

- 支持多种颜色格式：`rgb()`, `rgba()`, `#hex`, `(r,g,b)`, `(r,g,b,a)`
- Support multiple color formats: `rgb()`, `rgba()`, `#hex`, `(r,g,b)`, `(r,g,b,a)`
- 实时颜色预览和编辑
- Real-time color preview and editing
- 自动检测代码中的颜色值
- Automatically detect color values in code

### 🔍 代码诊断功能 / Code Diagnostics

- **循环变量冲突检测**：检测 `for` 循环中变量名与迭代对象重名的问题
- **Loop Variable Conflict Detection**: Detect variable name conflicts with iteration objects in `for` loops
- **导入冲突检测**：检测本地类与导入模块的命名冲突
- **Import Conflict Detection**: Detect naming conflicts between local classes and imported modules
- **缺失 super().**init**() 检测**：检测继承类中缺少父类初始化调用
- **Missing super().**init**() Detection**: Detect missing parent class initialization calls in inheritance classes

### ⚡ 属性生成器 / Property Generator

- 自动为私有属性生成 `@property` 装饰器
- Automatically generate `@property` decorators for private attributes
- 智能检测已存在的属性方法，避免重复生成
- Intelligently detect existing property methods to avoid duplicate generation
- 支持 getter 和 setter 方法自动生成
- Support automatic generation of getter and setter methods

### 🎭 主题支持 / Theme Support

- 内置 PyCodeJOJO Dark 主题
- Built-in PyCodeJOJO Dark theme
- 支持主题动态切换
- Support dynamic theme switching

### ⚙️ 设置功能开关 / Settings Toggle

> **提示 / Tip**: 用户可以通过 VS Code 的设置界面 (`Ctrl+,`) 开启或关闭扩展中的对应功能。
>
> Users can enable or disable corresponding features in the extension through VS Code's settings interface (`Ctrl+,`).

## 📋 前置条件 / Prerequisites

- **Python**: 系统需要安装 Python 环境（用于代码分析功能）
- **Python**: Python environment must be installed on the system (for code analysis features)

## 🚀 安装使用 / Installation & Usage

### 从 VS Code 插件市场安装 / Install from VS Code Marketplace

1. 进入扩展面板 (`Ctrl+Shift+X`)
   Open the Extensions panel (`Ctrl+Shift+X`)
2. 搜索 "PyCodeJOJO"
   Search for "PyCodeJOJO"
3. 点击安装
   Click Install

### 手动安装 / Manual Installation

1. 下载 `.vsix` 文件
   Download the `.vsix` file
2. 在 VS Code 中使用 `Extensions: Install from VSIX` 命令安装
   Install using the `Extensions: Install from VSIX` command in VS Code

## 🎯 使用示例 / Usage Examples

### 颜色选择器 / Color Picker

```python
# 支持的颜色格式 / Supported color formats
color1 = (255, 0, 0)              # RGB 元组 / RGB tuple
color2 = (255, 0, 0, 234)         # RGBA 元组 / RGBA tuple
color3 = (255, 0, 0, 0.5)         # RGBA 元组 / RGBA tuple
color4 = rgb(255, 0, 0)           # RGB 函数 / RGB function
color5 = rgba(255, 0, 0, 0.8)     # RGBA 函数 / RGBA function
color6 = rgba(255, 0, 0, 229)     # RGBA 函数 / RGBA function
color7 = #FF0000                  # 十六进制 / Hexadecimal
```

### 属性生成器 / Property Generator

```python
class MyClass:
    def __init__(self):
        self._name = "example"  # 选中此行，使用属性生成器
                               # Select this line and use property generator
        self._value = 42

    # 自动生成的属性方法将插入到这里
    # Auto-generated property methods will be inserted here
```

### 代码诊断示例 / Code Diagnostics Examples

```python
# 循环变量冲突检测 / Loop variable conflict detection
items = [1, 2, 3]
for items in items:  # ⚠️ 警告：变量名冲突 / Warning: Variable name conflict
    print(items)

# 导入冲突检测 / Import conflict detection
from math import pi
class pi:  # ⚠️ 警告：与导入模块冲突 / Warning: Conflicts with imported module
    pass

# 缺失 super().__init__() 检测 / Missing super().__init__() detection
class Parent:
    def __init__(self):
        pass

class Child(Parent):
    def __init__(self):  # ⚠️ 警告：缺少 super().__init__() / Warning: Missing super().__init__()
        self.value = 1
```

## 🌐 多语言支持 / Multi-language Support

- 🇺🇸 English
- 🇨🇳 简体中文 / Simplified Chinese

## 🐛 问题反馈 / Issue Reporting

欢迎提交 Issue 和 Pull Request！
Welcome to submit Issues and Pull Requests!

## 📝 更新日志 / Changelog

查看 [CHANGELOG.md](CHANGELOG.md) 了解详细的版本更新信息。
See [CHANGELOG.md](CHANGELOG.md) for detailed version update information.
