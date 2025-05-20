const vscode = require("vscode");
const fs = require('fs'); // 引入 fs 模块用于文件操作

// 新增函数：读取文件内容
function readFileContent(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8'); // 同步读取文件内容
        return content;
    } catch (error) {
        console.error(`读取文件失败: ${error.message}`);
        return null;
    }
}

// 修改 checkAttributeExistence 函数，添加文件读取功能
function checkAttributeExistence(document) {
    const filePath = 'D:\\python3\\Lib\\site-packages\\pyglet\\shapes.py'; // 文件路径
    const fileContent = readFileContent(filePath); // 读取文件内容

    if (fileContent) {
        console.log('文件内容已读取：');
        console.log(fileContent); // 打印文件内容
        // 这里可以添加对文件内容的进一步处理逻辑
    } else {
        console.log('无法读取文件内容。');
    }
}

// 导出函数，以便在其他模块中使用
module.exports = { checkAttributeExistence };