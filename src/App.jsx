import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import axios from "axios";
function App() {
  const [question, setquestion] = useState("");
  const [answer,setanswer]= useState("");
  async function generateAnswer(){
    setanswer("loading");
    const response = await axios({
       url:"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDOS_NvkSys31-7LWyaeOFncwDvjx7NbOk",
       method: "post",
       data: {
        contents: [{
          parts:[{text: question}]
          }],
         },
       
    });
   setanswer(response["data"]["candidates"][0]["content"]["parts"][0]["text"]);
  }
  return (
    <>
      <h1>Chat Ai</h1>
      <textarea value={question} onChange={(e)=>setquestion(e.target.value)} cols ="30" rows="10"></textarea>
      <button onClick={generateAnswer}> Generate answer</button>
      <pre>{answer}</pre>
    </>
  )
}

export default App
