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

// Endpoint to process tech radar data from the CSV (lists all techs).
app.get('/tech-radar', async (req, res) => {
  try {
    // Read and parse the CSV file (ensure the file path is correct)
    const techRadarData = await readTechRadarCSV('./tech-radar/tech-radar.csv');

    // Build a prompt that includes the CSV data.
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

// Updated /test endpoint that uses a dynamic route parameter for the selected tech.
app.get('/test/:selected', async (req, res) => {
  try {
    // Read and parse the CSV file (ensure the file path is correct)
    const techRadarData = await readTechRadarCSV('./tech-radar/tech-radar.csv');

    if (techRadarData.length === 0) {
      return res.status(404).send("No tech data available.");
    }

    // Get the selected tech from the route parameter.
    const selectedTech = req.params.selected;

    // Find the matching tech entry (using case-insensitive comparison).
    const techEntry = techRadarData.find(
      tech => tech.Name.trim().toLowerCase() === selectedTech.trim().toLowerCase()
    );

    if (!techEntry) {
      return res.status(404).send("Tech not found.");
    }

    // Use an optional prompt query parameter or a default.
    const userPrompt = req.query.prompt || "Provide an amusing description.";

    // Build a composite prompt that includes the tech details and the user prompt.
    const prompt = `
Provide a description for the following technology:

Name: ${techEntry.Name}
Status: ${techEntry.Status}
Category: ${techEntry.Category}
Dependency: ${techEntry.Dependency}
Mentor: ${techEntry.Mentor}

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
