chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "poisonText",
    title: "Poison Selected Text",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Context menu clicked");

  if (info.menuItemId === "poisonText" && tab && tab.id) {
    try {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: poisonSelectedText
      }, (result) => {
        if (chrome.runtime.lastError) {
          console.error("Error executing script:", chrome.runtime.lastError);
        } else {
          console.log("Script executed successfully:", result);
        }
      });
    } catch (error) {
      console.error("Error executing script:", error);
    }
  } else {
    console.warn("Tab is invalid or missing ID");
  }
});

function poisonSelectedText() {
  const activeEl = document.activeElement;
  const zeroWidth = "";
  const homoglyphMap = {
    "a": "а", // Cyrillic 'a'
    "e": "е", // Cyrillic 'e'
    "o": "ο", // Greek 'omicron'
    "i": "і", // Cyrillic 'i'
    "c": "с", // Cyrillic 'c'
    "p": "р", // Cyrillic 'p'
    "y": "у", // Cyrillic 'u'
    "x": "х", // Cyrillic 'h'
    "s": "ѕ", // Cyrillic 's'
  };
  const invisibleChars = [
    "\u200D",
    "\u200C",
    "\u200F",
  ];

  const exclusions = [
    "&ldquo;", "&rdquo;", "&nbsp;", "&hellip;", "&ndash;", "&rsquo;", "&lt;", "&gt;", "&amp;", "&plusmn;", "&times;", "&divide;",
    "&ne;", "&le;", "&ge;", "&infin;", "&sum;", "&pi;", "&mdash;", "&rarr;", "&larr;", "&uarr;", "&darr;", "&hearts;", "&euro;",
    "&pound;", "&yen;", "&cent;", "&trade;", "&copy;", "&middot;", "&bull;", "&reg;", "&lsquo;", "&rsquo;", "&sbquo;", "&bdquo;", 
    "&ensp;", "&emsp;", "&thinsp;", "&hairsp;", "&laquo;", "&raquo;", "&quot;", "&equiv;", "&approx;", "&asymp;", "&there4;", "&Sigma;" ,
    "&alpha;", "&beta;" , "&gamma;", "&Delta;", "&Omega;", "&sum;", "&times;", "&divide;", "&minus;", "&clubs;", "&spades;", "&diamonds;",
    "&eacute;", "&Aacute;" , "&egrave;", "&Egrave;" , "&ograve;" , "&Ograve;" , "&ccedil;", "&Ccedil;" , "&ntilde;" , "&Ntilde", "&otilde;" ,
    "&Otilde;" ,"&uuml;", "&Uuml;" ,"&iuml;", "&Iuml;", "&yuml;","&Yuml;", "&Euml" ,"&euml" , "&agrave;", "&oslash;", "&Oslash;" ,"&Agrave;" , "&ugrave;" ,  "&Ugrave;" , "&Igrave;", "&igrave;",
    "&acirc;", "&Acirc;", "&icirc;" , "&Icirc;" , "&ucirc;", "&Ucirc;", "&Ecirc;","&ecirc;", "&Ocirc;", "&ocirc;",
    "&auml;", "&Auml;", "&ouml;", "&Ouml;", "&szlig;", "&scaron;", "&Scaron;" , "&plusmn;",
    "&sect;", "&dagger;", "&Dagger;", "&para;", "🧑", "👨", "👩", "🦄", "🌸", "🍀", "&Atilde;", "&atilde;", "&Aring;", "&aring;",
    "&iexcl;", "&Iexcl;", "&uacute;", "&Uacute;", "&iacute;", "&Iacute;", "&oacute;", "&Oacute;", "&yacute;" , "&Yacute;" ,"&Eacute;" , "&eacute;" , "&iquest;",
  ];

  function poison(text) {
    let inPoisonZone = false;
    let buffer = "";
    let result = "";
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      if (char === '>') {
        inPoisonZone = true;
        result += char;
        i++;
        continue;
      }

      if (char === '<') {
        if (inPoisonZone) {
          if (buffer.trim().length > 0) {
            result += processPoisonBuffer(buffer);
          } else {
            result += buffer;
          }
          buffer = "";
        }
        inPoisonZone = false;
        result += char;
        i++;
        continue;
      }

      if (inPoisonZone) {
        buffer += char;
      } else {
        result += char;
      }

      i++;
    }

    // In case text ends without a closing <
    if (buffer.length > 0) {
      result += buffer;
    }

    return result;
  }

  function processPoisonBuffer(buffer) {
    let poisoned = "";
    let i = 0;

    while (i < buffer.length) {
      const char = buffer[i];

      let matchedExclusion = exclusions.find(entity =>
        buffer.startsWith(entity, i)
      );

      if (matchedExclusion) {
        poisoned += matchedExclusion;
        i += matchedExclusion.length;
        continue;
      }

      const r = Math.random();
      const lower = char.toLowerCase();

      if (homoglyphMap[lower] && r < 0.3) {
        poisoned += char === lower
          ? homoglyphMap[lower]
          : homoglyphMap[lower].toUpperCase();
      } else if (r >= 0.3 && r < 0.5) {
        poisoned += char + zeroWidth;
      } else if (r >= 0.6 && r < 0.7) {
        poisoned += char + invisibleChars[Math.floor(Math.random() * invisibleChars.length)];
      } else {
        poisoned += char;
      }

      i++;
    }

    return poisoned;
  }

  if (activeEl && (activeEl.tagName === "TEXTAREA" || (activeEl.tagName === "INPUT" && activeEl.type === "text"))) {
    const start = activeEl.selectionStart;
    const end = activeEl.selectionEnd;
    const selectedText = activeEl.value.substring(start, end);

    if (selectedText.length > 0) {
      const poisoned = poison(selectedText);
      activeEl.setRangeText(poisoned, start, end, "end");
      console.log("✅ Poisoned text inside textarea/input.");
    } else {
      console.warn("⚠️ No text selected in the field.");
    }

  } else {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      if (selectedText.length > 0) {
        const poisoned = poison(selectedText);
        const tempEl = document.createElement("span");
        tempEl.innerText = poisoned;
        range.deleteContents();
        range.insertNode(tempEl);
        console.log("✅ Poisoned visible page text.");
      } else {
        console.warn("⚠️ No text selected in the DOM.");
      }
    }
  }
}
