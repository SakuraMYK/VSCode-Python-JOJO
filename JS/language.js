const languageMap = require("../Json/languageMap.json");
const current = { language: "en" };

function t(keyPath) {
  const path = keyPath.split(".");
  const func = path[0];
  const key = path[1];
  return languageMap[func][key][current.language];
}

module.exports = { t, current };
