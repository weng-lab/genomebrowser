# Web app test fixtures

- `tracks.xlsx`: an Excel workbook of tracks for the Add tracks upload test. Its first sheet, Tracks, has a header row, a track whose title is a formula (`="Sig"&"nal"`) with a number, a TRUE, and a date, a blank row, and a second track. A second sheet, Notes, isn't a table of tracks. It was written with openpyxl, then the formula's result, `Signal`, was added to the sheet XML as Excel saves it, since openpyxl saves formulas without results.
