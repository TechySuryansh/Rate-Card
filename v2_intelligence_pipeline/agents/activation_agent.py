import pandas as pd
import os
import shutil
from datetime import datetime

def activation_agent(new_rates_csv_path: str, active_rates_path: str = "data/active_rates.csv"):
    """
    Stage 8 Agent: Promotes approved rates to active and archives old versions.
    
    Args:
        new_rates_csv_path (str): Path to the final approved data.
        active_rates_path (str): Path to the current active rates CSV.
        
    Returns:
        dict: Activation results and archive paths.
    """
    print(f"🚀 Activation Agent starting...")
    
    # Ensure directories exist
    archive_dir = "data/archive"
    log_dir = "data/logs"
    for d in [archive_dir, log_dir]:
        if not os.path.exists(d):
            os.makedirs(d)
            
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 1. Archive Current Active Rates
        if os.path.exists(active_rates_path):
            archive_path = os.path.join(archive_dir, f"active_rates_backup_{timestamp}.csv")
            shutil.copy2(active_rates_path, archive_path)
            print(f"📦 Archived old rates to: {archive_path}")
        else:
            archive_path = None

        # 2. Promote New Rates to Active
        # In a real app, we might merge or replace. Here we replace for the demo.
        shutil.copy2(new_rates_csv_path, active_rates_path)
        print(f"✨ New rates promoted to: {active_rates_path}")
        
        # 3. Generate Activation Log
        activation_log = {
            "timestamp": datetime.now().isoformat(),
            "source_file": new_rates_csv_path,
            "backup_file": archive_path,
            "status": "activated",
            "activated_by": "AI Orchestrator (Auto-Approval)"
        }
        
        log_path = os.path.join(log_dir, f"activation_log_{timestamp}.json")
        with open(log_path, 'w') as f:
            import json
            json.dump(activation_log, f, indent=2)
            
        return {
            "status": "success",
            "active_path": active_rates_path,
            "archive_path": archive_path,
            "log_path": log_path
        }
        
    except Exception as e:
        print(f"❌ Activation Error: {str(e)}")
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    print("🚀 Activation Agent Ready.")
