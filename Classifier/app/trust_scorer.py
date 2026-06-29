"""
KAWACH Trust Scorer  —  v2.0
Fuses outputs from all AI pipelines into two composite scores:

  trust_score (0-100)
      How credible and authentic is this civic report?
      Weights: deepfake=40%, scene=35%, routing=25%

  civic_urgency_score (0-100)
      How urgently does this need government action?
      Derived from priority tier, visual severity, witness evidence,
      DistilBERT upgrade signal, and temporal persistence.
"""


def compute_trust_score(
    verdict: str,
    fake_probability: float,
    confidence_level: str,
    routing_confidence: str,
    scene_detected: bool,
    top_scene_confidence: float = 0.0,
    temporal_consistency: float = 0.0,
) -> float:
    """
    Weighted fusion of deepfake verdict, visual evidence, and routing confidence.

    Returns float in [0, 100].
    """
    conf_mult = {"HIGH": 1.0, "MEDIUM": 0.75, "LOW": 0.50}.get(confidence_level, 0.60)

    # ── Deepfake component (40 % weight) ─────────────────────────────────────
    if verdict == "AUTHENTIC":
        deepfake_score = (1.0 - fake_probability) * 100.0 * conf_mult
    elif verdict == "AI_GENERATED":
        # Some residual score so the JSON field is never exactly 0
        deepfake_score = max(5.0, (1.0 - fake_probability) * 28.0)
    else:  # INCONCLUSIVE
        deepfake_score = 38.0

    # ── Routing confidence component (25 % weight) ────────────────────────────
    routing_score = 90.0 if routing_confidence == "AI" else 60.0

    # ── Scene / visual evidence component (35 % weight) ───────────────────────
    if scene_detected:
        base_scene = 55.0 + top_scene_confidence * 35.0
        temporal_bonus = temporal_consistency * 12.0
        scene_score = min(97.0, base_scene + temporal_bonus)
    else:
        # No scene detection is neutral — not negative
        scene_score = 48.0

    trust = 0.40 * deepfake_score + 0.25 * routing_score + 0.35 * scene_score
    return round(min(100.0, max(0.0, trust)), 1)


def compute_civic_urgency_score(
    priority: str,
    escalation_required: bool,
    visual_severity: str,
    priority_upgraded: bool,
    verdict: str,
    faces_detected: int,
    scene_detected: bool,
    temporal_consistency: float = 0.0,
) -> float:
    """
    Composite civic urgency score.

    Measures how immediately this report demands a government response.
    Returns float in [0, 100].
    """
    base = {"CRITICAL": 88, "HIGH": 70, "NORMAL": 48, "LOW": 20}.get(priority, 48)
    score = float(base)

    # Positive signals
    if escalation_required:
        score += 8.0
    if visual_severity == "HIGH":
        score += 8.0
    elif visual_severity == "MEDIUM":
        score += 4.0
    if priority_upgraded:
        score += 5.0  # DistilBERT independently raised severity
    if scene_detected and temporal_consistency >= 0.5:
        score += 6.0  # Issue visible in majority of frames — persistent, not transient
    if faces_detected > 0 and verdict == "AUTHENTIC":
        score += 4.0  # Witnessed event with verified real footage

    # Penalty for suspected manipulation
    if verdict == "AI_GENERATED":
        score -= 35.0

    return round(min(100.0, max(0.0, score)), 1)
