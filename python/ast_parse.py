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

        self._classes_range_map = {}
        self._imports_range_map = {}

        try:
            self._tree = ast.parse(text)
            self._add_parent_for_node(self._tree)
        except SyntaxError as e:
            ...

    def _add_parent_for_node(self, node: ast.AST, parent=None) -> None:
        """
        为 AST 节点添加父节点引用。方便直接访问父节点。

        :param node: AST 节点
        """
        node.parent = parent
        for child in ast.iter_child_nodes(node):
            self._add_parent_for_node(child)

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
                                re.DOTALL,
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
        self._scan_class_names_range()
        self._scan_import_names_range()
        return [
            {
                "class": self._classes_range_map[name],
                "import": self._imports_range_map[name],
            }
            for name in self._imports_range_map
            if name in self._classes_range_map
        ]

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

    def get_all_attr(self) -> list[dict]:
        """
        获取文件中所有的属性调用及其调用轨迹，包括所属的类信息。

        :return: 包含属性调用信息的字典列表
        """
        if self._tree is None:
            return []

        attr_calls = []

        def traverse_node(node):
            """递归遍历AST节点，收集属性调用"""
            # 如果是属性访问节点，提取完整的属性路径
            if isinstance(node, ast.Attribute):
                attr_path = self.get_attr(node)
                if attr_path:
                    # 查找该属性所属的类
                    parent_class = self._find_parent_class(node)

                    # 创建包含属性路径和父类信息的字典
                    attr_info = {
                        "path": attr_path,
                        "line": node.lineno,
                        "col": node.col_offset,
                    }

                    if parent_class:
                        attr_info["parent_class"] = parent_class

                    # 避免重复添加
                    if not any(info["path"] == attr_path for info in attr_calls):
                        attr_calls.append(attr_info)

            # 递归处理所有子节点
            for child in ast.iter_child_nodes(node):
                traverse_node(child)

        # 从AST根节点开始遍历
        traverse_node(self._tree)
        return attr_calls

    def get_attr(self, node: ast.AST) -> str:
        """
        递归构建属性访问的完整路径。

        :param node: AST节点
        :return: 属性访问的完整路径字符串
        """
        if isinstance(node, ast.Attribute):
            # 递归获取父属性路径
            parent_attr = self.get_attr(node.value)
            if parent_attr and node.attr != "setter":
                return f"{parent_attr}.{node.attr}"
            else:
                return node.attr
        elif isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Call):
            # 处理函数调用情况
            return self.get_attr(node.func)
        elif isinstance(node, ast.Subscript):
            # 处理下标访问情况，如 obj['key'] 或 arr[0]
            base = self.get_attr(node.value)
            return base if base else ""
        else:
            # 其他类型节点不构成属性路径的一部分
            return ""

    def _find_parent_class(self, node):
        """
        查找一个节点所属的类。

        :param node: AST节点
        :return: 类名或None
        """
        # 从当前节点开始向上查找
        current = node
        while hasattr(current, "parent") and current.parent:
            current = current.parent
            if isinstance(current, ast.ClassDef):
                return current.name

        # 如果通过父节点引用找不到，尝试通过位置关系查找
        for cls_node in ast.walk(self._tree):
            if isinstance(cls_node, ast.ClassDef):
                # 检查节点是否在类定义的范围内
                if cls_node.lineno <= node.lineno and (
                    hasattr(cls_node, "end_lineno")
                    and node.lineno <= cls_node.end_lineno
                ):
                    return cls_node.name

        return None

    def _split_by_dot(self, string: str, start: int) -> list[tuple[int, int]]:
        index_list = []
        for p in string.split("."):
            p_len = len(p)
            index_list.append((start, start + p_len))
            start += p_len + 1
        return index_list

    def _scan_import_names_range(self) -> None:
        # 如果树为空，则返回
        if self._tree is None:
            return
        # 遍历树中的每个节点
        for node in ast.walk(self._tree):
            # 如果节点是导入或导入自节点
            if isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom):
                # 遍历节点中的每个名称
                for n in node.names:
                    name = n.name
                    # 如果名称不是通配符
                    if name != "*":
                        # 获取节点开始和结束的索引
                        node_start = self.index_of_text(node.lineno, node.col_offset)
                        node_end = self.index_of_text(
                            node.end_lineno, node.end_col_offset
                        )
                        # 获取节点中的文本
                        text = self._text[node_start:node_end]
                        # 获取名称开始和结束的索引
                        name_start = node_start + text.find(name)
                        name_end = name_start + len(name)
                        # 如果名称有别名
                        if n.asname:
                            # 如果文本中有别名
                            if exp := re.search(r"(\s+as\s+)(\w+)", text):
                                # 获取别名开始和结束的索引
                                asname_start = name_end + len(exp.group(1))
                                asname_end = asname_start + len(exp.group(2))
                                # 将名称和别名添加到导入范围映射中
                                self._imports_range_map[name] = {
                                    "name": (
                                        self._split_by_dot(name, name_start)
                                        if "." in name
                                        else [(name_start, name_end)]
                                    ),
                                    "asname": (asname_start, asname_end),
                                }
                        # 如果名称没有别名
                        else:
                            self._imports_range_map[name] = {
                                "name": (
                                    self._split_by_dot(name, name_start)
                                    if "." in name
                                    else [(name_start, name_end)]
                                )
                            }

    def _scan_class_names_range(self) -> None:
        """
        提取类名及其在源代码中的范围。
        """
        for node in ast.walk(self._tree):  # 遍历 AST 节点
            if isinstance(node, ast.ClassDef):
                line_start = self.index_of_text(node.lineno, node.col_offset)
                s = self._text.find(node.name, line_start)
                e = s + len(node.name)
                self._classes_range_map[node.name] = (s, e)

    def _scan_from_moudle(self) -> None:
        if self._tree is None:
            return
        # for node in ast.walk(self._tree):

    def get_import_names_range(self) -> dict[str, dict[str, any]]:
        self._scan_import_names_range()
        return self._imports_range_map


if __name__ == "__main__":
    py = "f:/下载/dropdown.py"

    with open(py, "r", encoding="utf-8") as f:
        text = f.read()

    rg = Range(text)

    # attr_calls = rg.get_all_attr()
    # for attr in attr_calls:
    #     parent_class = attr.get("parent_class", "未知")
    #     print(f"属性路径: {attr['path']}, 所属类: {parent_class}, 行号: {attr['line']}")

    rg._scan_import_names_range()
    import pprint

    pprint.pprint(rg._imports_range_map)
    # print(list(rg._split_by_dot("import os.path.join", 0)))
