from typing import TypedDict, List, Dict, Any, Annotated
import operator
from langgraph.graph import StateGraph, END

# --- 1. State Definition ---
# The TypedDict defines the 'shared memory' of our workflow.
# Every node in the graph can read and write to this state.
class RateCardState(TypedDict):
    # Input PDF path
    pdf_path: str
    # Raw extracted data (JSON/List of Dicts)
    extracted_data: List[Dict[str, Any]]
    # Results from validation (flags, missing fields)
    validation_results: Dict[str, Any]
    # Comparison against current rates
    comparison_results: Dict[str, Any]
    # Final approval status
    approval_status: str
    # Financial impact summary
    impact_summary: Dict[str, Any]
    # Tracking current stage for UI
    current_stage: str
    # Error tracking
    errors: Annotated[List[str], operator.add]

# --- 2. Node Implementations (Placeholder Logic) ---
# Each function represents a 'node' in the graph.
# They take the current state and return only the fields they want to update.

def extract_node(state: RateCardState):
    """Stage 1: Extract data from PDF"""
    print("--- Stage 1: Extraction ---")
    # This will eventually call agents/extraction_agent.py
    return {"current_stage": "extract", "extracted_data": [{"sample": "data"}]}

def validate_node(state: RateCardState):
    """Stage 2: Validate extracted data"""
    print("--- Stage 2: Validation ---")
    return {"current_stage": "validate", "validation_results": {"status": "passed"}}

def compare_node(state: RateCardState):
    """Stage 3: Compare with existing rates"""
    print("--- Stage 3: Comparison ---")
    return {"current_stage": "compare", "comparison_results": {"change": "up 5%"}}

def impact_node(state: RateCardState):
    """Stage 4: Financial Impact Analysis"""
    print("--- Stage 4: Impact ---")
    return {"current_stage": "impact", "impact_summary": {"revenue_delta": "+$5000"}}

def approve_node(state: RateCardState):
    """Stage 5: Final Approval Step"""
    print("--- Stage 5: Approval ---")
    return {"current_stage": "approve", "approval_status": "pending_review"}

# --- 3. Graph Construction ---

def create_workflow():
    # Initialize the graph with our state schema
    workflow = StateGraph(RateCardState)

    # Add our nodes to the graph
    workflow.add_node("extract", extract_node)
    workflow.add_node("validate", validate_node)
    workflow.add_node("compare", compare_node)
    workflow.add_node("impact", impact_node)
    workflow.add_node("approve", approve_node)

    # Define the sequential edges
    # The flow is: Start -> Extract -> Validate -> Compare -> Impact -> Approve -> Finish
    workflow.set_entry_point("extract")
    workflow.add_edge("extract", "validate")
    workflow.add_edge("validate", "compare")
    workflow.add_edge("compare", "impact")
    workflow.add_edge("impact", "approve")
    workflow.add_edge("approve", END)

    # Compile the graph into an executable 'Runnable'
    return workflow.compile()

# Test entry point
if __name__ == "__main__":
    app = create_workflow()
    print("🚀 LangGraph Workflow Compiled Successfully!")
