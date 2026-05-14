from langgraph.graph import StateGraph, END
from .state import AgentState

# Define the node functions (placeholders for now)
def extraction_node(state: AgentState):
    """Stage 1: Extract data from PDF"""
    print("--- Stage 1: Extraction ---")
    return {"current_stage": "validation", "results": {"extraction": "success"}}

def validation_node(state: AgentState):
    """Stage 2: Validate extracted data"""
    print("--- Stage 2: Validation ---")
    return {"current_stage": "reporting", "results": {"validation": "passed"}}

def reporting_node(state: AgentState):
    """Stage 3: Generate final report"""
    print("--- Stage 3: Reporting ---")
    return {"current_stage": "completed", "results": {"reporting": "done"}}

def create_graph():
    # Initialize the graph with state schema
    workflow = StateGraph(AgentState)

    # Add nodes to the graph
    workflow.add_node("extraction", extraction_node)
    workflow.add_node("validation", validation_node)
    workflow.add_node("reporting", reporting_node)

    # Define the edges (flow)
    workflow.set_entry_point("extraction")
    workflow.add_edge("extraction", "validation")
    workflow.add_edge("validation", "reporting")
    workflow.add_edge("reporting", END)

    # Compile the graph
    return workflow.compile()
