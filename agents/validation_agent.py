import pandas as pd
import os
import json
from datetime import datetime

def validation_agent(extracted_csv_path: str):
    """
    Stage 2 Agent: Validates extracted data for errors, duplicates, and anomalies.
    
    Args:
        extracted_csv_path (str): Path to the CSV file from Stage 1.
        
    Returns:
        dict: Validation results including summary, issues found, and cleaned data path.
    """
    print(f"🛡️ Validation Agent starting for: {extracted_csv_path}")
    
    # Ensure output directory exists
    output_dir = "data/validation"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    try:
        # Load the extracted data
        df = pd.read_csv(extracted_csv_path)
        
        issues = []
        corrections = []
        
        # 1. Auto-Correction: Fix common spelling issues in headers
        header_map = {
            'lane': 'lane',
            'originn': 'origin',
            'dest': 'destination',
            'ratte': 'rate',
            'base rate': 'rate',
            'frt': 'rate',
            'curr': 'currency'
        }
        
        # Clean columns: Strip spaces and lowercase for mapping
        original_cols = [c.strip() for c in df.columns]
        new_cols = [header_map.get(col.lower(), col) for col in original_cols]
        df.columns = new_cols
        
        # NEW: Handle 'Lane' column if origin/destination are missing
        if 'lane' in df.columns and ('origin' not in df.columns or 'destination' not in df.columns):
            print("💡 Found 'Lane' column, splitting into origin/destination...")
            # More robust splitting (case insensitive, handles various separators and spaces)
            # Separators: ->, -, to, fi, /, |, via
            import re
            split_regex = r'\s*(?i:->|-|to|fi|\/|\||via)\s*'
            split_data = df['lane'].str.split(split_regex, expand=True, regex=True)
            
            if split_data.shape[1] >= 2:
                df['origin'] = split_data[0].str.strip()
                df['destination'] = split_data[1].str.strip()
                corrections.append("Split 'Lane' column into 'origin' and 'destination'")
            else:
                # Fallback: Just use the lane as origin if split fails
                df['origin'] = df['lane']
                df['destination'] = "Unknown"
                print(f"⚠️ Failed to split Lane: '{df['lane'].iloc[0]}'")

        # 2. Validate Missing Values
        missing_count = df.isnull().sum().sum()
        if missing_count > 0:
            issues.append(f"Found {missing_count} missing values across the dataset.")

        # 3. Validate Duplicate Lanes
        # Assuming 'Origin' and 'Destination' columns exist
        duplicate_count = 0
        if 'origin' in df.columns and 'destination' in df.columns:
            duplicate_count = int(df.duplicated(subset=['origin', 'destination']).sum())
            if duplicate_count > 0:
                issues.append(f"Detected {duplicate_count} duplicate route lanes.")

        # 4. Detect Suspicious Rate Increases (> 200%)
        # Note: This usually requires comparison data, but for this agent we flag internal outliers
        if 'rate' in df.columns:
            # Convert rate to numeric if it's string
            df['rate'] = pd.to_numeric(df['rate'], errors='coerce')
            mean_rate = df['rate'].mean()
            outliers = df[df['rate'] > (mean_rate * 3)] # 200% above mean
            if not outliers.empty:
                issues.append(f"Flagged {len(outliers)} rows with suspicious rate spikes (>200% above average).")

        # Generate output filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = os.path.basename(extracted_csv_path).replace(".csv", "")
        json_filename = f"{base_name}_validation_{timestamp}.json"
        json_path = os.path.join(output_dir, json_filename)
        
        # Validation Summary
        summary = {
            "status": "success" if (missing_count + duplicate_count) == 0 else "needs_review",
            "total_rows": len(df),
            "total_issues": int(missing_count + duplicate_count),
            "missing_values": int(missing_count),
            "duplicates": int(duplicate_count),
            "corrections": corrections,
            "timestamp": datetime.now().isoformat()
        }
        
        # Save validation report
        with open(json_path, 'w') as f:
            json.dump(summary, f, indent=2)
            
        # NEW: Save the cleaned/corrected CSV for the next stage
        cleaned_csv_filename = f"{base_name}_cleaned_{timestamp}.csv"
        cleaned_csv_path = os.path.join(output_dir, cleaned_csv_filename)
        df.to_csv(cleaned_csv_path, index=False)
        
        return {
            "status": summary["status"],
            "validation_path": json_path,
            "cleaned_csv_path": cleaned_csv_path,
            "summary": summary,
            "cleaned_data_sample": df.head(5).to_dict(orient='records')
        }
        
    except Exception as e:
        print(f"❌ Validation Error: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }

if __name__ == "__main__":
    # Test block (requires a CSV from stage 1)
    # result = validation_agent("data/extracted/sample_extracted.csv")
    # print(json.dumps(result, indent=2))
    print("🛡️ Validation Agent Ready.")
