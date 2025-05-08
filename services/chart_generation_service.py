import openai
import plotly.express as px
import plotly.io as pio
import io
import json
import re
#from utils.config_loader import load_config
#from utils.secrets_loader import load_secrets

class ChartGenerationService:
    def __init__(self):
        #config = load_config()  # Load your configuration
        #secrets = load_secrets()  # Load API keys
        openai.api_key = "sk-xdCiyir_T9OuJR1Iy2DVI-wBeHgJp24lXwEkXHCkVXT3BlbkFJUns4sHIISDxKX8pnc7w28XVyKHDz-RTwHzoVwwuvYA"
        self.model = "gpt-4o"  # Model for LLM (e.g., GPT-4 turbo)

    def chat_with_gpt(self, prompt):
        try:
            print("[DEBUG] Sending request to GPT model...")

            # Send the request to OpenAI GPT-4 model
            response = openai.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7
            )

            # Extract the content from the response
            gpt_content = response.choices[0].message.content
            print(f"[DEBUG] GPT Content: {gpt_content}")

            # Parse the GPT response to extract the table and chart data dynamically
            analysis_response = self.analyze_prompt_for_structure(gpt_content)

            table_data = analysis_response.get("table_data", None)
            chart_data = analysis_response.get("chart_data", None)

            # Initialize results
            result = {"text": gpt_content}

            # Generate table if required
            if table_data:
                table = self.generate_table(table_data)
                result["table"] = table

            # Generate chart if required
            if chart_data:
                chart_image = self.generate_chart(
                    chart_type=chart_data["chart_type"],
                    data=chart_data["data"],
                    labels={"x": chart_data["x_label"], "y": chart_data["y_label"], "title": chart_data["title"]}
                )
                result["chart_image"] = chart_image

            return result

        except Exception as e:
            print(f"[ERROR] Error during chat with GPT: {str(e)}")
            return None

    def analyze_prompt_for_structure(self, gpt_content):
        """
        Analyze the GPT response to dynamically extract table and chart data.
        Assuming the model outputs something like:
        - For table: Markdown table or JSON table.
        - For chart: JSON data for chart plotting.
        """

        # Assuming the GPT response is a structured string with both a table and chart data
        try:
            # Example: Detect table and chart data using regex or JSON extraction
            # In this case, let's assume the LLM output gives structured JSON format
            # Example content could be:
            # "table_data": {...}, "chart_data": {...}
            parsed_data = re.search(r'{.*}', gpt_content)  # Looking for JSON-like data in response

            if parsed_data:
                structured_data = json.loads(parsed_data.group())

                # Extract table and chart data if available
                table_data = structured_data.get("table_data", None)
                chart_data = structured_data.get("chart_data", None)

                return {"table_data": table_data, "chart_data": chart_data}

            return {}

        except Exception as e:
            print(f"[ERROR] Error analyzing GPT content: {str(e)}")
            return {}

    def generate_table(self, table_data):
        headers = table_data["headers"]
        rows = table_data["rows"]

        table_html = "<table><tr>"
        for header in headers:
            table_html += f"<th>{header}</th>"
        table_html += "</tr>"

        for row in rows:
            table_html += "<tr>"
            for cell in row:
                table_html += f"<td>{cell}</td>"
            table_html += "</tr>"

        table_html += "</table>"
        return table_html

    def generate_chart(self, chart_type, data, labels):
        x_data = data["x"]
        y_data = data["y"]

        fig = None
        if chart_type == 'bar':
            fig = px.bar(
                x=x_data,
                y=y_data,
                labels={'x': labels.get('x', 'X-axis'), 'y': labels.get('y', 'Y-axis')},
                title=labels.get('title', 'Bar Chart')
            )
        # Set the figure size in Plotly (width and height in pixels)
        fig.update_layout(
            autosize=False,
            width=600,  # Adjust the width as needed
            height=400,  # Adjust the height as needed
            dragmode='zoom',  # Enable zooming
            hovermode='closest'  # Enable hover tooltips
        )

        # Convert figure to PNG image as a byte array
        #img_bytes = io.BytesIO()
        #pio.write_image(fig, img_bytes, format='png')
        #img_bytes.seek(0)  # Reset buffer position

        print("[DEBUG] Chart image generated successfully.")
        #return img_bytes  # Return byte stream for the image

        # Return interactive HTML
        return fig.to_html(full_html=False)

