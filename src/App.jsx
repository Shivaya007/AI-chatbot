import { useState } from 'react'
import './App.css'
import axios from "axios";

function App() {
  const [answer, setAnswer] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cropType, setCropType] = useState("");
  const [todoList, setTodoList] = useState([]);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoDueDate, setNewTodoDueDate] = useState(new Date().toISOString().split('T')[0]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      
      // Create preview URL for the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreview(null);
    setAnswer("");
  };

  async function analyzeCropDisease() {
    if (!image) {
      setAnswer("Please upload an image of your crop first.");
      return;
    }

    setIsLoading(true);
    setAnswer("");
    
    // Enhanced prompt requesting structured disease information including severity percentage and timespan
    const payload = {
      contents: [{
        parts: [
          { text: `Please analyze this image of a ${cropType ? cropType : "crop"} plant and provide a comprehensive analysis in the following structured format:

1. DISEASE IDENTIFICATION: Name the specific disease or pest infestation visible in the image.
2. SEVERITY ASSESSMENT: Provide an estimated percentage of disease severity/affected area (e.g., 25%, 60%, 80%).
3. VISIBLE SYMPTOMS: List all visible symptoms present in the image.
4. ADDITIONAL SYMPTOMS: Mention other symptoms that may develop as the disease progresses.
5. TREATMENT OPTIONS:
   a) Organic/Natural treatments with application instructions
   b) Chemical treatments with application instructions and safety precautions
   c) Cultural practices that can help manage this disease
6. RECOMMENDED TREATMENT PLAN: Provide a step-by-step treatment plan with specific timeframes (days/weeks) for each action.
7. PREVENTION MEASURES: How to prevent this disease in future growing seasons.

If you cannot identify a specific disease with high confidence, indicate this clearly and provide analysis based on the visible symptoms.Answer this in very concise way except recommendation plan` }
        ]
      }]
    };
    
    // Add image to payload
    try {
      const base64Image = await convertImageToBase64(image);
      payload.contents[0].parts.push({
        inline_data: {
          mime_type: image.type,
          data: base64Image.split(',')[1] // Remove the data URL prefix
        }
      });
      
      const response = await axios({
        url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDOS_NvkSys31-7LWyaeOFncwDvjx7NbOk",
        method: "post",
        data: payload,
      });
      
      setAnswer(response["data"]["candidates"][0]["content"]["parts"][0]["text"].replace(/\*/g, ''));
    } catch (error) {
      console.error("Error analyzing crop disease:", error);
      setAnswer("Error: " + (error.response?.data?.error?.message || "Failed to analyze the crop image. Please try again with a clearer photo."));
    } finally {
      setIsLoading(false);
    }
  }
  
  // Function to convert image file to base64
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Function to extract treatment plan steps and add them to the todo list
  const extractTreatmentPlan = () => {
    if (!answer) return;
    
    // Look for the treatment plan section
    const treatmentPlanRegex = /RECOMMENDED TREATMENT PLAN:[\s\S]*?(?=\d+\.\s*[A-Z]|$)/i;
    const treatmentPlanMatch = answer.match(treatmentPlanRegex);
    
    if (treatmentPlanMatch) {
      const treatmentPlanText = treatmentPlanMatch[0];
      
      // Extract individual steps using regex
      const stepsRegex = /(?:[-•]|\d+\.)\s*(.*?)(?=(?:[-•]|\d+\.)|$)/g;
      const steps = [];
      let match;
      
      // First try to find numbered or bulleted items
      while ((match = stepsRegex.exec(treatmentPlanText)) !== null) {
        if (match[1].trim()) {
          steps.push(match[1].trim());
        }
      }
      
      // If no steps found with bullets/numbers, try to split by newlines
      if (steps.length === 0) {
        const lines = treatmentPlanText.split('\n')
          .filter(line => line.trim() && !line.includes('RECOMMENDED TREATMENT PLAN:'))
          .map(line => line.trim());
        
        steps.push(...lines);
      }
      
      // Create todo items from the steps
      const newTodos = steps.map(step => ({
        id: Date.now() + Math.random(),
        text: step,
        completed: false,
        dueDate: calculateDueDate(step)
      }));
      
      if (newTodos.length > 0) {
        setTodoList(newTodos);
        setShowTodoModal(true);
        return true;
      }
    }
    
    return false;
  };
  
  // Function to estimate a due date based on text content
  const calculateDueDate = (text) => {
    const today = new Date();
    let daysToAdd = 7; // Default 1 week
    
    // Look for time indicators in the text
    if (/immediately|today|right away|first day/i.test(text)) {
      daysToAdd = 0;
    } else if (/tomorrow|next day|day after/i.test(text)) {
      daysToAdd = 1;
    } else if (/within (\d+) days/i.test(text)) {
      const match = text.match(/within (\d+) days/i);
      daysToAdd = parseInt(match[1]);
    } else if (/within a week|7 days/i.test(text)) {
      daysToAdd = 7;
    } else if (/within two weeks|14 days/i.test(text)) {
      daysToAdd = 14;
    } else if (/within a month|30 days/i.test(text)) {
      daysToAdd = 30;
    }
    
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + daysToAdd);
    return dueDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };
  
  // Function to toggle the completion status of a todo item
  const toggleTodo = (id) => {
    setTodoList(prevList => 
      prevList.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };
  
  // Function to remove a todo item
  const removeTodo = (id) => {
    setTodoList(prevList => prevList.filter(todo => todo.id !== id));
  };
  
  // Function to add a custom todo item
  const addCustomTodo = (e) => {
    e.preventDefault();
    
    if (newTodoText.trim()) {
      const newTodo = {
        id: Date.now() + Math.random(),
        text: newTodoText.trim(),
        completed: false,
        dueDate: newTodoDueDate
      };
      
      setTodoList(prevList => [...prevList, newTodo]);
      setNewTodoText("");
      setNewTodoDueDate(new Date().toISOString().split('T')[0]);
    }
  };

  // Function to format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Check if due date is past
  const isPastDue = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    return dueDate < today;
  };

  // Common crop types for selection
  const cropTypes = [
    "Rice", "Wheat", "Corn/Maize", "Soybean", "Tomato", "Potato", 
    "Cotton", "Coffee", "Tea", "Apple", "Grape", "Citrus", 
    "Banana", "Cassava", "Sugarcane", "Other"
  ];

  return (
    <>
      <h1>Crop Disease Predictor</h1>
      <p className="description">Upload a photo of your crop to identify diseases and get treatment recommendations</p>
      
      <div className="crop-selector">
        <label htmlFor="crop-type">Select Your Crop Type:</label>
        <select 
          id="crop-type" 
          value={cropType} 
          onChange={(e) => setCropType(e.target.value)}
        >
          <option value="">Select crop type</option>
          {cropTypes.map((crop) => (
            <option key={crop} value={crop}>{crop}</option>
          ))}
        </select>
      </div>
      
      <div className="image-upload-container">
        <label htmlFor="image-upload" className="upload-label">
          Upload Crop Photo
        </label>
        <input 
          id="image-upload"
          type="file" 
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        
        {imagePreview && (
          <div className="preview-container">
            <img 
              src={imagePreview} 
              alt="Preview" 
              className="image-preview" 
            />
            <div className="button-group">
              <button 
                onClick={handleRemoveImage}
                className="remove-button"
              >
                Remove Image
              </button>
              <button 
                onClick={analyzeCropDisease} 
                className="analyze-button"
                disabled={isLoading}
              >
                {isLoading ? "Analyzing..." : "Diagnose Crop"}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {!imagePreview && (
        <div className="upload-placeholder">
          <div className="placeholder-icon">🌱</div>
          <p>Upload a clear image of your crop showing the affected parts</p>
          <p className="upload-tip">Tip: Close-up photos of leaves, stems, or fruits work best</p>
        </div>
      )}
      
      {isLoading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Analyzing crop condition...</p>
        </div>
      )}
      
      {answer && !isLoading && (
        <div className="result-container">
          <h2>Crop Analysis Results</h2>
          <div className="analysis-content">
            {answer}
          </div>
          <div className="action-buttons">
            <button className="save-result-button">Save Results</button>
            <button 
              className="treatment-plan-button" 
              onClick={() => {
                const success = extractTreatmentPlan();
                if (!success) {
                  alert("No treatment plan steps could be detected. Try adding steps manually to your to-do list.");
                }
              }}
            >
              Add Treatment to To-Do List
            </button>
            <button 
              className="view-todo-button" 
              onClick={() => setShowTodoModal(true)}
            >
              View To-Do List
            </button>
            <button className="new-analysis-button" onClick={handleRemoveImage}>New Analysis</button>
          </div>
        </div>
      )}

      {/* Todo List Modal */}
      {showTodoModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Treatment Plan To-Do List</h2>
              <button 
                className="close-modal-button"
                onClick={() => setShowTodoModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={addCustomTodo} className="add-todo-form">
                <div className="form-row">
                  <input 
                    type="text" 
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                    placeholder="Add a new treatment task..." 
                    required
                    className="todo-input"
                  />
                  <input 
                    type="date" 
                    value={newTodoDueDate}
                    onChange={(e) => setNewTodoDueDate(e.target.value)}
                    className="date-input"
                  />
                  <button type="submit" className="add-button">Add Task</button>
                </div>
              </form>
              
              <div className="todo-table-container">
                <table className="todo-table">
                  <thead>
                    <tr>
                      <th className="status-col">Status</th>
                      <th className="task-col">Treatment Task</th>
                      <th className="date-col">Due Date</th>
                      <th className="action-col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todoList.length > 0 ? (
                      todoList.map(todo => (
                        <tr 
                          key={todo.id} 
                          className={`${todo.completed ? 'completed-row' : ''} ${isPastDue(todo.dueDate) && !todo.completed ? 'overdue-row' : ''}`}
                        >
                          <td className="status-col">
                            <label className="todo-checkbox">
                              <input 
                                type="checkbox" 
                                checked={todo.completed} 
                                onChange={() => toggleTodo(todo.id)} 
                              />
                              <span className="checkmark"></span>
                            </label>
                          </td>
                          <td className="task-col">
                            <span className={todo.completed ? 'completed-text' : ''}>{todo.text}</span>
                          </td>
                          <td className="date-col">
                            <span className={isPastDue(todo.dueDate) && !todo.completed ? 'overdue-date' : ''}>
                              {formatDate(todo.dueDate)}
                            </span>
                          </td>
                          <td className="action-col">
                            <button 
                              className="remove-todo-button" 
                              onClick={() => removeTodo(todo.id)}
                              title="Remove task"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="empty-table-message">
                          No treatment tasks yet. Add tasks manually or generate them from an analysis.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {todoList.length > 0 && (
                <div className="todo-summary">
                  <div className="progress-container">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${(todoList.filter(todo => todo.completed).length / todoList.length) * 100}%` }}
                    ></div>
                  </div>
                  <p className="progress-text">
                    {todoList.filter(todo => todo.completed).length} of {todoList.length} tasks completed
                  </p>
                </div>
              )}
            </div>
            
            <div className="modal-footer">
              <button 
                className="close-button" 
                onClick={() => setShowTodoModal(false)}
              >
                Close
              </button>
              {todoList.length > 0 && (
                <button 
                  className="print-button"
                  onClick={() => window.print()}
                >
                  Print To-Do List
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="disclaimer">
        <p>Disclaimer: This tool provides agriculture information for guidance only. Results should be verified by agricultural experts. Treatment recommendations should be applied according to local regulations and best practices.</p>
      </div>

      <footer className="app-footer">
        <p>Crop Disease Predictor | Helping farmers identify and treat crop diseases efficiently</p>
      </footer>
    </>
  )
}

export default App