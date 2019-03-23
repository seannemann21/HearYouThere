// The idea to create Google Cloud Api key on startup from environment variable was taken from Nate Keeley https://medium.com/@nwkeeley/a-better-solution-would-be-to-4fde38db8401
// This allows me to avoid pushing sensitive information to code base (alternative was to add file with key to codebase)
const fs=require('fs');
fs.writeFile('./google-credentials-heroku.json', process.env.GOOGLE_CONFIG, (err) => {});