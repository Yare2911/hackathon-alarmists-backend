import express from 'express';
import fs from 'fs';
import csv from 'csv-parser';
import chatCompletion from './service/openai.js';
import cors from 'cors';

const app = express();
app.use(cors());

function readTechRadarCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(
        csv({
          // Trim header names and values (optional but useful)
          mapHeaders: ({ header }) => header.trim(),
          mapValues: ({ value }) => value.toString().trim(),
        })
      )
      .on('data', (data) => {
        // Explicitly cast each field to string.
        results.push({
          Name: String(data.Name),
          Status: String(data.Status),
          Category: String(data.Category),
          Dependency: String(data.Dependency),
          Mentor: String(data.Mentor),
        });
      })
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

// Endpoint to process tech radar data from the CSV
app.get('/tech-radar', async (req, res) => {
  try {
    // Read and parse the CSV file (ensure the file is in your project root or update the path)
    const techRadarData = await readTechRadarCSV('./tech-radar/tech-radar.csv');

    // Build a prompt that includes the CSV data.
    // Here we format the data nicely using JSON.stringify.
    const prompt = `
      Here is our tech radar data:
      ${JSON.stringify(techRadarData, null, 2)}
      
      Could you provide insights or recommendations based on this data?
    `;

    // Get the OpenAI response for the prompt
    const response = await chatCompletion(prompt);

    // Return both the parsed CSV data and the AI's response
    res.json({ techRadarData, response });
  } catch (error) {
    console.error('Error processing tech radar CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Ensure this is placed after (or with) your other endpoints in server.js
app.get('/test', async (req, res) => {
  try {
    // Read and parse the CSV file (ensure the file path is correct)
    const techRadarData = await readTechRadarCSV('./tech-radar/tech-radar.csv');
    
    if (techRadarData.length === 0) {
      return res.status(404).send("No tech data available.");
    }
    
    // Pick a random tech entry from the CSV data
    //const randomTech = techRadarData[Math.floor(Math.random() * techRadarData.length)];

    const userPrompt = req.query.prompt || "Provide an amusing description.";

    // Build a composite prompt that includes the tech details and the user prompt.
    const prompt = `
      Provide a description for the following technology:
      
      Name: ${Name}
      Status: ${Status}
      Category: ${Category}
      Dependency: ${Dependency}
      Mentor: ${Mentor}
      
      ${userPrompt}
    `;

    // Call the chatCompletion function to get the AI's response.
    const response = await chatCompletion(prompt);
    res.send(response);
  } catch (error) {
    console.error("Error in /test endpoint:", error);
    res.status(500).send(error.message);
  }
});

