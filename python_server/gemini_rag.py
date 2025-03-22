from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import google.generativeai as genai
import numpy as np

app = Flask(__name__)
CORS(app)

# Initialize Gemini
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyBpwbZVpuwYwKA_F3A-bEEhvTHYjoTUIgE')
genai.configure(api_key=GEMINI_API_KEY)

# Models - using Gemini 2.0
generation_model = genai.GenerativeModel('gemini-1.5-flash')
# Using text generation for embeddings since embed_content is not available
embedding_model = generation_model

# In-memory storage
chunks_db = {}  # user_id -> [chunk_objects]

def generate_embedding(text):
    """Generate pseudo-embedding using Gemini model responses."""
    try:
        # Use a prompt to extract key features for vector representation
        prompt = f"""
        Extract 20 key medical terms or concepts from the following text, separated by commas.
        If there are fewer than 20 terms, just extract what's available.
        TEXT: {text}
        """
        
        result = generation_model.generate_content(prompt)
        terms = result.text.split(',')
        
        # Create a basic binary vector based on term presence
        # This is a simplified approach since we can't use proper embeddings
        terms_vector = np.zeros(100)  # Using a 100-dimensional space
        for i, term in enumerate(terms[:100]):
            terms_vector[i % 100] = 1  # Set positions based on terms
            
        # Normalize to unit vector for cosine similarity
        norm = np.linalg.norm(terms_vector)
        if norm > 0:
            terms_vector = terms_vector / norm
            
        return terms_vector
    except Exception as e:
        print(f"Error generating embedding: {str(e)}")
        return np.zeros(100)  # Return zero vector on error

def cosine_similarity(a, b):
    """Calculate cosine similarity between two vectors."""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def chunk_text(text, chunk_size=1000, overlap=200):
    """Split text into chunks with overlap."""
    chunks = []
    for i in range(0, len(text), chunk_size - overlap):
        chunk = text[i:i + chunk_size]
        if len(chunk) > 100:  # Only add chunks with substantial text
            chunks.append(chunk)
    return chunks

def search_chunks(user_id, query_embedding, limit=5):
    """Search for relevant chunks."""
    if user_id not in chunks_db or not chunks_db[user_id]:
        return []
    
    results = []
    for chunk in chunks_db[user_id]:
        if chunk.get('embedding') is None:
            continue
        score = cosine_similarity(query_embedding, chunk['embedding'])
        results.append((score, chunk))
    
    # Sort by similarity score
    results.sort(reverse=True, key=lambda x: x[0])
    
    # Return top results, deduplicated by record_id
    top_results = []
    seen_records = set()
    
    for score, chunk in results[:10]:  # Look at top 10 for deduplication
        record_id = chunk['metadata']['recordId']
        if record_id in seen_records:
            continue
        
        seen_records.add(record_id)
        top_results.append({
            'text': chunk['text'],
            'metadata': chunk['metadata'],
            'score': float(score)
        })
        
        if len(top_results) >= limit:
            break
    
    return top_results

