const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const client_id = '0772a5231e724f94874272b38f9a6e21';
const client_secret = '1fb9ba7e3e7c495bbaab4f3f8349defd';

// console.log that your server is up and running
app.listen(port, () => console.log(`Listening on port ${port}`));


// create a GET route
app.get('/image', async (req, res) => {
  const imageUrl = req.query.imageUrl;
  res.send(await fetchTextFromImage(imageUrl));
});

app.get('/tracks', async (req, res) => {
  const artistId = req.query.artistId;
  const limit = req.query.limit;
  const searcher = new SpotifySearcher(client_id, client_secret);
  await searcher.authenticate();
  searcher.getTopTracks(artistId).then((response) => {
  	const tracks = response.data.tracks;
  	const artistTracks = tracks.filter((track, index, arr) => {
  		return track.artists[0].id === artistId;
  	});
  	const limitedTracks = artistTracks.filter((track, index, arr) => {
  		return index < limit;
  	});

  	res.send(limitedTracks);
  });
});

app.get('/text', async (req, res) => {
  const imageUrl = req.query.imageUrl;
  res.send(await fetchTextFromImage(imageUrl));
});

app.get('/artists', async (req, res) => {
	const line = req.query.line.replace(/&/g, 'and').replace(/\./g,'').split(' ');
	const searcher = new SpotifySearcher(client_id, client_secret);
	await searcher.authenticate();
	try{
      	const lineValidatedArtists = [];
      	let startIndex = 0;
      	let endIndex = 0;
      	while(startIndex < line.length) {
      		let artistQuery = line[startIndex];
      		for(let j = startIndex + 1; j <= endIndex && j < line.length; j++) {
      			artistQuery += ' ' + line[j];
      		}
      		let validatedArtist = null;
      		let response = null;
      		if(artistQuery.toUpperCase() !== 'THE' && artistQuery.match(/^[a-zA-Z0-9 .-]+$/)) {	
		      	console.log(artistQuery);
		      	try{
			    	response = await searcher.searchArtist(encodeURI(artistQuery));
		    		validatedArtist = validateSearchResponse(line, startIndex, response);
		    	} catch(e) {
		    		await sleep(2000)
			    	response = await searcher.searchArtist(encodeURI(artistQuery));
		    		validatedArtist = validateSearchResponse(line, startIndex, response);
		    	}
      		}
	    	if(validatedArtist !== null) {
	    		lineValidatedArtists.push(validatedArtist);
	    		endIndex += validatedArtist.name.split(' ').length;
	    		startIndex = endIndex;
	    	} else if(response !== null && response.data.artists.items.length === 0) {
	    		// move to next word since no results
	    		startIndex++;
    			endIndex = startIndex;
	    	} else {
	    		endIndex++;
	    		if(endIndex > line.length) {
	    			startIndex++;
	    			endIndex = startIndex;
	    		}
	    	}
      	}
      	res.send(lineValidatedArtists);
      } catch(e) {
      	console.log(e);
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
      const validatedArtist = validateSingleArtist(artist, response);
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

app.get('/test', async (req, res) => {

  res.send("response");
});

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

function validateSingleArtist(query, response) {
	console.log(response.data);
	const items = response.data.artists.items;
	for(let i = 0; i < items.length; i++) {
		if(items[i].name.toUpperCase() === query.toUpperCase()) {
			console.log(query.toUpperCase + "    " + items[i].name.toUpperCase())
			return items[i];
		}
	}

	return null;
}

function validateSearchResponse(line, startIndex, response) {
	const items = response.data.artists.items;
	// longer artists should be checked first since they are less likely to 'accidentally' appear
	// for example if band name is Red Pants and a there is a band named Red and a band named Red Pants
	// then we should check Red Pants first since it is more likely that the band referred to is Red Pants
	// as opposed to one band named Red and another named Pants
	const itemsOrderedByLength = items.slice().sort(function(a, b) { return b.name.split(' ').length - a.name.split(' ').length});
	for(let i = 0; i < itemsOrderedByLength.length; i++) {
		let artist = itemsOrderedByLength[i].name.split(' ');
		let artistFound = false;
		if(startIndex + artist.length <= line.length) {
			artistFound = true;
			for(let j = 0; j < artist.length; j++) {
				if(artist[j].toUpperCase() !== line[startIndex + j].toUpperCase().replace(/\./g,'')) {
					artistFound = false;
					break;
				}
			}
		}
		if(artistFound) {
			return itemsOrderedByLength[i];
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
  console.log(result);
  return result;
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

		return await this.axios.get('https://api.spotify.com/v1/search?q="' + query + '"&type=artist&limit=3' , config);
	}

	async searchTrack(query) {
		var config = {
  			headers: {'Authorization': 'Bearer ' + this.accessToken}
		};	

		return await this.axios.get('https://api.spotify.com/v1/search?q="' + query + '"&type=track&limit=10' , config);
	}

	async getTopTracks(artistId) {
		var config = {
  			headers: {'Authorization': 'Bearer ' + this.accessToken}
		};	

		return await this.axios.get('https://api.spotify.com/v1/artists/' + artistId + '/top-tracks?country=US' , config);
	}
}