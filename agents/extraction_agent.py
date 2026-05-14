import pdfplumber
import pandas as pd
import os
import json
from datetime import datetime

def extraction_agent(pdf_path: str):
    """
    Stage 1 Agent: Extracts tables OR raw text from PDF.
    Ensures that every PDF gets summarized regardless of structure.
    """
    print(f"🕵️‍♂️ Extraction Agent starting for: {pdf_path}")
    
    # Ensure output directory exists
    output_dir = "data/extracted"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    try:
        all_data = []
        raw_text_content = ""
        
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Strategy 1: Explicit Tables
                table = page.extract_table()
                
                # Strategy 2: Text Clusters
                if not table:
                    table = page.extract_table({
                        "vertical_strategy": "text", 
                        "horizontal_strategy": "text",
                        "snap_tolerance": 3
                    })
                
                if table:
                    for row in table:
                        if any(cell for cell in row if cell):
                            all_data.append([str(cell).strip() if cell else "" for cell in row])
                
                # Always capture some raw text for the summary fallback
                page_text = page.extract_text()
                if page_text:
                    raw_text_content += page_text + "\n"
        
        # If we have table data, process it
        if all_data:
            df = pd.DataFrame(all_data[1:], columns=all_data[0])
            df.columns = [str(c).strip() for c in df.columns]
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_name = os.path.basename(pdf_path).replace(".pdf", "")
            csv_path = os.path.join(output_dir, f"{base_name}_extracted_{timestamp}.csv")
            df.to_csv(csv_path, index=False)
            
            return {
                "status": "success",
                "extraction_path": csv_path,
                "total_rows": len(df),
                "columns": list(df.columns),
                "sample_data": df.head(5).to_dict(orient='records'),
                "raw_text_snippet": raw_text_content[:2000], # Pass text for summary
                "timestamp": datetime.now().isoformat()
            }
        else:
            # Fallback: No tables, but we have text!
            return {
                "status": "success",
                "extraction_path": None,
                "total_rows": 0,
                "columns": [],
                "sample_data": [{"content": raw_text_content[:1000]}], # Pass text as data for AI summary
                "raw_text_snippet": raw_text_content[:2000],
                "is_text_only": True,
                "timestamp": datetime.now().isoformat()
            }
        
    except Exception as e:
        print(f"❌ Extraction Error: {str(e)}")
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    print("🕵️‍♂️ Universal Extraction Agent Ready.")
