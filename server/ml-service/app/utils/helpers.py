import math
import numpy as np

def format_pgvector(vector):
    """
    Format a list, numpy array or tuple of floats into a pgvector string literal format: '[0.1,0.2,...,0.N]'
    """
    if vector is None:
        return None
    # Convert numpy arrays/types to plain float list
    if isinstance(vector, np.ndarray):
        float_list = vector.tolist()
    else:
        float_list = list(vector)
    
    # Cast elements to float and format
    formatted_vals = [float(x) for x in float_list]
    return "[" + ",".join(map(str, formatted_vals)) + "]"

def normalize_min_max(val, min_val, max_val):
    """
    Normalize a value to [0.0, 1.0] range using Min-Max scaling.
    """
    if val is None or (isinstance(val, (float, np.float32, np.float64)) and math.isnan(val)):
        return 0.5
    if max_val == min_val:
        return 0.5
    normalized = (val - min_val) / (max_val - min_val)
    return float(np.clip(normalized, 0.0, 1.0))
