# Insight AI 🧠 

**Insight AI** is a full-stack NLP-powered web application that instantly extracts and analyzes thousands of Amazon customer reviews to generate structured executive summaries, highlights, and areas for improvement.

Built with a modular microservice architecture, this project seamlessly bridges a React/Next.js frontend, a Node.js Express API, and an isolated Python NLP worker to handle heavy data processing without blocking the main event loop.

---

## 🚀 Features

* **Instant NLP Summarization:** Uses Natural Language Processing (NLTK) to analyze raw review data and extract meaningful insights.
* **Microservice Architecture:** Node.js backend delegates heavy computational Python scripts using isolated child processes.
* **Persistent Storage:** MongoDB Atlas securely logs and caches search histories and API responses.
* **Asynchronous Error Handling:** Gracefully catches API limits, invalid URLs, and network failures with user-friendly UI feedback.
* **Premium Glassmorphism UI:** Built with Tailwind CSS and Next.js for a highly responsive, modern dark-mode aesthetic.

---

## 🛠️ Tech Stack

**Frontend:**
* Next.js (React)
* Tailwind CSS
* Axios (Data Fetching)

**Backend:**
* Node.js & Express.js
* MongoDB Atlas & Mongoose (ODM)
* Python (Child Process)

**NLP & Data:**
* Python 3
* NLTK (Natural Language Toolkit)
* RapidAPI (Amazon Review Extraction)

---

## ⚙️ System Architecture

1. **Client Request:** The user submits a standard Amazon desktop URL via the Next.js frontend.
2. **API Gateway:** The Node.js server validates the payload and extracts the product ASIN using Regex.
3. **Task Delegation:** Node.js spawns a Python worker process and passes the ASIN.
4. **Data Fetching:** Python connects to RapidAPI to scrape top reviews for that specific ASIN.
5. **NLP Pipeline:** NLTK processes the text, running part-of-speech tagging (`averaged_perceptron_tagger`) to identify key pros and cons.
6. **Data Persistence:** The structured JSON is passed back to Node.js and saved to MongoDB.
7. **Client Delivery:** The final insights are pushed to the frontend and rendered in the Bento Box UI.

---

## 💻 Getting Started (Local Development)

### Prerequisites
* Node.js (v18+)
* Python (3.8+)
* MongoDB Atlas Account
* RapidAPI Account

### 1. Clone the repository
git clone [https://github.com/Arman0206/insight-ai-analyzer.git](https://github.com/Arman0206/insight-ai-analyzer.git)
cd insight-ai-analyzer
2. Backend Setup
Bash
cd backend
npm install
Create a .env file in the backend directory:

Code snippet
PORT=5000
MONGODB_URI=your_mongodb_connection_string
RAPIDAPI_KEY=your_rapidapi_key
PYTHON_EXECUTABLE=python_worker\venv\Scripts\python.exe
3. Python Worker Setup
Bash
cd backend/python_worker
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
4. Frontend Setup
Bash
cd ../../frontend
npm install
Create a .env.local file in the frontend directory:

Code snippet
NEXT_PUBLIC_API_URL=http://localhost:5000/analyze
5. Run the Application
You will need two terminals.

Terminal 1 (Backend):

Bash
cd backend
node server.js
Terminal 2 (Frontend):

Bash
cd frontend
npm run dev
Navigate to http://localhost:3000 to view the application.

🔮 Future Enhancements:

Implement Redis caching to serve previously searched ASINs instantly.

Add user authentication (NextAuth) to save personal dashboards.

Expand API support for multi-region links (.in, .co.uk).
