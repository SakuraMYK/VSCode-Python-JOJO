const fs = require("fs"); // 引入 fs 模块用于文件操作
const path = require("path");

function randomThemeFile(filePath = "../themes/radom.json") {
  try {
    const themeJsonFile = path.join(__dirname, filePath);
    const reHexColor = new RegExp(
      /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/g
    );
    const reFontStyle = new RegExp(/"fontStyle"\s*:\s*"(.*)"/g);
    let text = fs.readFileSync(themeJsonFile, "utf-8");

    text = text.replace(reHexColor, () => randomHexColor());
    text = text.replace(reFontStyle, () => randomFontStyle());

    fs.writeFileSync(themeJsonFile, text, "utf-8");
    // console.log(text);
  } catch (error) {
    console.error(error);
  }
}

function randomHexColor() {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

function randomFontStyle(
  weights = { italic: 1, bold: 1, underline: 1, normal: 1 }
) {
  const selectedStyles = [];

  // 遍历每个样式，根据权重决定是否选中
  for (const [style, weight] of Object.entries(weights)) {
    // 跳过 normal，它不是实际的样式
    if (style === "normal") continue;

    // 根据权重计算被选中的概率
    // 权重越高，被选中的概率越大
    const probability = weight / (weight + 5); // 分母加5是为了控制概率范围

    if (Math.random() < probability) {
      selectedStyles.push(style);
    }
  }

  // 返回选中的样式组合，用空格分隔
  // 如果没有选中任何样式，返回空字符串
  return `"fontStyle": "${selectedStyles.join(" ")}"`;
}

// 导出函数，以便在其他模块中使用
module.exports = { randomThemeFile };
