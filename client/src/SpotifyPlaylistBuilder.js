export class SpotifyPlaylistBuilder {
	constructor(clientId, accessToken) {
		this.clientId = clientId;
		this.accessToken = accessToken;
		this.userId = null;
	}

	async setUserId() {

	const userData = await fetch('https://api.spotify.com/v1/me', {
		method: "GET",
		headers: {
	            "Authorization": 'Bearer ' + this.accessToken
	        }
	}).then((response) => response.json());

		this.userId = userData.id;
	}

	async exportPlaylist(playlistName, tracks) {
		let playlist = null;
		try {
			playlist = await this.createPlaylist(playlistName);
		} catch(error) {
			alert("Error Occurred During Playlist Creation. Spotify token probably expired. Sign into Spotify again and retry.");
			this.setState({playlistBuilder: null})
			return;
		}
		// max of 100 per request
		let necessaryRequests = Math.floor(tracks.length/100);
		if(tracks.length % 100 !== 0) {
			necessaryRequests++;
		}
		const tracksByRequest = [];
		for(let i = 0; i < tracks.length; i++) {
			if(i % 100 === 0) {
				tracksByRequest.push([]);
			}
			tracksByRequest[Math.floor(i/100)].push(tracks[i]);
		}
		const addTracksRequests = [];
		for(let i = 0; i < tracksByRequest.length; i++){
			addTracksRequests.push(await this.addTracksToPlaylist(tracksByRequest[i], playlist.id));
		}
		Promise.all(addTracksRequests).then(() =>
						alert("Playlist Created and Tracks Added")
		      		).catch(function(err) {
						alert("Error Occurred During Playlist Creation")
		      		});	
	}

	async addTracksToPlaylist(tracks, playlistId) {
		const data = {
  				'uris':tracks.map((track) => track.uri)
  			};

		return fetch('https://api.spotify.com/v1/playlists/' + playlistId + '/tracks', {
	        method: "POST", // *GET, POST, PUT, DELETE, etc.
	        headers: {
	            "Content-Type": "application/json",
	            "Authorization": 'Bearer ' + this.accessToken
	        },
	        body: JSON.stringify(data), // body data type must match "Content-Type" header
    	})
	}

	async createPlaylist(playlistName) {
		if(this.userId === null) {
			await this.setUserId();
		}

		const data = {
  				'name':playlistName
  			};

		const playlist = await fetch('https://api.spotify.com/v1/users/' + this.userId + '/playlists', {
	        method: "POST", // *GET, POST, PUT, DELETE, etc.
	        headers: {
	            "Content-Type": "application/json",
	            "Authorization": 'Bearer ' + this.accessToken
	        },
	        body: JSON.stringify(data), // body data type must match "Content-Type" header
    	}).then((response) => response.json());
    	
    	return playlist;
	}
}