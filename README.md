# 591 租屋筆記

不需建置、無第三方套件的 Chrome Manifest V3 擴充功能。

## 安裝

1. 在 Chrome 網址列輸入 chrome://extensions。
2. 開啟右上角「開發人員模式」。
3. 點「載入未封裝項目」，選取這個資料夾（內含 manifest.json）。
4. 在 Chrome 的擴充功能選單釘選「591 租屋筆記」。
5. 重新整理已開啟的 591 租屋列表。

## 使用方式

- 點擴充功能圖示，輸入物件 ID 或貼上租屋物件網址，選擇「已看過」、「不考慮」或「有興趣」，可加上名稱或備註。
- 同一物件的 ID 與不同追蹤網址會合併為一筆；再次新增會更新狀態與備註。
- 在 591 列表左下角，或擴充功能內的「591 列表顯示」，選擇全部、只看未標記、隱藏不考慮或個別狀態。
- 「我的紀錄」可搜尋、編輯、變更狀態及移除。移除後可按「復原」（關閉視窗後即無法復原）。
- 頁面的工具列可收合；狀態及篩選設定會在已開啟的租屋分頁同步。

支援的輸入格式：
- 21964749（正整數物件 ID，前後空白會自動移除）
- https://rent.591.com.tw/21964749
- https://rent.591.com.tw/rent-detail-21964749.html
- https://www.591.com.tw/rent-detail-21964749.html

網址中的追蹤參數與錨點會移除。不接受列表、出售物件或非 591 網址。分享短網址需先開啟，複製轉址後的租屋物件網址。

## 範圍與隱私

- 僅在 https://rent.591.com.tw/ 頁面執行。支援桌面一般列表與精選推薦。
- 手動設定狀態，不會因為點開物件就自動標記。
- 只篩選網頁已載入的物件，包含動態載入；不會改變網站的搜尋總數或自動補滿每頁物件。
- 同一物件在列表與推薦重複出現時都會套用；工具列筆數計算的是卡片出現次數。
- 資料使用 chrome.storage.local，只在這個 Chrome 使用者設定檔保存，不上傳、不跨裝置同步。解除安裝擴充功能會刪除資料。
- 只要求 storage 權限，沒有遠端程式、追蹤碼、背景爬蟲或第三方服務。
- 非 591 官方工具。591 改版可能需要調整 content.js 的物件選擇器。
- 無法辨識的容器不會被隱藏，避免誤刪頁面內容。地圖模式與行動版尚未驗證。

## 驗證

執行 npm test 與 npm run check，無須 npm install。

2026-09-08 透過真實 591 頁面唯讀檢查，確認一般列表使用 .item > .item-info，精選推薦使用 .recommend-ware。
本機瀏覽器整合測試使用 tests/mock-chrome.js 模擬 Chrome storage API，檢查 popup 與 content script 的同步。尚未在使用者 Chrome 正式載入未封裝擴充功能進行實機驗收。

手動重現：
1. 在專案目錄執行 python3 -m http.server 8765 --bind 127.0.0.1。
2. 開啟 http://127.0.0.1:8765/tests/popup.html 與 http://127.0.0.1:8765/tests/list.html。
3. 新增物件 21964749 為「不考慮」，確認兩張卡片標記。
4. 切換「隱藏不考慮」，確認只剩物件 B。
5. 按「模擬載入更多」，新卡片也應隱藏；切換「全部物件」可恢復。
6. 編輯、移除、復原、重新整理，確認紀錄與標記一致。

測試頁使用獨立 localStorage，不會存取正式擴充功能資料。tests/ 不包含在 content_scripts 中。

Chrome 官方文件：
- [Content scripts](https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
