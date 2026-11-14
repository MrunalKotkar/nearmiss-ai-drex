"""Precursor-family taxonomy (plan section 4, "Suggested initial taxonomy").

Refine the labels/descriptions here after Builder A inspects the real ASRS export.
These are triage categories, not ASRS ground-truth labels.
"""

PATTERN_FAMILIES: dict[str, str] = {
    "communication_coordination": (
        "A communication or coordination breakdown between pilots, controllers or crew members: "
        "call-sign confusion, readback/hearback errors, misunderstood or ambiguous clearances, "
        "frequency congestion, or crew members not sharing information."
    ),
    "runway_surface": (
        "Runway or taxiway surface operations: runway incursions, crossing a hold-short line, "
        "wrong runway or taxiway, ground-movement conflicts between aircraft or vehicles."
    ),
    "procedural_deviation": (
        "A deviation from a required procedure, checklist, standard operating procedure or clearance "
        "that is not primarily explained by miscommunication or surface navigation."
    ),
    "other": "A safety issue outside the families above, such as equipment, weather or airspace issues.",
    "insufficient_evidence": "The narrative does not contain enough information to assign any family.",
}

# Families that guidance passages can be tagged with during NDI extraction.
GUIDANCE_TOPICS: list[str] = ["communication_coordination", "runway_surface", "procedural_deviation"]
