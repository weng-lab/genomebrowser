# /// script
# requires-python = ">=3.9"
# dependencies = ["openpyxl>=3.1"]
# ///
"""Writes the Add tracks dialog's spreadsheet template and filled-in example.

Run `pnpm web templates`, which runs `uv run scripts/trackTemplates.py` and writes both
workbooks to `public/templates`. Edit the example's tracks, the header notes, and the guide
text below, then run it again and commit the workbooks with this script.

The column names, type names, and values here follow the table reader in
`features/browser/trackTable.ts`. `test/trackTemplates.test.ts` reads both workbooks back
with it, so a column the reader doesn't know fails the tests.
"""

import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

FONT = "Arial"
SETTINGS_FILL = PatternFill("solid", start_color="E8EAED")
METADATA_FILL = PatternFill("solid", start_color="DCE9F7")
# A session holds at most 50 tracks, so only that many track rows get dropdowns and text formatting.
TRACK_ROWS = 50

TYPES = ["BigWig", "BigBed", "Gene (BigGenePred)", "cCRE (BigBed)", "BAM"]
VISIBILITIES = ["dense", "squish", "pack", "full"]
BED_COLUMNS = ["bed3", "bed4", "bed5", "bed6", "bed9"]

# The track's own settings, in columns A to G: header, width, note, dropdown values.
SETTINGS = [
    ("URL", 70, "Required. The file's public URL.", None),
    ("Title", 42, "The track's name. Blank uses the file name.", None),
    ("Type", 20, "Blank picks the type from the file extension. Gene and cCRE files end in .bb or "
     ".bigBed, so choose their type.", TYPES),
    ("Visibility", 12, "dense, squish, pack, or full. Blank uses the type's default display.",
     VISIBILITIES),
    ("Color", 11, "#RRGGBB or R,G,B. Blank uses the type's default color.", None),
    ("BED columns", 14, "BigBed only. Blank reads the columns from the file's header.", BED_COLUMNS),
    ("BAI index URL", 42, "BAM only. Blank uses the BAM URL with .bai added.", None),
]

# What each metadata type ending makes a field hold.
METADATA_TYPES = {
    "text": "text",
    "number": "a number, which sorts as a number",
    "true/false": "TRUE or FALSE",
}

# The note on the template's first empty header, where metadata columns start.
METADATA_START_NOTE = (
    "Add metadata fields from this column on, one column each, such as Assay (text), "
    "Replicate (number), or Treated (true/false)."
)

GUIDE_INTRO = [
    "Put your tracks on the first sheet, Tracks. The browser reads only that sheet and ignores this one.",
    "Row 1 names the columns, and each row below it is one track. Blank rows are skipped.",
    "In Add tracks, upload this file, or a .csv or .tsv export of it, or copy the cells and paste them.",
]

# Column, header, required, what to enter, example. A row with only a column is a section heading.
GUIDE_TABLE = [
    ("Track settings",),
    ("A", "URL", "Yes", "The file's public URL: a BigWig, BigBed, BigGenePred, or BAM file.",
     "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw"),
    ("B", "Title", "No", "The track's name. Blank uses the file name without its extension.",
     "Aggregate DNase, all ENCODE biosamples"),
    ("C", "Type", "No", "BigWig, BigBed, Gene (BigGenePred), cCRE (BigBed), or BAM. UCSC's names, "
     "such as bigGenePred, work too. Blank picks the type from the file extension (.bigWig, .bw, "
     ".bigBed, .bb, .bam). Gene and cCRE files end in .bb or .bigBed, so choose their type.",
     "Gene (BigGenePred)"),
    ("D", "Visibility", "No", "dense, squish, pack, or full. Each type shows the nearest display it "
     "has. Blank uses the type's default.", "full"),
    ("E", "Color", "No", "#RRGGBB or R,G,B. Blank uses the type's default color. cCREs and BAM reads "
     "keep their own colors.", "#06da93"),
    ("F", "BED columns", "No", "BigBed only: bed3, bed4, bed5, bed6, or bed9. Blank reads the columns "
     "from the file's header.", "bed6"),
    ("G", "BAI index URL", "No", "BAM only: the index file's URL. Blank uses the BAM URL with .bai "
     "added.", "Leave blank unless the index is somewhere else."),
    ("Metadata fields",),
    *[
        ("H onward", f"Name ({ending})", "No", f"A metadata field named Name, holding {holds}.", example)
        for (ending, holds), example in zip(
            METADATA_TYPES.items(),
            ["Assay (text): DNase-seq", "Priority (number): 3", "Histone mark (true/false): TRUE"],
        )
    ],
]

