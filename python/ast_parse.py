import ast
import re


class Range:
    """
    解析 Python 源代码，提取类、导入模块等信息，并提供相关诊断功能。
    """

    def __init__(self, text: str):
        """
        初始化 Range 对象，解析输入的 Python 源代码。

        :param text: Python 源代码字符串
        """
        self._text: str = text
        self._tree: ast.AST = None

        self._classes_range_map: dict[str, tuple[int, int]] = {}
        self._imports_range_map: dict[str, tuple[int, int]] = {}

        try:
            self._tree = ast.parse(text)
        except SyntaxError as e:
            ...

    def get_classes_without_parent_init_call(self) -> list[dict[str, tuple[int, int]]]:
        """
        获取未调用父类初始化方法的类及其构造函数范围。

        :return: 包含类和构造函数范围的列表
        """
        if self._tree is None:
            return []

        ranges = []
        for node in ast.walk(self._tree):  # 遍历 AST 节点
            if isinstance(node, ast.ClassDef):
                if node.bases:
                    # 遍历类中的所有函数
                    for func in node.body:
                        s = self.index_of_text(func.lineno, func.col_offset)
                        e = self.index_of_text(func.end_lineno, func.end_col_offset)
                        if (
                            isinstance(func, ast.FunctionDef)
                            and func.name == "__init__"
                        ):
                            # 检查是否调用了父类初始化方法
                            if re.search(
                                r"super\s*\(\s*\)\s*\.\s*__init__\s*\(.*?\)",
                                self._text[s:e],
                            ):
                                break
                            else:
                                class_idx_start = self.index_of_text(
                                    node.lineno, node.col_offset
                                )
                                func_idx_start = self.index_of_text(
                                    func.lineno, func.col_offset
                                )

                                class_s = self._text.find(node.name, class_idx_start)
                                class_e = class_s + len(node.name)

                                func_s = self._text.find(func.name, func_idx_start)
                                func_e = func_s + len(func.name)

                                ranges.append(
                                    {
                                        "class": (class_s, class_e),
                                        "func": (func_s, func_e),
                                    }
                                )
                                break
        return ranges

    def get_modules_with_name_conflicts(self) -> list[dict[str, tuple[int, int]]]:
        """
        获取类名与导入模块名冲突的范围。

        :return: 包含类和导入模块范围的列表
        """
        if self._tree is None:
            return []
        self._get_classes_name_and_range()
        self._get_imports_name_and_range()
        return [
            {
                "class": self._classes_range_map[name],
                "import": self._imports_range_map[name],
            }
            for name in self._imports_range_map
            if name in self._classes_range_map
        ]

    def _get_classes_name_and_range(self):
        """
        提取类名及其在源代码中的范围。
        """
        for node in ast.walk(self._tree):  # 遍历 AST 节点
            if isinstance(node, ast.ClassDef):
                line_start = self.index_of_text(node.lineno, node.col_offset)
                s = self._text.find(node.name, line_start)
                e = s + len(node.name)
                self._classes_range_map[node.name] = (s, e)

    def _get_imports_name_and_range(self):
        """
        提取导入模块名及其在源代码中的范围。
        """
        for node in ast.walk(self._tree):  # 遍历 AST 节点
            if isinstance(node, ast.Import):
                for name in node.names:
                    if name.asname:
                        line_start = self.index_of_text(name.lineno, name.col_offset)
                        if exp := re.match(r"(.*?as\s+)\w+", self._text[line_start:]):
                            s = line_start + exp.group(1).__len__()
                        else:
                            s = self._text.find(name.asname, line_start)
                        e = s + len(name.asname)
                        self._imports_range_map[name.asname] = (s, e)
                    else:
                        s = self.index_of_text(name.lineno, name.col_offset)
                        e = s + len(name.name)
                        self._imports_range_map[name.name] = (s, e)
            elif isinstance(node, ast.ImportFrom):
                for name in node.names:
                    if name.asname:
                        line_start = self.index_of_text(name.lineno, name.col_offset)
                        if exp := re.match(r"(.*?as\s+)\w+", self._text[line_start:]):
                            s = line_start + exp.group(1).__len__()
                        else:
                            s = self._text.find(name.asname, line_start)
                        e = s + len(name.asname)
                        self._imports_range_map[name.asname] = (s, e)
                    else:
                        if name.name != "*":
                            s = self.index_of_text(name.lineno, name.col_offset)
                            e = s + len(name.name)
                            self._imports_range_map[name.name] = (s, e)

    def index_of_text(self, lineno: int, col_offset: int) -> int:
        """
        根据行号和列偏移计算字符索引。

        :param lineno: 行号
        :param col_offset: 列偏移
        :return: 字符索引
        """
        lines = self._text.splitlines(keepends=True)
        index = 0
        for i in range(lineno - 1):  # 行号从 1 开始
            index += len(lines[i])
        index += col_offset
        return index


if __name__ == "__main__":
    py = "f:/下载/main.py"
    py = "f:/下载/dropdown.py"
    py = "F:\下载\dropdown copy.py"
    with open(py, "r", encoding="utf-8") as f:
        text = f.read()

    rg = Range(text)
    # print(rg.get_classes())
    # print(rg.get_import_modules())
    print(rg.get_classes_without_parent_init_call())
    # print(rg.get_modules_with_name_conflicts())
