import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
const clientId = '0772a5231e724f94874272b38f9a6e21';

class SpotifyPlaylistBuilder {
	constructor(clientId, accessToken) {
		this.axios = require('axios');
		this.querystring = require('querystring');
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
		const playlist = await this.createPlaylist(playlistName);
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
			addTracksRequests.push(this.addTracksToPlaylist(tracksByRequest[i], playlist.id));
		}
		Promise.all(addTracksRequests).then(() =>
						alert("Playlist Created and Tracks Added")
		      		).catch(function(err) {
						alert("Error Occurred During Playlsit Creation")
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
    	}).then((response) => response.json())
    	
    	return playlist;
	}
}

class FestivalImage extends React.Component{

	constructor(props) {
		super(props);
		this.state = {validUrl: true}
	}

	async error() {
		await this.setState({validUrl:false});
		this.state.validUrl = true;
	}


	render() {
		return (
			<div className="artist-container-element">
			{this.state.validUrl ?
				<img className="festival-image" src={this.props.imageUrl} onError={() => this.error()}/>
				: <h4>Sorry, image couldn't be found.<br/>You could try:<br/>https://pbs.twimg.com/media/Dy16kT4W0AAJ8EW.jpg</h4>
			}
			</div>
		)
	}
}

class RemovableList extends React.Component{

	constructor(props) {
		super(props);
		this.requestPending = false;
		this.state = {additionInput: ""}
		this.updateAdditionInput = this.updateAdditionInput.bind(this);
	}

	renderArtistsPane() {
		const rows = [];
		if(this.props.items.length > 0) {
			rows.push(<ul className={this.props.listClass}>{this.renderItems()}</ul>);
		}

		return rows;
	}

	updateAdditionInput(event) {
		const updatedInput = event.target.value;
		this.setState({additionInput: updatedInput});
	}

	renderItems() {
		const rows = [];
		const listItems = this.props.items.map((item) =>
			<li onClick={() => this.props.itemClick(item)} key={item.key} className={this.props.itemClass}><span className={this.props.contentClass}>{item.value}</span><span className="close" onClick={(e) => this.props.remove(e, item.key)}>x</span></li>					
		);

		return listItems;
	}

	render() {
		return (
			<div className="artist-container-element">
					{this.renderArtistsPane()}
					{	this.props.addCallback ?
						<div>
							<input placeholder={this.props.placeholder} className="input" type="text" value={this.state.additionInput} onChange={this.updateAdditionInput}/>
							<button onClick={() => this.props.addCallback(this.state.additionInput)}>Add</button>
						</div>
						: ''
					}
			</div>
		)
	}
}

function getHashFragmentValue(key) {
	var hash = window.location.hash.substring(1);
	const pairs = hash.split('&');
	for(let i = 0; i < pairs.length; i++) {
		const keyValue = pairs[i].split('=');
		if(keyValue[0] === key) {
			return keyValue[1];
		}
	}

	return null;
}

class MainWidget extends React.Component{

	constructor(props) {
		super(props);

		const state = sessionStorage.getItem('state');
		if(state) {
			this.state = JSON.parse(state);
		} else {
			this.state = {imageUrl:"",
						  artists:[],
						  tracks:[],
						  requestPending: false,
						  playlistTitle:"",
						  invalidUrl: false
						 };
		}
		this.removeArtist = this.removeArtist.bind(this);
		this.removeTrack = this.removeTrack.bind(this);
		this.updateSelectedTrack = this.updateSelectedTrack.bind(this);
		this.updateImage = this.updateImage.bind(this);
		this.updatePlaylistTitle = this.updatePlaylistTitle.bind(this);
		this.axios = require('axios');

		const accessToken = getHashFragmentValue('access_token');
		if(accessToken !== null) {
			this.playlistBuilder = new SpotifyPlaylistBuilder(clientId, accessToken);
		}
	}

	async updatePlaylistTitle(event) {
		const playlistTitle = event.target.value;
		this.setState({playlistTitle: playlistTitle});
	}