GUIDE_NOTES = [
    "Add one column for each metadata field, from column H on. A header without a type ending, "
    "such as Assay, holds text.",
    "Only URL is required. A blank cell uses the browser's default for that track, and leaves a "
    "metadata field off it.",
    "A session holds at most 50 tracks. Uploaded files can be at most 1 MB.",
]

# The example's metadata columns, after the settings: header and width.
EXAMPLE_METADATA = [("Assay (text)", 16), ("Histone mark (true/false)", 24), ("Priority (number)", 17)]
# GRCh38 files the app already uses (features/assemblies/assemblies.ts and the create template's
# default-tracks.json), by header. A missing header leaves its cell blank.
EXAMPLE_TRACKS = [
    {
        "URL": "https://users.wenglab.org/niship/gencodefiles/human.gencode.v50.basic.annotation.bb",
        "Title": "GENCODE 50 basic",
        "Type": "Gene (BigGenePred)",
        "Priority (number)": 1,
    },
    {
        "URL": "https://downloads.wenglab.org/GRCh38-cCREs.DCC.bigBed",
        "Title": "Human cCREs",
        "Type": "cCRE (BigBed)",
        "Visibility": "dense",
        "Priority (number)": 2,
    },
    {
        "URL": "https://downloads.wenglab.org/DNAse_All_ENCODE_MAR20_2024_merged.bw",
        "Title": "Aggregate DNase, all ENCODE biosamples",
        "Visibility": "full",
        "Color": "#06da93",
        "Assay (text)": "DNase-seq",
        "Histone mark (true/false)": False,
        "Priority (number)": 3,
    },
    {
        "URL": "https://downloads.wenglab.org/H3K4me3_All_ENCODE_MAR20_2024_merged.bw",
        "Title": "Aggregate H3K4me3, all ENCODE biosamples",
        "Visibility": "full",
        "Color": "#ff0000",
        "Assay (text)": "ChIP-seq",
        "Histone mark (true/false)": True,
        "Priority (number)": 4,
    },
    {
        "URL": "https://downloads.wenglab.org/H3K27ac_All_ENCODE_MAR20_2024_merged.bw",
        "Title": "Aggregate H3K27ac, all ENCODE biosamples",
        "Visibility": "full",
        "Color": "#ffcd00",
        "Assay (text)": "ChIP-seq",
        "Histone mark (true/false)": True,
        "Priority (number)": 5,
    },
]


def font(bold=False, size=10):
    return Font(name=FONT, size=size, bold=bold)


def metadata_note(header):
    """What a metadata header's type ending, or its lack of one, makes the field hold."""
    for ending, holds in METADATA_TYPES.items():
        if header.endswith(f"({ending})"):
            name = header[: -len(f"({ending})")].strip()
            return f"Metadata field {name}, holding {holds}."
    return f"Metadata field {header}, holding text."


