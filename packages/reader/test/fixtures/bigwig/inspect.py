#!/usr/bin/env python3
"""Inspect converter-written zoom records without using reader package code."""

import struct
import sys
import zlib
from pathlib import Path

BIGWIG_MAGIC = 0x888FFC26
HEADER = struct.Struct("<IHHQQQHHQQIQ")
ZOOM_HEADER = struct.Struct("<IIQQ")
ZOOM_RECORD = struct.Struct("<IIIIffff")


def decode_zoom_payload(encoded: bytes, compressed: bool) -> bytes:
    if not compressed:
        return encoded

    decoded = bytearray()
    while encoded:
        inflater = zlib.decompressobj()
        decoded.extend(inflater.decompress(encoded))
        decoded.extend(inflater.flush())
        if not inflater.eof:
            raise ValueError("truncated zlib stream")
        encoded = inflater.unused_data
    return bytes(decoded)


def main() -> None:
    if len(sys.argv) not in (3, 4):
        raise SystemExit("usage: inspect.py FILE REDUCTION_LEVEL [RECORD_LIMIT]")

    path = Path(sys.argv[1])
    requested_reduction = int(sys.argv[2])
    record_limit = int(sys.argv[3]) if len(sys.argv) == 4 else None
    contents = path.read_bytes()
    header = HEADER.unpack_from(contents)
    magic, version, zoom_count = header[:3]
    uncompress_buffer_size = header[10]
    if magic != BIGWIG_MAGIC:
        raise ValueError(f"unexpected BigWig magic: 0x{magic:08x}")

    zooms = [
        ZOOM_HEADER.unpack_from(contents, HEADER.size + index * ZOOM_HEADER.size)
        for index in range(zoom_count)
    ]
    selected = next((zoom for zoom in zooms if zoom[0] == requested_reduction), None)
    if selected is None:
        raise ValueError(f"reduction level {requested_reduction} is not present")

    reduction, _reserved, data_offset, index_offset = selected
    record_count = struct.unpack_from("<I", contents, data_offset)[0]
    encoded = contents[data_offset + 4 : index_offset]
    decoded = decode_zoom_payload(encoded, uncompress_buffer_size > 0)
    if len(decoded) != record_count * ZOOM_RECORD.size:
        raise ValueError("zoom data size does not match its declared record count")

    mode = "compressed" if uncompress_buffer_size > 0 else "uncompressed"
    levels = ",".join(str(zoom[0]) for zoom in zooms)
    print(f"file={path.name} version={version} dataBlocks={mode}")
    print(f"zoomLevels={levels}")
    print(f"reduction={reduction} recordCount={record_count}")
    print("chromId\tstart\tend\tvalidCount\tmin\tmax\tsum\tsumSquares\tmean")
    records = struct.iter_unpack(ZOOM_RECORD.format, decoded)
    for index, record in enumerate(records):
        if record_limit is not None and index >= record_limit:
            break
        chrom_id, start, end, valid_count, minimum, maximum, total, sum_squares = record
        mean = total / valid_count
        print(
            f"{chrom_id}\t{start}\t{end}\t{valid_count}\t{minimum!r}\t{maximum!r}"
            f"\t{total!r}\t{sum_squares!r}\t{mean!r}"
        )


if __name__ == "__main__":
    main()
