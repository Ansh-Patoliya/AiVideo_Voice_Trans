import pytest
from app.services.export.exporter import TranscriptExporter


def sample_segments():
    return [
        {
            "start_time": 0.0,
            "end_time": 4.35,
            "text": "G'day mate, welcome to our presentation.",
            "speaker": "Speaker 1",
            "sequence": 0
        },
        {
            "start_time": 4.5,
            "end_time": 9.2,
            "text": "Today we are analyzing our product roadmap.",
            "speaker": "Speaker 2",
            "sequence": 1
        }
    ]


def test_format_timestamp_short():
    assert TranscriptExporter.format_timestamp_short(5.0) == "00:05"
    assert TranscriptExporter.format_timestamp_short(65.0) == "01:05"
    assert TranscriptExporter.format_timestamp_short(3665.0) == "01:01:05"


def test_format_timestamp_srt():
    assert TranscriptExporter.format_timestamp_srt(5.42) == "00:00:05,420"
    assert TranscriptExporter.format_timestamp_srt(75.8) == "00:01:15,800"


def test_export_txt_with_timestamps():
    segs = sample_segments()
    txt = TranscriptExporter.export_txt("Demo Title", segs, include_timestamps=True)
    assert "# Demo Title" in txt
    assert "00:00 [Speaker 1]" in txt
    assert "G'day mate" in txt


def test_export_txt_without_timestamps():
    segs = sample_segments()
    txt = TranscriptExporter.export_txt("Demo Title", segs, include_timestamps=False)
    assert "00:00" not in txt
    assert "[Speaker 1]: G'day mate" in txt


def test_export_csv():
    segs = sample_segments()
    csv_str = TranscriptExporter.export_csv(segs)
    lines = csv_str.strip().split("\n")
    assert lines[0] == "Timestamp,Speaker,Transcript"
    assert '00:00,Speaker 1,"G\'day mate, welcome to our presentation."' in lines[1]


def test_export_srt():
    segs = sample_segments()
    srt_str = TranscriptExporter.export_srt(segs)
    assert "1" in srt_str
    assert "00:00:00,000 --> 00:00:04,350" in srt_str
    assert "[Speaker 1] G'day mate, welcome to our presentation." in srt_str
    assert "2" in srt_str


def test_export_pdf_and_docx():
    segs = sample_segments()
    pdf_bytes = TranscriptExporter.export_pdf("Demo Video", segs, summary="Test summary")
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")

    docx_bytes = TranscriptExporter.export_docx("Demo Video", segs, summary="Test summary")
    assert len(docx_bytes) > 500
    assert docx_bytes.startswith(b"PK")  # ZIP header for docx
