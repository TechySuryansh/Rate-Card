from typing import TypedDict, List, Dict, Any, Annotated
import operator

# Define the state object for the Graph
class AgentState(TypedDict):
    # The file path of the uploaded PDF
    pdf_path: str
    # Current stage of processing
    current_stage: str
    # Results from different agents
    results: Annotated[Dict[str, Any], operator.ior]
    # List of errors encountered
    errors: Annotated[List[str], operator.add]
    # Final structured data
    structured_data: Dict[str, Any]