@app.route('/process_record', methods=['POST'])
def process_record():
    """Process a medical record and store embeddings."""
    try:
        # Get record data
        record_data = json.loads(request.form.get('record_data'))
        file = request.files.get('file')
        
        if not file:
            return jsonify({"success": False, "message": "No file provided"}), 400
        
        # For simplicity, use description as text content
        description = record_data.get("description", "")
        title = record_data.get("title", "")
        extracted_text = f"{title}. {description}"
        
        # Generate summary using Gemini
        summary_prompt = f"""
        Please provide a brief medical summary of the following:
        {extracted_text}
        
        Focus on key medical details, diagnoses, treatments, and important values.
        Keep it under 200 words.
        """
        
        summary_response = generation_model.generate_content(summary_prompt)
        summary = summary_response.text
        
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
        
        # Store chunks with embeddings
        chunk_ids = []
        user_id = record_data.get("userId")
        
        # Initialize user's chunks store if needed
        if user_id not in chunks_db:
            chunks_db[user_id] = []
        
        # Store each chunk
        for i, chunk_text in enumerate(chunks):
            chunk_id = f"{record_data.get('recordId')}_chunk_{i}"
            
            # Generate embedding
            embedding = generate_embedding(chunk_text)
            
            # Store chunk
            chunk_data = {
                'id': chunk_id,
                'text': chunk_text,
                'embedding': embedding,
                'metadata': {
                    **metadata,
                    "chunk_index": i,
                    "total_chunks": len(chunks)
                }
            }
            
            chunks_db[user_id].append(chunk_data)
            chunk_ids.append(chunk_id)
        
        print(f"Processed record: {title}, user: {user_id}, chunks: {len(chunks)}")
        
        return jsonify({
            "success": True, 
            "message": "Record processed successfully",
            "chunk_ids": chunk_ids,
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
        
        # Generate embedding for the question
        query_embedding = generate_embedding(question)
        
        # TEMPORARY SOLUTION: Use hardcoded sample user ID for testing
        sample_user_id = "123456789"
        
        # Search for relevant chunks (using sample user id for testing)
        results = search_chunks(sample_user_id, query_embedding, limit=5)
        
        if not results:
            return jsonify({
                "success": True,
                "answer": "I couldn't find any relevant information in your medical records. Please try a different question or check if you have uploaded records related to this query."
            })
            
        # Combine relevant contexts
        contexts = []
        record_info = set()
        
        for result in results:
            text = result['text']
            metadata = result['metadata']
            
            title = metadata.get('title', '')
            record_type = metadata.get('recordType', '')
            record_date = metadata.get('recordDate', '')
            
            record_info.add(f"- {title} ({record_type}) from {record_date}")
            contexts.append(text)
        
        # Create prompt for Gemini
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
        
        # Generate answer with Gemini
        response = generation_model.generate_content(prompt)
        answer = response.text
            
        return jsonify({
            "success": True,
            "answer": answer,
            "sources": list(record_info)
        })
        
    except Exception as e:
        print(f"Error querying records: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/debug/chunks', methods=['GET'])
def debug_chunks():
    """Debug endpoint to check chunks_db."""
    try:
        result = {}
        for user_id, chunks in chunks_db.items():
            result[user_id] = {
                'chunk_count': len(chunks),
                'sample': chunks[0] if chunks else None
            }
        return jsonify({
            "success": True,
            "data": result
        })
    except Exception as e:
        print(f"Error debugging chunks: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/debug/add_sample_data', methods=['GET'])
def add_sample_data_route():
    """Add sample medical record data for testing."""
    try:
        from test_add_data import add_sample_data
        result = add_sample_data()
        return jsonify(result)
    except Exception as e:
        print(f"Error adding sample data: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    # Add sample data
    try:
        print("Adding sample data...")
        # Sample user ID
        user_id = "123456789"
        
        # Sample medical records
        sample_records = [
            {
    "recordId": "sample_record_2",
    "title": "Outpatient Rheumatology Summary",
    "description": "Patient is a 56-year-old female with a known case of systemic lupus erythematosus and scleroderma overlap with interstitial lung disease on medication. Presenting with tightness of skin on the fists and ulcers on the pulp of the fingers. Treatment includes multiple medications such as Linezolid, Clopidogrel, Amlodipine, Domperidone, Omeprazole, Bosentan, Sildenafil Citrate, Prednisolone, Mycophenolate Mofetil, L-methylfolate calcium, and Ciprofloxacin. Review advised after 4 weeks.",
    "recordType": "Rheumatology Outpatient Summary",
    "recordDate": "2021-07-02",
    "patientName": "Ms Rukhsana Shaheen",
    "hospitalNo": "MH005990453",
    "episodeNo": "03000582270",
    "doctor": "Dr Darshan Singh Bhakuni",
    "department": "Rheumatology MHD",
    "ageSex": "56 yrs/Female",
    "consultationType": "Video consultation",
    
},

            {
                "recordId": "sample_record_1",
                "title": "Annual Physical Examination",
                "description": "Patient is a 45-year-old male in good health. Blood pressure: 120/80 mmHg. Heart rate: 72 bpm. Currently taking Lisinopril 10mg daily for hypertension and Metformin 500mg twice daily for type 2 diabetes. Lab results show normal kidney function, cholesterol within normal limits. Recommended follow-up in 12 months.",
                "recordType": "Physical Examination",
                "recordDate": "2023-03-15",
                "doctor_name": "Dr Darshan Singh Bhakuni",
                "hospital_name": "Medanta Hospital",
                "hospital_no": "MH005990453",
            
            },
            {
                "recordId": "sample_record_2",
                "title": "Cardiology Consultation",
                "description": "Patient referred for evaluation of chest pain. ECG shows normal sinus rhythm. Stress test was negative for ischemia. Echo shows normal ejection fraction of 60%. Recommended to continue current medications: Aspirin 81mg daily and Atorvastatin 20mg at bedtime. Advised to exercise regularly and follow a low-salt diet.",
                "recordType": "Specialist Consultation",
                "recordDate": "2023-05-20",
                "doctor_name": "Dr Darshan Singh Bhakuni",
                "hospital_name": "Medanta Hospital",
                "hospital_no": "MH005990453",
            
            },
            {
                "recordId": "sample_record_3",
                "title": "Lab Results",
                "description": "Complete Blood Count: WBC 6.5, RBC 4.8, Hemoglobin 14.2, Hematocrit 42%, Platelets 250. Comprehensive Metabolic Panel: Sodium 140, Potassium 4.2, Glucose 110 (slightly elevated), A1C 6.4%. Lipid Panel: Total Cholesterol 185, LDL 110, HDL 45, Triglycerides 150. Thyroid Function: TSH 2.8, within normal range.",
                "recordType": "Lab Report",
                "recordDate": "2023-06-10",
                "doctor_name": "Dr Darshan Singh Bhakuni",
                "hospital_name": "Medanta Hospital",
                "hospital_no": "MH005990453",
            }
        ]
        
        # Initialize user's chunks store
        chunks_db[user_id] = []
        
        total_chunks = 0
        
        for record in sample_records:
            # Create full text
            full_text = f"{record['title']}. {record['description']}"
            
            # Chunk text
            chunks = chunk_text(full_text)
            total_chunks += len(chunks)
            
            # Create metadata
            metadata = {
                "recordId": record["recordId"],
                "title": record["title"],
                "description": record["description"],
                "recordType": record["recordType"],
                "recordDate": record["recordDate"]
            }
            
            # Store chunks with embeddings
            for i, chunk_text_content in enumerate(chunks):
                chunk_id = f"{record['recordId']}_chunk_{i}"
                
                # Generate embedding
                embedding = generate_embedding(chunk_text_content)
                
                # Store chunk
                chunk_data = {
                    'id': chunk_id,
                    'text': chunk_text_content,
                    'embedding': embedding,
                    'metadata': {
                        **metadata,
                        "chunk_index": i,
                        "total_chunks": len(chunks)
                    }
                }
                
                chunks_db[user_id].append(chunk_data)
        
        print(f"Added {len(sample_records)} sample records with {total_chunks} chunks for user {user_id}")
        
    except Exception as e:
        print(f"Error adding sample data: {str(e)}")
    
    # Start the server
    app.run(debug=True, port=5000) 