import pandas as pd
import os
import json
from datetime import datetime

def comparison_agent(cleaned_csv_path: str, active_rates_path: str = "data/active_rates.csv"):
    """
    Stage 3 Agent: Compares new rate data against active rates to find deltas.
    
    Args:
        cleaned_csv_path (str): Path to the cleaned data from Stage 2.
        active_rates_path (str): Path to the baseline active rates CSV.
        
    Returns:
        dict: Comparison results including summary stats and path to delta CSV.
    """
    print(f"⚖️ Comparison Agent starting...")
    
    # Ensure output directory exists
    output_dir = "data/comparison"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    try:
        # Load datasets
        new_df = pd.read_csv(cleaned_csv_path)
        active_df = pd.read_csv(active_rates_path)
        
        # Standardize column names for merge (lowercase)
        new_df.columns = [c.lower() for c in new_df.columns]
        active_df.columns = [c.lower() for c in active_df.columns]
        
        print(f"📊 New Data Columns: {list(new_df.columns)}")
        print(f"📊 Active Data Columns: {list(active_df.columns)}")
        
        # Check for mandatory columns
        required = ['origin', 'destination']
        missing = [col for col in required if col not in new_df.columns]
        if missing:
            return {"status": "error", "error": f"Missing columns in new data: {missing}. Found: {list(new_df.columns)}"}

        # Merge datasets on Origin and Destination to find matches
        merged = pd.merge(
            active_df, 
            new_df, 
            on=['origin', 'destination'], 
            how='outer', 
            suffixes=('_old', '_new')
        )
        
        # Handle dynamic column names after merge
        # If 'current_rate' was only in the OLD file, it won't have a suffix
        old_rate_col = 'current_rate_old' if 'current_rate_old' in merged.columns else 'current_rate'
        new_rate_col = 'rate_new' if 'rate_new' in merged.columns else 'rate'
        
        # 1. Detect New Lanes (Exists in NEW but not in OLD)
        merged['is_new_lane'] = merged[old_rate_col].isna() & merged[new_rate_col].notna()
        
        # 2. Detect Removed Lanes (Exists in OLD but not in NEW)
        merged['is_removed_lane'] = merged[old_rate_col].notna() & merged[new_rate_col].isna()
        
        # 3. Calculate Rate Difference for matched lanes
        merged['rate_diff'] = merged[new_rate_col] - merged[old_rate_col]
        merged['percent_change'] = (merged['rate_diff'] / merged[old_rate_col]) * 100
        
        # 4. Categorize Changes
        merged['change_type'] = 'No Change'
        merged.loc[merged['is_new_lane'], 'change_type'] = 'New Lane'
        merged.loc[merged['is_removed_lane'], 'change_type'] = 'Removed Lane'
        merged.loc[merged['percent_change'] > 0, 'change_type'] = 'Rate Increase'
        merged.loc[merged['percent_change'] < 0, 'change_type'] = 'Rate Decrease'
        
        # Save comparison results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"rate_comparison_{timestamp}.csv"
        output_path = os.path.join(output_dir, output_filename)
        merged.to_csv(output_path, index=False)
        
        # Generate Summary Statistics
        summary = {
            "total_lanes_compared": len(merged),
            "new_lanes_found": int(merged['is_new_lane'].sum()),
            "removed_lanes_found": int(merged['is_removed_lane'].sum()),
            "rate_increases": int((merged['percent_change'] > 0).sum()),
            "rate_decreases": int((merged['percent_change'] < 0).sum()),
            "average_percent_change": float(merged['percent_change'].mean()) if not merged['percent_change'].isna().all() else 0,
            "timestamp": datetime.now().isoformat()
        }
        
        return {
            "status": "success",
            "comparison_csv_path": output_path,
            "summary": summary,
            "top_increases": merged[merged['percent_change'] > 0].sort_values(by='percent_change', ascending=False).head(5).to_dict(orient='records')
        }
        
    except Exception as e:
        print(f"❌ Comparison Error: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }

if __name__ == "__main__":
    print("⚖️ Comparison Agent Ready.")
