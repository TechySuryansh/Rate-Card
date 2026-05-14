# pyrefly: ignore [missing-import]
import pdfplumber
import pandas as pd
import os
import json
from datetime import datetime

def extraction_agent(pdf_path: str):
    """
    Stage 1 Agent: Extracts tables from PDF and converts them to structured data.
    
    Args:
        pdf_path (str): Path to the uploaded PDF file.
        
    Returns:
        dict: A dictionary containing extraction status, saved file path, and sample data.
    """
    print(f"🕵️‍♂️ Extraction Agent starting for: {pdf_path}")
    
    # Ensure output directory exists
    output_dir = "data/extracted"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    try:
        all_tables = []
        
        # Open the PDF and extract tables
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        # Convert to DataFrame
                        df = pd.DataFrame(table[1:], columns=table[0])
                        
                        # Data Cleaning: Remove empty rows and columns
                        df = df.dropna(how='all').dropna(axis=1, how='all')
                        
                        if not df.empty:
                            all_tables.append(df)
        
        if not all_tables:
            return {
                "status": "failed",
                "error": "No tables found in the PDF document."
            }
            
        # Combine all tables (assuming similar structure for this demo)
        combined_df = pd.concat(all_tables, ignore_index=True)
        
        # Generate output filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = os.path.basename(pdf_path).replace(".pdf", "")
        csv_filename = f"{base_name}_extracted_{timestamp}.csv"
        csv_path = os.path.join(output_dir, csv_filename)
        
        # Save to CSV
        combined_df.to_csv(csv_path, index=False)
        
        # Return structured JSON compatible with LangGraph state
        return {
            "status": "success",
            "extraction_path": csv_path,
            "total_rows": len(combined_df),
            "columns": list(combined_df.columns),
            "sample_data": combined_df.head(5).to_dict(orient='records'),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Extraction Error: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }

if __name__ == "__main__":
    # Test block
    test_path = "uploads/sample_rate_card.pdf" # Make sure this exists if testing locally
    if os.path.exists(test_path):
        result = extraction_agent(test_path)
        print(json.dumps(result, indent=2))