	async updateImage(event) {
		const imageUrl = event.target.value;
		this.setState({imageUrl: imageUrl,
					   artists: [],
					   tracks: [],
					   requestPending: false,
					   playlistTitle: "",
					   invalidUrl: false
					   });

		if(imageUrl != "") {
			if(this.validateUrl(imageUrl)) {

				console.log("break1");
				const text = await fetch('text?imageUrl=' + imageUrl).then((response) => response.json());

				if(text[0]) {
					
				this.setState({
					   artists: [],
					   tracks: [],
					   requestPending: true,
					   playlistTitle: "",
					   invalidUrl: false});
					const rowsOfArtists = text[0].description.split('\n');
					const artistRequests = [];
					for(let i = 0; i < rowsOfArtists.length; i++) {
						const request = fetch('artists?line=' + rowsOfArtists[i]).then((response) => response.json()).then((data) => {
							const artists = this.state.artists;
							for(let i = 0; i < data.length; i++) {
								artists.push(data[i]);
							}
							this.setState({
								artists: this.state.artists,
								tracks: [],
								requestPending: this.state.requestPending,
								playlistTitle:"",
								invalidUrl: false
							});
						});
						artistRequests.push(request);
					}
					await Promise.all(artistRequests).then(() =>
						this.setState({
								artists: this.state.artists,
								tracks: this.state.tracks,
								requestPending: false,
					   			playlistTitle: "",
					   			invalidUrl: false
							})
							
		      		).catch(function(err) {
								this.setState({
									requestPending: false,
						   			playlistTitle: "",
						   			invalidUrl: false
								});
							  console.log(err.message);
					});	
				} else {
					this.setState({
								requestPending: false,
					   			playlistTitle: "",
					   			invalidUrl: false
							})
				}
			} else {
				console.log("break");
				this.setState({
								requestPending: false,
					   			playlistTitle: "",
					   			invalidUrl: true
							})
			}
		}
	}

	validateUrl(value) {
  		return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(value);
	}

	removeArtist(e, artistId) {
		const artists = this.state.artists;
		const updatedArtists = artists.filter(function(artist, index, arr){
    		return artist.id !== artistId;
		});
		this.setState({
			imageUrl: this.state.imageUrl,
			artists: updatedArtists,
			tracks: this.state.tracks,
			requestPending: this.state.requestPending
		})
	}

	removeTrack(e, trackId) {
		e.stopPropagation();
		const tracks = this.state.tracks;
		const updatedTracks = tracks.filter(function(track, index, arr){
    		return track.id !== trackId;
		});
		this.setState({
			imageUrl: this.state.imageUrl,
			artists: this.state.artists,
			tracks: updatedTracks
		})
	}

	async generatePlaylist() {
		const artists = this.state.artists;

		this.setState({imageUrl: this.state.imageUrl,
			   artists: this.state.artists,
			   tracks: [],
			   requestPending: true
			   });
		const trackRequests = [];
		for(let i = 0; i < artists.length; i++) {
			const trackRequest = fetch('tracks?artistId=' + artists[i].id + '&limit=5').then((response) => response.json()).then((data) => {
				const tracks = this.state.tracks;
				for(let i = 0; i < data.length; i++) {
					tracks.push(data[i]);
				}
				this.setState({
					imageUrl: this.state.imageUrl,
					artists: this.state.artists,
					tracks: tracks
				});
			});
			trackRequests.push(trackRequest);
		}

		await Promise.all(trackRequests).then(() =>
			this.setState({
					imageUrl: this.state.imageUrl,
					artists: this.state.artists,
					tracks: this.state.tracks,
					requestPending: false
				})
  		);
	}

	async exportPlaylist() {
		if(this.playlistBuilder) {
			this.playlistBuilder.exportPlaylist(this.state.playlistTitle, this.state.tracks)
		} else {
			alert("You must login to Spotify to export playlist.")
		}
	}

	async clearPlaylist() {
		this.setState({
			  	imageUrl:"",
				artists:[],
				tracks:[],
				requestPending: false,
				playlistTitle:"",
				invalidUrl: false
			 });
	}

	signIntoSpotify() {
		sessionStorage.setItem('state', JSON.stringify(this.state))
		window.location.assign('https://accounts.spotify.com/authorize?client_id=0772a5231e724f94874272b38f9a6e21&redirect_uri=https://5ac9fff3.ngrok.io/&scope=user-read-private%20playlist-modify-public%20user-read-email&response_type=token');
	}

	updateSelectedTrack(track) {
		this.setState({
			selectedTrack: track
		})
	}

	doNothing() {

	}

