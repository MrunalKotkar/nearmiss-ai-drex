# ASRS sample manifest

- Source: [NASA ASRS Database Online](https://asrs.arc.nasa.gov/search/database.html), CSV export from the official query wizard.
- Query: `Date of Incident was between June-2024, June-2024`; no event or narrative filter.
- Downloaded: November 14, 2026 (America/Los_Angeles).
- Local raw file: `data/asrs_june_2024.csv` (excluded from Git).
- SHA-256: `50d6001a1ef7f241ee9552d570d8fd96c76210a367e887e979272991fa6fe6ec`.
- Exported rows: 503, with 503 unique ACNs, 503 primary narratives, and 503 synopses.
- CSV layout: two header rows (group and field), one blank row, then one row per incident; 126 columns. `ACN` is the stable source identifier. `Date` is `YYYYMM`, so day-level precision is unavailable. `Report 1 / Narrative` is the primary original narrative. `Report 2 / Narrative` is optional supplemental text and is retained separately.
- Field mapping in DuckDB: `ACN → acn`, `Time/Date → report_month`, `Report 1/Narrative → narrative`, `Report 2/Narrative → supplemental_narrative`, `Report 1/Synopsis → synopsis`, `Events/Anomaly → anomaly`, `Assessments/Primary Problem → primary_problem`, `Person 1/Communication Breakdown → communication_breakdown`, `Person 1/Human Factors → human_factors`, `Aircraft 1/Flight Phase → flight_phase`, `Place/Locale Reference → locale`, and `Time/Local Time Of Day → local_time`. The `raw_fields` JSON column retains all 126 original values with their group and field names, including other expert-coded fields.
- Missing in this sample: local time 69, locale reference 56, Person 1 human factors 89, Person 1 communication breakdown 346, Report 2 narrative 403. Values are counts of blank cells, not assessments of safety.
- Source caveat: ASRS reports are voluntary and NASA does not verify or validate them. Counts in this sample do not measure accident prevalence or risk.
- Coding caveat: `Primary Problem` has 14 distinct values in this sample, led by Human Factors (200), Aircraft (168), Ambiguous (53), and Procedure (35). These are source codes, not validated ground-truth labels for the agent taxonomy. Do not equate text matches or coded counts with causal or risk estimates.
- Initial communication focused demo candidates: ACN `2134849` (pushback and ground personnel communication), ACN `2126005` (opposite direction ground conflict and radio issue), and ACN `2133280` (runway selection and ATC communication). These are selected for inspection, not validated labels or model outcomes.

Reproduce the export by opening the source link, selecting **Start Search**, adding **Date of Incident**, setting both dates to **June 2024**, running the search, and choosing **Comma Separated File (CSV)**. The download was named `ASRS_DBOnline.csv`; rename it to `data/asrs_june_2024.csv` locally. Import with `python -m data_pipeline.asrs import data/asrs_june_2024.csv`.
