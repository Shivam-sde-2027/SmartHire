def verify_grounding(distances: list[float], threshold: float = 1.8) -> bool:
    """
    Returns True if at least one retrieved context chunk is highly similar to the query.
    Uses L2 distance squared threshold (1.8 is standard for gemini-embedding-001).
    """
    if not distances:
        return False
        
    min_distance = min(distances)
    # L2 distance: smaller is more similar.
    # If the closest chunk is further than the threshold, we lack grounding context.
    return min_distance <= threshold
