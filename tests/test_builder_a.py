"""Builder A checks using only the official local ASRS export."""

import csv
import json
import tempfile
import unittest
from pathlib import Path

import duckdb

from data_pipeline.asrs import DEFAULT_DB, ROOT, get_case_context, import_export, read_export, search_cases


class ASRSDataChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = ROOT / "data" / "asrs_june_2024.csv"
        if not cls.source.exists():
            raise unittest.SkipTest("Official ASRS CSV not installed; see data/manifest.md")
        with cls.source.open(encoding="utf-8-sig", newline="") as stream:
            cls.header_and_rows = list(csv.reader(stream))

    def export_rows(self, rows, destination):
        with destination.open("w", encoding="utf-8", newline="") as stream:
            csv.writer(stream).writerows(self.header_and_rows[:2] + rows)

    def test_missing_narrative_rejected(self):
        row = next(item.copy() for item in self.header_and_rows[2:] if item)
        row[120] = ""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "missing.csv"
            self.export_rows([row], path)
            with self.assertRaisesRegex(ValueError, "Missing primary narrative"):
                read_export(path)

    def test_duplicate_acn_rejected(self):
        row = next(item for item in self.header_and_rows[2:] if item)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "duplicate.csv"
            self.export_rows([row, row], path)
            with self.assertRaisesRegex(ValueError, "duplicate ACN"):
                read_export(path)

    def test_one_real_record_has_empty_neighbors(self):
        row = next(item for item in self.header_and_rows[2:] if item)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "one.csv"
            database = Path(directory) / "one.duckdb"
            self.export_rows([row], path)
            import_export(path, database)
            with duckdb.connect(str(database), read_only=True) as connection:
                context = get_case_context(connection, row[0])
                self.assertEqual(context["candidate_incidents"], [])
                self.assertEqual(context["narrative"], row[120])

    def test_real_corpus_search_and_context(self):
        with duckdb.connect(str(DEFAULT_DB), read_only=True) as connection:
            self.assertEqual(connection.execute("SELECT count(*) FROM incidents").fetchone()[0], 503)
            results = search_cases(connection, "pushback", "2024-06", "", 1000)
            self.assertTrue(results)
            context = get_case_context(connection, "2134849")
            self.assertEqual(len(context["candidate_incidents"]), 5)
            self.assertNotIn(context["case_id"], [candidate["case_id"] for candidate in context["candidate_incidents"]])
            self.assertEqual(len(json.loads(connection.execute("SELECT raw_fields FROM incidents WHERE acn = '2134849'").fetchone()[0])), 126)


if __name__ == "__main__":
    unittest.main()
