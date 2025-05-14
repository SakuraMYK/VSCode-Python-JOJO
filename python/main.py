import sys
import json
import argparse

from ast_parse import Range
from color_picker import ColorPicker


def main():
    # 设置命令行参数解析
    myTools = argparse.ArgumentParser(description="python代码分析工具")
    myTools.add_argument("--mode", type=str, default="default", help="模式")
    myTools.add_argument("--input_color", type=str, default="default", help="输入颜色")

    # 添加更多参数...
    args = myTools.parse_args()

    # 从标准输入读取代码内容
    data = sys.stdin.buffer.read().decode("utf-8")

    myRange = Range(data)

    # 根据命令行参数执行不同的分析
    if args.mode == "get_classes_without_parent_init_call":
        result = myRange.get_classes_without_parent_init_call()
    elif args.mode == "get_modules_with_name_conflicts":
        result = myRange.get_modules_with_name_conflicts()
    elif args.mode == "color_picker":
        picker = ColorPicker(init_color=args.input_color)
        result = picker.get_result()
    else:
        result = [None]

    # 输出结果
    print(json.dumps(result))


if __name__ == "__main__":
    main()
  