import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
const clientId = '0772a5231e724f94874272b38f9a6e21';

const state = {
    ARTIST_VIEW: 'artist',
    PLAYLIST_VIEW: 'playlist',
    TITLE_VIEW: 'title'
}

class SpotifyPlaylistBuilder {
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
			<>
			{ this.state.validUrl ?
				<div className="col col-md-5 artist-container-element"><img className="festival-image" src={this.props.imageUrl} onError={() => this.error()}/></div>
				: <div className="col artist-container-element"><h4 className="no-content-text">Sorry, image couldn't be found.<br/>You could try:<br/>https://pbs.twimg.com/media/Dy16kT4W0AAJ8EW.jpg</h4></div>
			}
			</>
		)
	}
}

class RemovableList extends React.Component{

	constructor(props) {
		super(props);
		this.requestPending = false;
		this.state = {additionInput: "",
					  addRequestInFlight: false}
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

	async addItem(item) {
		this.setState({addRequestInFlight: true});
		if(await this.props.addCallback(item)) {
			this.setState({additionInput: ""});
		}
		this.setState({addRequestInFlight: false});

	}

	renderItems() {
		const rows = [];
		const listItems = this.props.items.map((item) =>
			<li onClick={() => this.props.itemClick(item)} key={item.key} className={this.props.itemClass}><span className={this.props.contentClass + " artist-li-content"}>{item.value}</span><span className="close" onClick={(e) => this.props.remove(e, item.key)}>x</span></li>					
		);

		return listItems;
	}

	render() {
		return (
			<div className="artist-container-element">
					{this.renderArtistsPane()}
					{	this.props.addCallback ?
						<div className="form-inline">
							<input placeholder={this.props.placeholder} className="input form-control add-input" type="text" value={this.state.additionInput} onChange={this.updateAdditionInput}/>
							<button disabled={this.state.addRequestInFlight} className="btn btn-primary add-btn" onClick={() => this.addItem(this.state.additionInput)}>Add</button>
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

class ButtonContainer extends React.Component {

	render() {
		return (
			<div className="btn-container container-fluid">
					<div className="row">
						<input placeholder={this.props.inputPlaceholder} className="image-input col-10 offset-1 col-md-8 offset-md-2" type="text" value={this.props.inputText} onChange={this.props.inputChange}/>
					</div>
					<div className="row btn-row">
						{this.props.viewState === state.TITLE_VIEW || this.props.viewState === state.ARTIST_VIEW ?
							<button className="btn btn-primary" disabled={this.props.requestPending || this.props.artists.length === 0} onClick={() => this.props.generatePlaylist()}>Generate Playlist</button>
							: ''
						}
						{this.props.viewState === state.PLAYLIST_VIEW ?
							<>
								<button disabled={this.props.requestPending} className="btn btn-primary" onClick={() => this.props.clearPlaylist()}>Clear Playlist</button>
								<button disabled={!this.props.signedIntoSpotify || this.props.requestPending || this.props.inputText === ""} className="btn btn-primary" onClick={() => this.props.exportPlaylist()}>Export Playlist</button>
							</>
							: ''
						}
						{ !this.props.signedIntoSpotify ?
							<a className="btn btn-primary" onClick={() => this.props.signIntoSpotify()}>Spotify Login</a>
						  : ''
						}
						{this.props.invalidUrl ? <div>invalidUrl</div> : ""}
					</div>
			</div>
		)
	}

}

class MainTitle extends React.Component {
	render() {
		return (
			<div className="title-group">
				<div className = "title col">
					Hear You There
				</div>
				<div className = "sub-title col-10 offset-1">
					Enter the URL of an image of a music lineup to generate a playlist
				</div>
			</div>
		);
	}
}

class MainWidget extends React.Component{

	constructor(props) {
		super(props);

		const state = sessionStorage.getItem('state');
		
		if(state) {
			try{
				this.state = JSON.parse(state);
			} catch(err) {
				this.state = {imageUrl:"",
						  artists:[],
						  tracks:[],
						  requestPending: false,
						  playlistTitle:"",
						  invalidUrl: false
				};
			}
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

		const accessToken = getHashFragmentValue('access_token');
		if(accessToken !== null) {
			this.playlistBuilder = new SpotifyPlaylistBuilder(clientId, accessToken);
			setTimeout(() => {
				this.setState({playlistBuilder: null});
				alert("Spotify login has expired. You must sign in again.");
			},60*60*1000)
		}
	}

	async updatePlaylistTitle(event) {
		const playlistTitle = event.target.value;
		this.setState({playlistTitle: playlistTitle});
	}

	async updateImage(event) {
		const imageUrl = event.target.value;
		this.setState({imageUrl: imageUrl});

		if(this.validateUrl(imageUrl)) {
				this.setState({
				   artists: [],
				   requestPending: true,
				   invalidUrl: false
			    });

				const response = await fetch('text?imageUrl=' + imageUrl).then((response) => response.json());

				if(!response.error && response.textAnnotations) {

					const rowsOfArtists = response.textAnnotations[0].description.split('\n');
					const artistRequests = [];
					for(let i = 0; i < rowsOfArtists.length; i++) {
						const request = fetch('artists?line=' + rowsOfArtists[i]).then((response) => response.json()).then((data) => {
							const artists = this.state.artists.slice();
							for(let j = 0; j < data.length; j++) {
								const artist = {
									artistData: data[j],
									row: i
								}
								// avoid duplicates
								if(artists.filter(a => a.artistData.id === artist.artistData.id).length === 0) {
									artists.push(artist);
								}
							}
							artists.sort((a, b) => {
								return a.row - b.row;
							});
							this.setState({
								artists: artists
							});
						});
						artistRequests.push(request);
					}
					await Promise.all(artistRequests).then(() =>
						this.setState({
								requestPending: false,
					   			invalidUrl: false
							})
							
		      		).catch((err) => {
								this.setState({
									requestPending: false,
						   			invalidUrl: false
								});
							  console.log(err.message);
					});	
				} else {
					alert("Unable to process image. Try another one")
					this.setState({
						requestPending: false,
			   			invalidUrl: false
					})
				}
		} else {
			this.setState({
				requestPending: false,
	   			invalidUrl: true
			})
		}
	}

	validateUrl(value) {
  		return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(value);
	}

	removeArtist(e, artistId) {
		const artists = this.state.artists.slice();
		const updatedArtists = artists.filter(function(artist, index, arr){
    		return artist.artistData.id !== artistId;
		});
		this.setState({
			artists: updatedArtists
		})
	}

	removeTrack(e, trackId) {
		// if click bubbles then song would be selected in player
		e.stopPropagation();
		const tracks = this.state.tracks.slice();
		const updatedTracks = tracks.filter(function(track, index, arr){
    		return track.trackData.id !== trackId;
		});
		this.setState({
			tracks: updatedTracks
		})
	}

	async generatePlaylist() {
		const artists = this.state.artists;

		this.setState({
			   tracks: [],
			   playlistTitle: "",
			   requestPending: true
			   });
		const trackRequests = [];
		for(let i = 0; i < artists.length; i++) {
			const trackRequest = fetch('tracks?artistId=' + artists[i].artistData.id + '&limit=5').then((response) => response.json()).then((data) => {
				const tracks = this.state.tracks.slice();
				
				for(let j = 0; j < data.length; j++) {
					const track = {
								trackData: data[j],
								position: i
							  }
					tracks.push(track);
				}
				tracks.sort((a, b) => {
					return a.position - b.position;
				});
				this.setState({
					tracks: tracks
				});
			});
			trackRequests.push(trackRequest);
		}

		await Promise.all(trackRequests).then(() =>
			this.setState({
					requestPending: false
				})
  		);
	}

	async exportPlaylist() {
		if(this.playlistBuilder) {
			this.playlistBuilder.exportPlaylist(this.state.playlistTitle, this.state.tracks.map((track) => track.trackData))
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
		let artistAdded = false;
		const validatedArtist = await fetch('artist?artist=' + artist).then((response) => response.json()).catch((error) => alert("Artist couldn't be found."))
		if(validatedArtist){
			const artists = this.state.artists.slice();
			const artist = {artistData: validatedArtist,
							row: -1};
			artists.push(artist);
			this.setState({artists: artists});
			artistAdded = true;
			alert(validatedArtist.name + " added to artists")
		}

		return artistAdded;
	}

	renderMainTitleView() {
		return (
			<div className="container-fluid">
				<div className="row">
					<MainTitle/>
				</div>
				<div className="row">
					<ButtonContainer inputPlaceholder="Image URL" inputText={this.state.imageUrl} inputChange={this.updateImage} viewState={state.TITLE_VIEW} requestPending={this.state.requestPending}
					artists={this.state.artists} generatePlaylist={() => this.generatePlaylist()} exportPlaylist={() => this.exportPlaylist()} signIntoSpotify={this.signIntoSpotify} signedIntoSpotify={this.playlistBuilder ? true : false}
					clearPlaylist={() => this.clearPlaylist}/>
				</div>
			</div>
			);
	}

	renderArtistView() {
		return (
			<div className="container-fluid">
				<div className="artist-container row">
						<FestivalImage imageUrl={this.state.imageUrl}/>
						<div className="col col-md-6">
						{this.state.artists.length > 0 ? (
							<RemovableList placeholder="Artist" addCallback={(artist) => this.addArtist(artist)} itemClick={this.doNothing} itemClass="shadow-sm artist-li" contentClass="" listClass="artist-list" items={this.state.artists.map(function(artist){return {key: artist.artistData.id, value: artist.artistData.name}})} remove={this.removeArtist}/>
						) : ('')}
					</div>
				</div>
				<div className="row">
					<ButtonContainer inputPlaceholder="Image URL" inputText={this.state.imageUrl} inputChange={this.updateImage} viewState={state.ARTIST_VIEW} requestPending={this.state.requestPending}
						artists={this.state.artists} generatePlaylist={() => this.generatePlaylist()} exportPlaylist={() => this.exportPlaylist()} signIntoSpotify={this.signIntoSpotify} signedIntoSpotify={this.playlistBuilder ? true : false}
						clearPlaylist={() => this.clearPlaylist}/>
				</div>
			</div>
			);
	}

	renderPlaylistView() {
		return (
			<>
				<div className ="artist-container row">
					<div className="col col-md-8">
						<RemovableList itemClick={this.updateSelectedTrack} itemClass="shadow-sm artist-li clickable" contentClass="track-content" listClass="track-list" items={this.state.tracks.map(function(track){return {key: track.trackData.id, value: track.trackData.artists[0].name + ": " + track.trackData.name}})} remove={this.removeTrack}/>
					</div>

					{this.state.selectedTrack ? 
						<div className="col col-md-3 track-player">
						<iframe className="artist-container-element" src={this.getFormattedSelectedTrack()} width="300" height="400" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>
						</div>
						: ''}
				</div>
				<div className="row">
					<ButtonContainer inputPlaceholder="Playlist Name" inputText={this.state.playlistTitle} inputChange={this.updatePlaylistTitle} viewState={state.PLAYLIST_VIEW} requestPending={this.state.requestPending}
						artists={this.state.artists} generatePlaylist={() => this.generatePlaylist()} exportPlaylist={() => this.exportPlaylist()} signIntoSpotify={this.signIntoSpotify} signedIntoSpotify={this.playlistBuilder ? true : false}
						clearPlaylist={() => this.clearPlaylist()}/>
				</div>
			</>
			);
	}

	renderView() {
		let view;
		if(this.state.imageUrl == "") {
			view = this.renderMainTitleView();
		} else if(this.state.tracks.length == 0) {
			view = this.renderArtistView();
		} else {
			view = this.renderPlaylistView();
		}

		return view;
	}

	render() {
		return (
			<div>
				{this.renderView()}
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
			<div className="main-container col col-lg-8 offset-lg-2">
				<MainWidget/>
			</div>
			<Footer/>
		</div>
		)
	}
}

ReactDOM.render(<MainPage />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change

