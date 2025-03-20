import { useState } from 'react'
import './App.css'
import axios from "axios";

function App() {
  const [answer, setAnswer] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cropType, setCropType] = useState("");

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
    
    // Create request payload with a prompt that asks for crop disease identification and treatment
    const payload = {
      contents: [{
        parts: [
          { text: `Please analyze this image of a ${cropType ? cropType : "crop"} plant. Identify any visible disease or pest infestation, explain what it is, describe its symptoms, and provide detailed information about available treatments or preventive measures that farmers can use. Include both organic and chemical treatment options when applicable. If you cannot identify a specific disease, provide general information about potential issues based on the visual symptoms.` }
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
      
      setAnswer(response["data"]["candidates"][0]["content"]["parts"][0]["text"]);
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
            <button className="new-analysis-button" onClick={handleRemoveImage}>New Analysis</button>
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