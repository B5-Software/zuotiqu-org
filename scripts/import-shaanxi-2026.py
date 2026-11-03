#!/usr/bin/env python3
"""Import Shaanxi 2026 ordinary Physics/History score-rank tables from the official examination office.

Data provenance: https://www.sneea.cn/info/1027/17658.htm
                 https://www.sneea.cn/info/1027/17659.htm
No predictions, synthetic rows, or unofficial interpolations are generated.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

SOURCES = {
    "物理": "https://www.sneea.cn/info/1027/17658.htm",
    "历史": "https://www.sneea.cn/info/1027/17659.htm",
}
DEST = Path("public/data/gaokao/shaanxi/2026-ranks.json")


class RowsParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self.current_row: list[str] | None = None
        self.current_cell: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "tr":
            self.current_row = []
        elif tag in ("th", "td") and self.current_row is not None:
            self.current_cell = []

    def handle_data(self, data: str) -> None:
        if self.current_cell is not None:
            self.current_cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag in ("td", "th") and self.current_cell is not None and self.current_row is not None:
            self.current_row.append(re.sub(r"\\s+", "", "".join(self.current_cell)))
            self.current_cell = None
        elif tag == "tr" and self.current_row is not None:
            if self.current_row:
                self.rows.append(self.current_row)
            self.current_row = None


def download(url: str) -> str:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; ZuoTiQuDataAudit/1.0; +https://xn--cyqx3ed87g.org/)"})
    with urlopen(request, timeout=40) as response:
        raw = response.read()
        header_encoding = response.headers.get_content_charset()
    for encoding in [header_encoding, "utf-8", "gb18030"]:
        if not encoding:
            continue
        try:
            decoded = raw.decode(encoding)
            if "2026年陕西省" in decoded and "分数" in decoded:
                return decoded
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Cannot decode official 2026 table: {url}")


def load_track(subject: str, url: str) -> dict:
    html = download(url)
    if f"2026年陕西省" not in html or subject not in html:
        raise ValueError(f"Unexpected page metadata: {subject}")
    parser = RowsParser()
    parser.feed(html)
    rows: list[dict[str, int]] = []
    top_bucket = None
    bottom_bucket = None

    for parts in parser.rows:
        if len(parts) != 3:
            continue
        score_string, count_string, cumulative_string = parts
        if not count_string.isdigit() or not cumulative_string.isdigit():
            continue
        match = re.match(r"^(\\d{1,3})(.*)$", score_string)
        if not match:
            continue
        score, suffix = int(match.group(1)), match.group(2)
        count, cumulative = int(count_string), int(cumulative_string)
        if suffix in ("及以上", "分及以上"):
            top_bucket = {"scoreAtLeast": score, "count": count, "cumulative": cumulative}
        elif "及以下" in suffix:
            bottom_bucket = {"scoreAtMost": score, "countIncludingAbsent": count, "cumulative": cumulative}
        elif suffix == "" and 0 <= score <= 750:
            rows.append({"score": score, "count": count, "cumulative": cumulative})

    if len(rows) < 400:
        raise ValueError(f"Found only {len(rows)} exact rows for {subject}; aborting import")
    if not top_bucket or not bottom_bucket:
        raise ValueError(f"Missing merged high/low buckets for {subject}")

    previous_score = top_bucket["scoreAtLeast"]
    previous_cumulative = top_bucket["cumulative"]
    for row in rows:
        if row["score"] >= previous_score:
            raise ValueError(f"Score order invalid for {subject}: {row}")
        if row["cumulative"] - previous_cumulative != row["count"]:
            raise ValueError(f"Cumulative difference invalid for {subject}: {row}")
        previous_score = row["score"]
        previous_cumulative = row["cumulative"]
    if previous_cumulative + bottom_bucket["countIncludingAbsent"] != bottom_bucket["cumulative"]:
        raise ValueError(f"Last bucket differs from cumulative total for {subject}")
    for point_score, point_total in ((600,14174),(550,34155)) if subject == "物理" else ((600,1667),(550,5999)):
        found = next((r for r in rows if r["score"] == point_score), None)
        if not found or found["cumulative"] != point_total:
            raise ValueError(f"Official fixed-point cross-check failed {subject} {point_score}: {found}")

    return {
        "source": url,
        "scoreRows": rows,
        "topBucket": top_bucket,
        "bottomBucket": bottom_bucket,
    }


def main() -> None:
    result = {
        "province": "陕西",
        "year": 2026,
        "category": "普通类",
        "description": "陕西省教育考试院公布的一分段表，按普通物理或普通历史分组；超高分与低分含缺考为合并档，不适用于精确位次查询。",
        "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "tracks": {subject: load_track(subject, url) for subject, url in SOURCES.items()},
    }
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Imported official Shaanxi 2026: " + ", ".join(f"{s} {len(x['scoreRows'])} score rows" for s, x in result["tracks"].items()))


if __name__ == "__main__":
    main()
