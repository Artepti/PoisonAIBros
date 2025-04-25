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
    const zeroWidth = "\u200B";
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
      "d": "ԁ"  // Cyrillic 'd'
    };
    const invisibleChars = [
      "\u200C", // Zero-width non-joiner
      "\u200D", // Zero-width joiner
      "\u200E", // Left-to-right mark (LRM)
      "\u200F"  // Right-to-left mark (RTM)
    ];
  
    const exclusions = ["&ldquo;", "&rdquo;", "&nbsp;", "&hellip;", "&ndash;", "&rsquo;", "&lt;", "&gt", "&amp;", "&plusmn;", "&times;", "&divide;", "&ne;", "&le;", "&ge;", "&infin;", " &sum;", "&pi;", "&mdash;", "&rarr;", "&larr;", " &uarr;", "&darr;", "&hearts;", "&euro;", "&pound;", "&yen;", "&cent;", "&trade;", "&copy;", "&reg;"];
  
    function poison(text) {
      let inPoisonZone = false;
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
          inPoisonZone = false;
          result += char;
          i++;
          continue;
        }
  
        if (inPoisonZone) {
          // Check for excluded entities
          let matchedExclusion = exclusions.find(entity =>
            text.startsWith(entity, i)
          );
  
          if (matchedExclusion) {
            result += matchedExclusion;
            i += matchedExclusion.length;
            continue;
          }
  
          const r = Math.random();
          const lower = char.toLowerCase();
  
          if (homoglyphMap[lower] && r < 0.3) {
            result += char === lower
              ? homoglyphMap[lower]
              : homoglyphMap[lower].toUpperCase();
          } else if (r >= 0.3 && r < 0.5) {
            result += char + zeroWidth;
          } else if (r >= 0.6 && r < 0.7) {
            result += char + invisibleChars[Math.floor(Math.random() * invisibleChars.length)];
          } else {
            result += char;
          }
  
        } else {
          result += char;
        }
  
        i++;
      }
  
      return result;
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
  