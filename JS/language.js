const languageMap = require("../Json/languageMap.json");
const current = { language: "English" };

function t(keyPath) {
  const path = keyPath.split(".");
  const func = path[0];
  const key = path[1];

  if (
    current.language.toLowerCase() === "english" ||
    current.language.toLowerCase() === "en"
  ) {
    return languageMap[func][key]["en"];
  } else {
    return languageMap[func][key]["zh-cn"];
  }
}

module.exports = { t, current };
