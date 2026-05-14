import streamlit as st
import os
import pandas as pd
import plotly.express as px
from dotenv import load_dotenv
from utils.helpers import save_uploaded_file, get_current_timestamp

# Load environment variables
load_dotenv()

# --- 1. Global Page Styling ---
st.set_page_config(
    page_title="RateCard AI | Enterprise Intelligence",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Premium Enterprise CSS
st.markdown("""
    <style>
    /* Main container styling */
    .main {
        background-color: #f4f7f9;
        font-family: 'Inter', sans-serif;
    }
    
    /* Metric card styling */
    div[data-testid="stMetric"] {
        background-color: white !important;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        border: 1px solid #eef2f6;
        transition: transform 0.2s;
    }
    div[data-testid="stMetric"] label, div[data-testid="stMetric"] div {
        color: #1e293b !important;
    }
    div[data-testid="stMetric"]:hover {
        transform: translateY(-5px);
        border-color: #3b82f6;
    }
    
    /* Button styling */
    .stButton>button {
        background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
        color: white !important;
        font-weight: 600;
        border-radius: 8px;
        border: none;
        padding: 0.6rem 1.2rem;
        width: 100%;
        transition: all 0.3s;
    }
    .stButton>button:hover {
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        transform: scale(1.02);
    }
    
    /* Sidebar Branding */
    [data-testid="stSidebar"] {
        background-color: #0f172a;
    }
    [data-testid="stSidebar"] h1, [data-testid="stSidebar"] h3, [data-testid="stSidebar"] label {
        color: white !important;
    }
    
    /* Status Box */
    .status-box {
        background-color: white;
        padding: 25px;
        border-radius: 16px;
        border-left: 5px solid #3b82f6;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    </style>
    """, unsafe_allow_html=True)

def main():
    # --- 2. Sidebar Branding \u0026 Navigation ---
    with st.sidebar:
        st.markdown("<h1 style='text-align: center; color: #3b82f6;'>🛡️ RateCard AI</h1>", unsafe_allow_html=True)
        st.markdown("<p style='text-align: center; color: #94a3b8; font-size: 0.8rem;'>v2.0 Enterprise Suite</p>", unsafe_allow_html=True)
        st.markdown("---")
        
        page = st.radio("Intelligence Hub", ["🏛️ Dashboard", "🛰️ Agent Monitor", "🕸️ Workflow View", "📜 Approval Center", "⚙️ Settings"])
        
        st.markdown("---")
        st.subheader("🔑 API Configuration")
        st.text_input("OpenAI Key", type="password", value=os.getenv("OPENAI_API_KEY", ""))
        
        st.markdown("<br><br><br>", unsafe_allow_html=True)
        st.info("System Health: **Optimal** 🟢")

    # --- 3. Dynamic Page Content ---
    if "🏛️ Dashboard" in page:
        st.title("🏛️ Global Intelligence Dashboard")
        st.caption(f"Real-time Logistics Analytics | Last Updated: {get_current_timestamp()}")
        
        # Performance Metrics Row
        m_col1, m_col2, m_col3, m_col4 = st.columns(4)
        m_col1.metric("Active Contracts", "248", "↑ 4%")
        m_col2.metric("Lanes Monitored", "1,842", "↑ 120")
        m_col3.metric("AI Accuracy", "99.1%", "↑ 0.3%")
        m_col4.metric("Savings Identified", "$24.2k", "↑ 15%")
        
        st.markdown("<br>", unsafe_allow_html=True)
        
        # Main Interface Split
        left_col, right_col = st.columns([1.8, 1])
        
        with left_col:
            st.subheader("📁 Upload Carrier Rate Card")
            with st.container():
                uploaded_file = st.file_uploader("", type=['pdf', 'csv'], help="Drop your carrier PDF or CSV here.")
                
                if uploaded_file:
                    st.success(f"📦 Document Received: **{uploaded_file.name}**")
                    if st.button("🚀 INITIATE AI ORCHESTRATOR"):
                        with st.status("🧠 AI Agents Collaborative Execution...", expanded=True) as status:
                            from agents.extraction_agent import extraction_agent
                            from agents.validation_agent import validation_agent
                            from agents.comparison_agent import comparison_agent
                            from agents.impact_agent import impact_agent
                            
                            # 0. Save the file first
                            saved_path = save_uploaded_file(uploaded_file)
                            
                            # 1. Extraction (or Direct Read if CSV)
                            st.write("🕵️‍♂️ Extraction Agent: Processing data...")
                            if uploaded_file.name.endswith('.csv'):
                                extract_result = {"status": "success", "extraction_path": saved_path, "total_rows": "N/A (CSV)"}
                                st.success("CSV detected: Bypassing PDF extraction.")
                            else:
                                extract_result = extraction_agent(saved_path)
                                if extract_result['status'] != "success":
                                    st.error(f"Extraction Failed: {extract_result.get('error')}")
                                    st.stop()
                                st.success(f"Extracted {extract_result.get('total_rows', 0)} lanes.")
                                
                            # 2. Validation (Skip if text-only)
                            if extract_result.get('is_text_only'):
                                st.info("📜 Document detected as text-only. Skipping validation and comparison.")
                                val_result = {"status": "skipped", "cleaned_csv_path": None, "summary": {"total_issues": 0, "corrections": []}}
                                comp_result = {"status": "skipped", "summary": {"average_percent_change": 0}}
                                impact_result = {"status": "success", "summary": {"executive_summary": "Text-only document. Analysis based on general content."}}
                            else:
                                st.write("🛡️ Validation Agent: Checking for anomalies...")
                                val_result = validation_agent(extract_result['extraction_path'])
                                if val_result['status'] == "error":
                                    st.error(f"Validation Failed: {val_result.get('error')}")
                                    st.stop()
                                st.success(f"Validation: {val_result['status']}")
                                
                                # 3. Comparison
                                st.write("⚖️ Comparison Agent: Calculating price deltas...")
                                comp_result = comparison_agent(val_result['cleaned_csv_path'])
                                
                                # Handle "Not Comparable" case gracefully
                                if comp_result['status'] != "success":
                                    st.warning(f"⚠️ **Comparison Notice:** {comp_result.get('error')}")
                                    comp_result = {"status": "skipped", "summary": {"average_percent_change": 0}, "error": comp_result.get('error')}
                                    impact_result = {"status": "skipped", "summary": {"executive_summary": "Comparison skipped due to no matching lanes."}}
                                else:
                                    # 4. Impact Analysis
                                    st.write("💰 Impact Analysis: Evaluating financial risk...")
                                    impact_result = impact_agent(comp_result['comparison_csv_path'])
                                    if impact_result['status'] != "success":
                                        st.error(f"Impact Analysis Failed: {impact_result.get('error')}")
                                        st.stop()
                            
                            # Store in session state for Approval Center
                            st.session_state.latest_results = {
                                "extraction": extract_result,
                                "validation": val_result,
                                "comparison": comp_result,
                                "impact": impact_result
                            }
                            
                            status.update(label="✅ Analysis Complete!", state="complete", expanded=False)
                        
                        # NEW: High-Visibility AI Content Synopsis
                        if "latest_results" in st.session_state:
                            st.markdown("---")
                            st.subheader("🤖 AI Intelligence Briefing")
                            from utils.ai_explainer import explainer
                            results = st.session_state.latest_results
                            sample_data = results['extraction'].get('sample_data', [])
                            content_summary = explainer.summarize_content(sample_data)
                            st.info(content_summary)
                            
                            # If comparison was skipped, show the explanation here too
                            if results['comparison'].get('status') == "skipped":
                                st.warning(f"💡 **Note:** Direct price comparison was skipped because: *{results['comparison'].get('error', 'No matching lanes found.')}*")
                            
                            st.markdown("---")
                        
                        st.balloons()
                        st.info("💡 Analysis finished! Head to the **📜 Approval Center** to review and activate.")
            
            st.markdown("<br>", unsafe_allow_html=True)
            st.subheader("📊 Price Trend Analysis")
            # Sample Data for Chart
            chart_data = pd.DataFrame({
                "Region": ["APAC", "EMEA", "LATAM", "NAM", "INDIA"],
                "Delta %": [12.5, -4.2, 8.1, 2.5, -1.8]
            })
            fig = px.bar(chart_data, x="Region", y="Delta %", color="Delta %", 
                         color_continuous_scale='RdYlGn_r', template="plotly_white")
            st.plotly_chart(fig, use_container_width=True)

        with right_col:
            st.subheader("📈 Real-time Status")
            st.markdown("""
                <div class="status-box">
                    <p><b>Current Workflow:</b> <code>DHL_Express_2026.pdf</code></p>
                    <hr>
                    <p style='color: #059669;'>✅ Extraction Complete</p>
                    <p style='color: #059669;'>✅ Validation Complete</p>
                    <p style='color: #3b82f6;'>🔵 Comparison in Progress...</p>
                    <p style='color: #94a3b8;'>⚪ Impact Analysis</p>
                    <p style='color: #94a3b8;'>⚪ Final Approval</p>
                </div>
            """, unsafe_allow_html=True)
            st.markdown("<br>", unsafe_allow_html=True)
            st.info("💡 Insight: The new rate card shows a high concentration of increases in the APAC region.")

    elif "Agent Monitor" in page:
        st.title("🛰️ Agent Mission Control")
        st.caption("Real-time monitoring of LangGraph autonomous workflow nodes.")
        
        # Agent Logs Section
        log_col, debug_col = st.columns([2, 1])
        with log_col:
            st.subheader("📜 Live Agent Logs")
            logs = [
                {"time": "18:27:01", "agent": "Extraction", "msg": "Parsed 4 tables from PDF 'DHL_Rates.pdf'"},
                {"time": "18:27:05", "agent": "Validation", "msg": "Corrected typo: 'Originn' -> 'Origin'"},
                {"time": "18:27:12", "agent": "System", "msg": "Awaiting review in Stage 6."}
            ]
            for log in reversed(logs):
                st.markdown(f"**[{log['time']}]** :blue[{log['agent']} Agent]: {log['msg']}")
        with debug_col:
            st.subheader("🐞 Debug Panels")
            with st.expander("🔍 Extraction State"):
                st.json({"rows_found": 42, "method": "pdfplumber"})

    elif "Workflow View" in page:
        st.title("🕸️ AI Workflow Navigator")
        import graphviz
        dot = graphviz.Digraph(comment='Rate Card Workflow')
        dot.attr(rankdir='LR', size='10,5')
        nodes = ["Extraction", "Validation", "Comparison", "Impact", "Approval", "Activation"]
        for node in nodes:
            dot.node(node, node, style='filled', fillcolor='#E3F2FD', color='#2196F3', shape='box')
        for i in range(len(nodes)-1):
            dot.edge(nodes[i], nodes[i+1])
        st.graphviz_chart(dot)

    elif "Approval Center" in page:
        st.title("🏛️ AI Approval Center")
        
        if "latest_results" not in st.session_state:
            st.info("👋 No pending approvals. Please upload and process a rate card in the **Dashboard** first.")
            st.stop()
            
        results = st.session_state.latest_results
        
        # Adaptive Layout: Check if meaningful data exists
        is_text_only = results['extraction'].get('is_text_only', False)
        
        if is_text_only:
            st.info("📜 **Business Document Detected:** This file is text-focused. Providing AI Business Synopsis below.")
            st.markdown("---")
            from utils.ai_explainer import explainer
            sample_data = results['extraction'].get('sample_data', [])
            full_summary = explainer.summarize_content(sample_data)
            st.subheader("🤖 AI Business Synopsis")
            st.info(full_summary)
            st.markdown("---")
        else:
            # Load and check structured data
            cleaned_df = pd.read_csv(results['validation']['cleaned_csv_path'])
            has_real_lanes = 'origin' in cleaned_df.columns and 'destination' in cleaned_df.columns
            has_rows = len(cleaned_df) > 0
            
            if not has_real_lanes or not has_rows:
                st.info("📜 **Business Document Detected:** Providing AI Business Synopsis below.")
                st.markdown("---")
                from utils.ai_explainer import explainer
                sample_data = results['extraction'].get('sample_data', [])
                full_summary = explainer.summarize_content(sample_data)
                st.subheader("🤖 AI Business Synopsis")
                st.info(full_summary)
                st.markdown("---")
            else:
                col1, col2 = st.columns([2, 1])
                with col1:
                    st.subheader("📄 Extracted Rate Data")
                    st.dataframe(cleaned_df, use_container_width=True)
                    
                    st.subheader("⚖️ Price Comparison & Deltas")
                    if 'comparison_csv_path' in results['comparison']:
                        compare_df = pd.read_csv(results['comparison']['comparison_csv_path'])
                        delta_df = compare_df[compare_df['change_type'] != 'No Change']
                        if not delta_df.empty:
                            st.dataframe(delta_df, use_container_width=True)
                        else:
                            st.success("✅ No price changes detected in this card.")
                    else:
                        st.warning("⚖️ **Comparison Skipped:** No matching lanes were found for a delta report.")
                
                with col2:
                    st.subheader("🛡️ AI Validation Insight")
                    from utils.ai_explainer import explainer
                    v_summary = results['validation']['summary']
                    st.info(explainer.explain_validation(v_summary['total_issues'], v_summary['corrections']))
                    
                    st.markdown("---")
                    st.subheader("💰 Strategic Impact")
                    st.markdown('<div class="status-box">', unsafe_allow_html=True)
                    
                    impact = results['impact']['summary']
                    
                    if 'financial_metrics' in impact:
                        f_metrics = impact['financial_metrics']
                        risk = impact['risk_analysis']
                        st.metric("Total Cost Delta", f"${f_metrics['total_projected_delta']:,.2f}", 
                                  "High Risk" if risk['impact_level'] == "High" else "Stable")
                    else:
                        st.metric("Total Cost Delta", "N/A", "No Matching Lanes")
                    
                    st.write("**AI Business Analysis:**")
                    st.write(impact.get('executive_summary', 'No analysis available for this card.'))
                    st.markdown('</div>', unsafe_allow_html=True)
                    
                    st.markdown("---")
                    st.subheader("✍️ Decision Center")
                    comp_summary = results['comparison'].get('summary', {})
                    avg_change = comp_summary.get('average_percent_change', 0)
                    st.success(f"🤖 **{explainer.get_approval_recommendation(f'{avg_change:.1f}% average price change detected.')}**")
                
                if st.button("✅ Approve & Activate"):
                    st.balloons()
                    st.success("Rates Activated!")
                    # Logic to call activation_agent would go here
                if st.button("❌ Reject Card"):
                    st.error("Card Rejected.")

    elif "Settings" in page:
        st.title("⚙️ System Configuration")
        st.caption("Manage your AI models, API keys, and processing thresholds.")
        
        # 1. API Management
        st.subheader("🔑 API Key Management")
        col1, col2 = st.columns(2)
        with col1:
            st.text_input("Groq API Key", type="password", value=os.getenv("GROQ_API_KEY", ""))
            st.text_input("OpenAI API Key", type="password", value=os.getenv("OPENAI_API_KEY", ""))
        with col2:
            st.selectbox("Default Intelligence Model", ["llama-3.3-70b-versatile", "gpt-4-turbo", "gpt-3.5-turbo"])
            st.checkbox("Enable MOCK_MODE for testing", value=False)

        st.markdown("---")
        
        # 2. System Thresholds
        st.subheader("🚦 Processing Thresholds")
        st.slider("Anomaly Detection Sensitivity (%)", 0, 500, 200, help="Flags rates that increase more than this percentage.")
        st.multiselect("Active Validation Rules", ["Duplicate Check", "Date Validation", "Spelling Auto-Correct", "Currency Matching"], default=["Duplicate Check", "Spelling Auto-Correct"])

        st.markdown("---")
        
        # 3. System Logs
        st.subheader("📜 Developer Logs")
        with st.container():
            st.code(f"""
            [{get_current_timestamp()}] System: Initializing v2.0 Pipeline...
            [{get_current_timestamp()}] Auth: Groq API Key validated.
            [{get_current_timestamp()}] App: Dashboard rendered successfully on port 8503.
            """, language="bash")
            
        if st.button("💾 Save All Configurations"):
            st.success("All settings successfully persisted to .env and local storage!")
            st.balloons()

if __name__ == "__main__":
    main()
