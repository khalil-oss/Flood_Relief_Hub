"""Transparent, explainable camp risk scoring baseline.

No trained model is used. Weights and thresholds are documented here.
A trained scikit-learn model can later replace/supplement `score_camp`.
"""

# Weights (sum to 100)
WEIGHTS = {
    "occupancy": 25,
    "unfulfilled_needs": 30,
    "critical_shortage": 25,
    "low_stock": 10,
    "data_quality": 10,
}

THRESHOLDS = {
    "low": 25,
    "medium": 50,
    "high": 75,
}


def _level(score):
    if score < THRESHOLDS["low"]:
        return "Low"
    if score < THRESHOLDS["medium"]:
        return "Medium"
    if score < THRESHOLDS["high"]:
        return "High"
    return "Critical"


def score_camp(payload):
    """Return dict with score, risk_level, factors, warnings, timestamp."""
    import datetime
    factors = []
    warnings = []
    score = 0.0

    camp = payload.get("camp") or {}
    needs = payload.get("needs") or []
    inventory = payload.get("inventory") or {}
    dispatches = payload.get("dispatches") or []

    # Occupancy
    capacity = camp.get("capacity")
    current = camp.get("current_families")
    if capacity is None or capacity == 0:
        warnings.append("Missing or invalid camp capacity; occupancy not assessed.")
    else:
        try:
            occ = (current or 0) / capacity
        except ZeroDivisionError:
            occ = 0
            warnings.append("Division by zero in occupancy.")
        if occ > 1:
            occ = 1
        occ_score = occ * WEIGHTS["occupancy"]
        score += occ_score
        if occ >= 0.9:
            factors.append(f"High occupancy ({occ*100:.0f}%)")

    # Unfulfilled needs (avoid double counting with dispatches)
    total_required = 0
    total_fulfilled = 0
    total_active_dispatch = 0
    for n in needs:
        rq = n.get("required_quantity") or 0
        fq = n.get("fulfilled_quantity") or 0
        total_required += rq
        total_fulfilled += fq
    for d in dispatches:
        if d.get("status") in ("Pending", "In Transit"):
            total_active_dispatch += d.get("quantity") or 0

    if total_required > 0:
        # remaining demand already accounts for active dispatches
        remaining = max(total_required - total_fulfilled - total_active_dispatch, 0)
        ratio = remaining / total_required
        need_score = ratio * WEIGHTS["unfulfilled_needs"]
        score += need_score
        if ratio > 0.3:
            factors.append(f"Unfulfilled needs ({ratio*100:.0f}% remaining)")
    else:
        warnings.append("No needs recorded for camp.")

    # Critical shortages
    critical = [n for n in needs if (n.get("priority") == "High") and ((n.get("fulfilled_quantity") or 0) < (n.get("required_quantity") or 0) * 0.4)]
    if critical:
        crit_score = min(len(critical) * 8, WEIGHTS["critical_shortage"])
        score += crit_score
        factors.append(f"{len(critical)} critical/high-priority shortage(s)")

    # Low stock (inventory available)
    low_items = 0
    for iid, st in inventory.items():
        if st.get("stock", 0) <= st.get("reorder_level", 0):
            low_items += 1
    if low_items:
        ls = min(low_items * 4, WEIGHTS["low_stock"])
        score += ls
        factors.append(f"{low_items} low-stock inventory item(s)")

    # Data quality penalty
    dq = 0
    if capacity is None:
        dq += 5
    if not needs:
        dq += 5
    score += min(dq, WEIGHTS["data_quality"])
    if dq:
        warnings.append("Data quality issues increased uncertainty.")

    score = round(min(score, 100), 2)
    return {
        "score": score,
        "risk_level": _level(score),
        "factors": factors,
        "warnings": warnings,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
    }
