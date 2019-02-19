const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const client_id = '0772a5231e724f94874272b38f9a6e21';
const client_secret = '1fb9ba7e3e7c495bbaab4f3f8349defd';

// console.log that your server is up and running
app.listen(port, () => console.log(`Listening on port ${port}`));

// create a GET route
app.get('/artists', async (req, res) => {

  const imageUrl = req.query.imageUrl;
  const detections = await fetchTextFromImage(imageUrl);
  const rowsOfArtists = detections[0].description.replace(/&/g, 'and').split('\n');
  const rowsToParse = [];
  for(let i=12; i<14;i++) {
  	rowsToParse.push(rowsOfArtists[i]);
  }
  const searcher = new SpotifySearcher(client_id, client_secret);
  let sleepTime = 100;
  let rowsCompleted = 0;
    try {
      const validatedArtists = [];
      await searcher.authenticate();
   	const promiseArray = [];
      for(let i=0; i < rowsOfArtists.length; i++) {
   		await sleep(i*sleepTime);
      	let promise = new Promise(async function(resolve, reject) {
      		try{
      	const lineValidatedArtists = [];
      	const line = rowsOfArtists[i].split(' ');
      	let startIndex = 0;
      	let endIndex = 0;
      	while(startIndex < line.length) {
      		let artistQuery = line[startIndex];
      		for(let j = startIndex + 1; j <= endIndex && j < line.length; j++) {
      			artistQuery += ' ' + line[j];
      		}
      		let validatedArtist = null;

      		if(artistQuery.toUpperCase() !== 'THE' && artistQuery.match(/^[a-zA-Z0-9 .]+$/)) {		
		      	console.log(artistQuery);		    
	      		await sleep((rowsOfArtists.length - rowsCompleted) * sleepTime);
			    const response = await searcher.searchArtist(encodeURI(artistQuery));
		    	validatedArtist = validateSearchResponse(line, startIndex, response);
      		}
	    	if(validatedArtist !== null) {
	    		lineValidatedArtists.push(validatedArtist);
	    		endIndex += validatedArtist.name.split(' ').length;
	    		startIndex = endIndex;
	    	} else {
	    		endIndex++;
	    		if(endIndex > line.length) {
	    			startIndex++;
	    			endIndex = startIndex;
	    		}
	    	}
      	}

      	rowsCompleted++;

      	resolve(lineValidatedArtists);
      } catch(e) {
      	console.log(e);
      }
      });
      promiseArray.push(promise);
      }
      await Promise.all(promiseArray).then(function(allLineValidatedArtists) {
      	for(let i = 0; i < allLineValidatedArtists.length; i++) {
      		for(let j = 0; j < allLineValidatedArtists[i].length; j++) {
		      	validatedArtists.push(allLineValidatedArtists[i][j].name + "    " + allLineValidatedArtists[i][j].popularity);
      		}
      	}
      })

      //const artistNames = validatedArtists.map(artist => {return artist.name});
	  res.send(validatedArtists);
 	} catch (error) {
 	  console.log(error);
	  res.send(error);
  }
});

// create a GET route
app.get('/artist', async (req, res) => {

  const artist = req.query.artist;
  //const detections = await fetchTextFromImage(imageUrl);

  const searcher = new SpotifySearcher(client_id, client_secret);

    try {
      await searcher.authenticate();
      const response = await searcher.searchArtist(artist);
      //const validatedArtist = validateSearchResponse(artist, response, startIndex);
      if(validatedArtist === null) {
      	res.send("unknown artist")
      } else {
		  res.send(validatedArtist);
      }
 	} catch (error) {
 	  console.log(error);
	  res.send(error);
  }
});

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

function validateSearchResponse(query, response) {
	const items = response.data.artists.items;
	for(let i = 0; i < items.length; i++) {
		if(items[i].name.toUpperCase() === query.toUpperCase() && items[i].popularity > 30) {
			return items[i];
		}
	}

	return null;
}

function validateSearchResponse(line, startIndex, response) {
	const items = response.data.artists.items;
	for(let i = 0; i < items.length; i++) {
		let artist = items[i].name.split(' ');
		let artistFound = false;
		if(startIndex + artist.length <= line.length) {
			artistFound = true;
			for(let j = 0; j < artist.length; j++) {
				if(artist[j].toUpperCase() !== line[startIndex + j].toUpperCase()) {
					artistFound = false;
					break;
				}
			}
		}
		if(artistFound) {
			return items[i];
		}
	}

	return null;
}

// taken from Google documentation
async function fetchTextFromImage(imageUrl) {
  // Imports the Google Cloud client library
  const vision = require('@google-cloud/vision');

  // Creates a client
  const client = new vision.ImageAnnotatorClient();

  // Performs label detection on the image file
  const [result] = await client.documentTextDetection(imageUrl);
  const detections = result.textAnnotations;
  return detections;
}



class SpotifySearcher {
	constructor(clientId, clientSecret) {
		this.axios = require('axios');
		this.querystring = require('querystring');
		this.clientId = clientId;
		this.clientSecret = clientSecret;
	}

	async authenticate() {
		const base64EncodedCredentials = Buffer.from(this.clientId + ':' + this.clientSecret).toString('base64');
		var config = {
  			headers: {'Authorization': 'Basic ' + base64EncodedCredentials}
		};	

		const response = await this.axios.post('https://accounts.spotify.com/api/token', this.querystring.stringify({ grant_type: 'client_credentials' }), config);
		this.accessToken = response.data.access_token;
	}

	async searchArtist(query) {
		var config = {
  			headers: {'Authorization': 'Bearer ' + this.accessToken}
		};	

		return await this.axios.get('https://api.spotify.com/v1/search?q="' + query + '"&type=artist&limit=1' , config);
	}
}