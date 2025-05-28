const languageMap = require("../Json/languageMap.json");
const current = { language: "zh-cn" };

function t(keyPath) {
  const path = keyPath.split(".");
  const func = path[0];
  const key = path[1];

  console.error("in T current.language: ", current.language);
  console.error(current.language === "English", current.language === "en");

  if (current.language === "English" || current.language === "en") {
    return languageMap[func][key]["en"];
  } else {
    return languageMap[func][key]["zh-cn"];
  }
}

module.exports = { t, current };