	getFormattedSelectedTrack() {
		const uri = this.state.selectedTrack.key;
		return "https://open.spotify.com/embed/track/" + uri;
	}

	async addArtist(artist) {
		const validatedArtist = await fetch('artist?artist=' + artist).then((response) => response.json()).catch((error) => alert("Artist couldn't be found."))
		if(validatedArtist){
			const artists = this.state.artists;
			artists.push(validatedArtist);
			this.setState({artists: artists});
		}

	}

	displayView() {
		const rows = [];
		if(this.state.imageUrl == "") {
			rows.push(
			<div>
				<div className="title-group">
					<div className = "title">
						Hear You There
					</div>
					<div className = "sub-title">
						Enter the URL of an image of a music lineup to generate a playlist
					</div>
				</div>
				<div className="btn-container">
					<div>
						<input placeholder="Image URL" className="image-input" disabled={this.state.requestPending} type="text" value={this.state.imageUrl} onChange={this.updateImage}/>
					</div>
					<button className="btn btn-primary" disabled={this.state.requestPending || this.state.artists.length === 0} onClick={() => this.generatePlaylist()}>Generate Playlist</button>
					<a className="btn btn-primary" href="https://accounts.spotify.com/authorize?client_id=0772a5231e724f94874272b38f9a6e21&redirect_uri=https://5ac9fff3.ngrok.io/&scope=user-read-private%20playlist-modify-public%20user-read-email&response_type=token">Spotify Login</a>
				</div>
			</div>
			);
		} else if(this.state.tracks.length == 0) {
			rows.push(
					<div>
						<div className="artist-container">
							<FestivalImage imageUrl={this.state.imageUrl}/>
							{this.state.artists.length > 0 ? (
								<RemovableList placeholder="Artist" addCallback={(artist) => this.addArtist(artist)} itemClick={this.doNothing} itemClass="shadow-sm artist-li" contentClass="" listClass="artist-list" items={this.state.artists.map(function(artist){return {key: artist.id, value: artist.name}})} remove={this.removeArtist}/>
							) : ('')}
						</div>
						<div className="btn-container">
							<div>
								<input placeholder="Image URL" className="image-input" disabled={this.state.requestPending} type="text" value={this.state.imageUrl} onChange={this.updateImage}/>
								{this.state.invalidUrl ? <div>invalidUrl</div> : ""}
							</div>
							<button className="btn btn-primary" disabled={this.state.requestPending || this.state.artists.length === 0} onClick={() => this.generatePlaylist()}>Generate Playlist</button>
							<a className="btn btn-primary" onClick={() => this.signIntoSpotify()}>Spotify Login</a>
						</div>
					</div>
					);
		} else {
			rows.push(
					<div>
						<div className ="artist-container">
							<RemovableList itemClick={this.updateSelectedTrack} itemClass="shadow-sm artist-li clickable" contentClass="track-content" listClass="track-list" items={this.state.tracks.map(function(track){return {key: track.id, value: track.artists[0].name + ": " + track.name}})} remove={this.removeTrack}/>
							{this.state.selectedTrack ? 
								<iframe className="artist-container-element" src={this.getFormattedSelectedTrack()} width="300" height="400" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
								: ''}
						</div>
						<div className="btn-container">
							<div>
								<input placeholder="Playlist Title" className="image-input" type="text" value={this.state.playlistTitle} onChange={this.updatePlaylistTitle}/>
							</div>
							<button disabled={this.state.requestPending} className="btn btn-primary" onClick={() => this.exportPlaylist()}>Export Playlist</button>
							<button className="btn btn-primary" onClick={() => this.clearPlaylist()}>Clear Playlist</button>
							<a className="btn btn-primary" onClick={() => this.signIntoSpotify()}>Spotify Login</a>
						</div>
					</div>
					);
		}

		return rows;
	}

	render() {
		return (
			<div>
				{this.displayView()}
			</div>
		)
	}
}

class Footer extends React.Component{
	render() {
		return	(
			<div className="footer">
			Hear You There • A Sean Nemann App • Github <a className="footer-link" href="https://github.com/seannemann21/">https://github.com/seannemann21/</a>
			</div>
		)
	}
}

class MainPage extends React.Component{
	render() {
		return(
		<div>
			<div className="main-container">
				<MainWidget/>
			</div>
			<Footer/>
		</div>
		)
	}
}

ReactDOM.render(<MainPage />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change

