from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import io
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
from groclake.vectorlake import VectorLake
from groclake.modellake import ModelLake

app = Flask(__name__)
CORS(app)

# Initialize API keys
os.environ['GROCLAKE_API_KEY'] = '43ec517d68b6edd3015b3edc9a11367b'
os.environ['GROCLAKE_ACCOUNT_ID'] = '7376846f01e0b6e5f1568fef7b48a148'
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyBpwbZVpuwYwKA_F3A-bEEhvTHYjoTUIgE')

# Initialize lakes
vectorlake = VectorLake()
modellake = ModelLake()

def extract_text_from_pdf(pdf_bytes):
    """Extract text from PDF file bytes."""
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}")
        return ""

def extract_text_from_image(image_bytes):
    """Extract text from image using OCR."""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(image)
        return text
    except Exception as e:
        print(f"Error extracting text from image: {str(e)}")
        return ""

def clean_text(text):
    """Clean extracted text."""
    # Remove excessive whitespace
    text = " ".join(text.split())
    # Remove non-printable characters
    text = "".join(char for char in text if char.isprintable())
    return text

def chunk_text(text, chunk_size=1000, overlap=200):
    """Split text into chunks with overlap."""
    chunks = []
    start = 0
    text_len = len(text)

    while start < text_len:
        end = start + chunk_size
        # If this is not the first chunk, start a bit earlier to create overlap
        if start > 0:
            start = max(0, start - overlap)
        # If this is the last chunk, just go to the end
        if end >= text_len:
            chunks.append(text[start:])
            break
        # Find the last period or newline to break at a natural point
        last_period = text.rfind('.', start, end)
        last_newline = text.rfind('\n', start, end)
        break_point = max(last_period, last_newline)
        if break_point > start:
            end = break_point + 1
        chunks.append(text[start:end])
        start = end

    return chunks

@app.route('/process_record', methods=['POST'])
def process_record():
    """Process a medical record and store vectors in VectorLake."""
    try:
        # Get record data and file
        record_data = json.loads(request.form.get('record_data'))
        file = request.files.get('file')
        
        if not file:
            return jsonify({"success": False, "message": "No file provided"}), 400
        
        # Extract text based on file type
        file_bytes = file.read()
        file_ext = file.filename.split('.')[-1].lower()
        
        if file_ext == 'pdf':
            extracted_text = extract_text_from_pdf(file_bytes)
        elif file_ext in ['jpg', 'jpeg', 'png']:
            extracted_text = extract_text_from_image(file_bytes)
        else:
            return jsonify({"success": False, "message": "Unsupported file type"}), 400
        
        # Clean the extracted text
        extracted_text = clean_text(extracted_text)
        
        if not extracted_text:
            return jsonify({"success": False, "message": "No text could be extracted from the file"}), 400
        
        # Generate summary using ModelLake
        summary_prompt = f"""
        Please provide a brief medical summary of the following text from a {record_data.get('recordType', '')}:
        {extracted_text[:3000]}...
        
        Focus on key medical details, diagnoses, treatments, and important values.
        Keep it under 200 words.
        """
        
        summary_response = modellake.complete({
            "prompt": summary_prompt,
            "token_size": 500
        })
        summary = summary_response.get("text", "")
        
        # Create metadata
        metadata = {
            "title": record_data.get("title", ""),
            "description": record_data.get("description", ""),
            "recordType": record_data.get("recordType", ""),
            "recordDate": record_data.get("recordDate", ""),
            "userId": record_data.get("userId", ""),
            "recordId": record_data.get("recordId", ""),
            "textSummary": summary
        }
        
        # Chunk the text
        chunks = chunk_text(extracted_text)
        
        # Store chunks in VectorLake
        vector_ids = []
        user_id = record_data.get("userId")
        vector_namespace = f"medical_records_{user_id}"
        
        # Create vector namespace for the user if it doesn't exist
        try:
            vectorlake.create({
                "name": vector_namespace,
                "type": "text"
            })
        except Exception as e:
            # Vector namespace may already exist
            print(f"Vector namespace exists or error: {str(e)}")
        
        # Store each chunk
        for i, chunk in enumerate(chunks):
            chunk_id = f"{record_data.get('recordId')}_chunk_{i}"
            
            try:
                # Generate and store vector
                vectorlake.store({
                    "id": chunk_id,
                    "vector_name": vector_namespace,
                    "vector_document": chunk,
                    "metadata": {
                        **metadata,
                        "chunk_index": i,
                        "total_chunks": len(chunks)
                    }
                })
                vector_ids.append(chunk_id)
            except Exception as e:
                print(f"Error storing vector for chunk {i}: {str(e)}")
        
        return jsonify({
            "success": True, 
            "message": "Record processed successfully",
            "vector_ids": vector_ids,
            "text_length": len(extracted_text),
            "chunks_count": len(chunks),
            "summary": summary
        })
        
    except Exception as e:
        print(f"Error processing record: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/query_records', methods=['POST'])
def query_records():
    """Get information from medical records based on a specific question."""
    try:
        data = request.json
        question = data.get('question')
        user_id = data.get('userId')
        
        if not question or not user_id:
            return jsonify({"success": False, "message": "Question and userId are required"}), 400
        
        # Search in VectorLake
        vector_namespace = f"medical_records_{user_id}"
        
        try:
            search_results = vectorlake.search({
                "query": question,
                "vector_name": vector_namespace,
                "limit": 5
            })
            results = search_results.get("results", [])
        except Exception as e:
            print(f"Error searching vectors: {str(e)}")
            return jsonify({"success": False, "message": f"Error searching records: {str(e)}"}), 500
        
        if not results:
            return jsonify({
                "success": True,
                "answer": "I couldn't find any relevant information in your medical records. Please try a different question or check if you have uploaded records related to this query."
            })
            
        # Combine relevant contexts
        contexts = []
        record_info = set()
        
        for result in results:
            text = result.get("vector_document", "")
            metadata = result.get("metadata", {})
            
            title = metadata.get('title', '')
            record_type = metadata.get('recordType', '')
            record_date = metadata.get('recordDate', '')
            
            record_info.add(f"- {title} ({record_type}) from {record_date}")
            contexts.append(text)
        
        # Create prompt for ModelLake
        context_text = "\n\n".join(contexts)
        record_info_text = "\n".join(record_info)
        
        prompt = f"""
        You are a medical assistant helping a patient understand their medical records.
        Below is information from the patient's medical records:

        {context_text}

        Based only on the information above, please answer this question:
        "{question}"

        Rules:
        1. Only use information from the provided medical records
        2. If the information is not in the records, say so
        3. Be clear and use patient-friendly language
        4. Keep the answer concise but informative
        5. If you're unsure about any details, express that uncertainty
        6. Do not make assumptions beyond what's in the records

        Referenced medical records:
        {record_info_text}
        """
        
        # Generate answer with ModelLake
        response = modellake.complete({
            "prompt": prompt,
            "token_size": 2000
        })
        
        answer = response.get("text", "I'm sorry, I couldn't generate a proper response.")
            
        return jsonify({
            "success": True,
            "answer": answer,
            "sources": list(record_info)
        })
        
    except Exception as e:
        print(f"Error querying records: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 