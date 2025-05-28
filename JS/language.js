const languageMap = require("../Json/languageMap.json");

function t(keyPath) {
  const path = keyPath.split(".");
  const func = path[0];
  const key = path[1];
  const language = path[2];
  console.error(languageMap[func][key][language]);
}

module.exports = { t };