def tracks_sheet(wb, metadata=()):
    ws = wb.active
    ws.title = "Tracks"
    columns = [(header, width, note, SETTINGS_FILL) for header, width, note, _ in SETTINGS]
    columns += [(header, width, metadata_note(header), METADATA_FILL) for header, width in metadata]
    for index, (header, width, note, fill) in enumerate(columns, start=1):
        cell = ws.cell(row=1, column=index, value=header)
        cell.font = font(bold=True)
        cell.fill = fill
        cell.comment = Comment(note, "Genome browser", width=260, height=90)
        ws.column_dimensions[cell.column_letter].width = width
    if not metadata:
        start = ws.cell(row=1, column=len(columns) + 1)
        start.comment = Comment(METADATA_START_NOTE, "Genome browser", width=260, height=90)
    # Text format on the settings, so spreadsheets don't reformat URLs or colors, and the same
    # font in the metadata columns and a few more.
    for row in range(2, TRACK_ROWS + 2):
        for index in range(1, len(columns) + 6):
            cell = ws.cell(row=row, column=index)
            cell.font = font()
            if index <= len(SETTINGS):
                cell.number_format = "@"
    for index, (header, _, _, values) in enumerate(SETTINGS, start=1):
        if not values:
            continue
        letter = ws.cell(row=1, column=index).column_letter
        # A warning, not a refusal: the reader also takes type IDs and UCSC's names.
        validation = DataValidation(
            type="list",
            formula1='"' + ",".join(values) + '"',
            allow_blank=True,
            showErrorMessage=True,
            errorStyle="warning",
            errorTitle=header,
            error="Choose one of: " + ", ".join(values) + ".",
        )
        validation.add(f"{letter}2:{letter}{TRACK_ROWS + 1}")
        ws.add_data_validation(validation)
    ws.freeze_panes = "A2"
    return ws, [header for header, *_ in columns]


def fill_tracks(ws, headers, tracks):
    for row, track in enumerate(tracks, start=2):
        unknown = set(track) - set(headers)
        assert not unknown, f"Example track {row - 1} names columns that aren't headers: {unknown}"
        for header, value in track.items():
            ws.cell(row=row, column=headers.index(header) + 1, value=value).font = font()


def guide_sheet(wb):
    ws = wb.create_sheet("How to fill this in")
    ws.cell(row=1, column=1, value="Adding tracks from a spreadsheet").font = font(bold=True, size=13)
    row = 3
    for line in GUIDE_INTRO:
        ws.cell(row=row, column=1, value=line).font = font()
        row += 1
    row += 1
    for index, values in enumerate(
        [("Column", "Header", "Required", "What to enter", "Example"), *GUIDE_TABLE]
    ):
        heading = len(values) == 1
        for column, value in enumerate(values, start=1):
            cell = ws.cell(row=row, column=column, value=value)
            cell.alignment = Alignment(wrap_text=not heading, vertical="top")
            cell.font = font(bold=index == 0 or heading)
            if index == 0:
                cell.fill = SETTINGS_FILL
        if heading:
            fill = METADATA_FILL if values[0].startswith("Metadata") else SETTINGS_FILL
            for column in range(1, 6):
                ws.cell(row=row, column=column).fill = fill
        row += 1
    row += 1
    for line in GUIDE_NOTES:
        ws.cell(row=row, column=1, value=line).font = font()
        row += 1
    for letter, width in zip("ABCDE", (10, 20, 10, 64, 44)):
        ws.column_dimensions[letter].width = width
    return ws


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent.parent / "public" / "templates"
    out.mkdir(parents=True, exist_ok=True)

    template = Workbook()
    tracks_sheet(template)
    guide_sheet(template)
    template.save(out / "genome-browser-tracks-template.xlsx")

    example = Workbook()
    ws, headers = tracks_sheet(example, EXAMPLE_METADATA)
    fill_tracks(ws, headers, EXAMPLE_TRACKS)
    guide_sheet(example)
    example.save(out / "genome-browser-tracks-example.xlsx")
    print("Wrote", ", ".join(sorted(path.name for path in out.glob("*.xlsx"))), "to", out)


if __name__ == "__main__":
    main()
