import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { Footer } from './Footer.js';
import { SpotifyPlaylistBuilder } from './SpotifyPlaylistBuilder.js';
import { FestivalImage } from './FestivalImage.js';
import { EditableList } from './EditableList.js';
import { ButtonContainer } from './ButtonContainer.js';
import { MainTitle } from './MainTitle.js';
import { State } from './State.js';

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
			try{
				this.state = JSON.parse(state);
			} catch(err) {
				this.state = this.getFreshState();
			}
		} else {
			this.state = this.getFreshState();
		}
		this.updateSelectedTrack = this.updateSelectedTrack.bind(this);
		this.updateImage = this.updateImage.bind(this);
		this.updatePlaylistTitle = this.updatePlaylistTitle.bind(this);

		const accessToken = getHashFragmentValue('access_token');
		

		fetch('/uri').then(response => response.json()).then(data => this.uri = data.uri);
		fetch('/clientId').then(response => response.json()).then(data => {
			this.clientId = data.clientId;
			if(accessToken !== null) {
				this.playlistBuilder = new SpotifyPlaylistBuilder(clientId, accessToken);
				this.state.signedIntoSpotify = true;
			}
		});
	}

	getFreshState() {
		const signedIntoSpotify = this.state && this.state.signedIntoSpotify ? true : false;
		return {
				  imageUrl:"",
				  artists:[],
				  tracks:[],
				  requestPending: false,
				  playlistTitle:"",
				  invalidUrl: false,
				  signedIntoSpotify: signedIntoSpotify
				};
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
					this.populateArtists(response);					
				} else {
					alert("Unable to process image. Try another one")
					this.setValidResponseReceivedState();
				}
		} else {
			this.setState({
				requestPending: false,
	   			invalidUrl: true
			})
		}
	}

	async populateArtists(response) {
		const rowsOfArtists = response.textAnnotations[0].description.split('\n');
		const artistRequests = [];
		for(let i = 0; i < rowsOfArtists.length; i++) {
			const request = fetch('artists?line=' + rowsOfArtists[i]).then((response) => response.json()).then((data) => {
				this.addParsedArtistsToArtistList(data, i);
			});
			artistRequests.push(request);
		}
		await Promise.all(artistRequests).then(() =>
			this.setValidResponseReceivedState() 
  		).catch((err) => {
  			console.log(err);
			this.setValidResponseReceivedState();
		});	
	}

	addParsedArtistsToArtistList(artistsOnRow, row) {
		const artists = this.state.artists.slice();
		for(let j = 0; j < artistsOnRow.length; j++) {
			const artist = {
				artistData: artistsOnRow[j],
				row: row
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
	}

	setValidResponseReceivedState() {
		this.setState({
			requestPending: false,
   			invalidUrl: false
		});
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
		if(this.state.signedIntoSpotify) {
			try {
				await this.playlistBuilder.exportPlaylist(this.state.playlistTitle, this.state.tracks.map((track) => track.trackData));
			} catch(err) {
				alert("Your token may have expired. Try signing into Spotify again");
				this.setState({signedIntoSpotify: false});
			}
		} else {
			alert("You must login to Spotify to export playlist.")
		}
	}

	async clearPlaylist() {
		this.setState(this.getFreshState());
	}

	signIntoSpotify() {
		sessionStorage.setItem('state', JSON.stringify(this.state))
		const x = sessionStorage.getItem('state');
		window.location.assign('https://accounts.spotify.com/authorize?client_id=' + this.clientId + '&redirect_uri=' + this.uri + '&scope=user-read-private%20playlist-modify-public%20user-read-email&response_type=token');
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
					<ButtonContainer inputPlaceholder="Image URL" inputText={this.state.imageUrl} inputChange={this.updateImage} viewState={State.TITLE_VIEW} requestPending={this.state.requestPending}
					artists={this.state.artists} generatePlaylist={() => this.generatePlaylist()} exportPlaylist={() => this.exportPlaylist()} signIntoSpotify={() => this.signIntoSpotify()} signedIntoSpotify={this.state.signedIntoSpotify}
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
							<EditableList placeholder="Artist" addCallback={(artist) => this.addArtist(artist)} itemClick={this.doNothing} itemClass="shadow-sm artist-li" contentClass="" listClass="artist-list" items={this.state.artists.map(function(artist){return {key: artist.artistData.id, value: artist.artistData.name}})} remove={(e, artistId) => this.removeArtist(e, artistId)}/>
						) : ('')}
					</div>
				</div>
				<div className="row">
					<ButtonContainer inputPlaceholder="Image URL" inputText={this.state.imageUrl} inputChange={this.updateImage} viewState={State.ARTIST_VIEW} requestPending={this.state.requestPending}
						artists={this.state.artists} generatePlaylist={() => this.generatePlaylist()} exportPlaylist={() => this.exportPlaylist()} signIntoSpotify={() => this.signIntoSpotify()} signedIntoSpotify={this.state.signedIntoSpotify}
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
						<EditableList itemClick={this.updateSelectedTrack} itemClass="shadow-sm artist-li clickable" contentClass="track-content" listClass="track-list" items={this.state.tracks.map(function(track){return {key: track.trackData.id, value: track.trackData.artists[0].name + ": " + track.trackData.name}})} remove={(e, trackId) => this.removeTrack(e, trackId)}/>
					</div>

					{this.state.selectedTrack ? 
						<div className="col col-md-3 track-player">
						<iframe className="artist-container-element" src={this.getFormattedSelectedTrack()} width="300" height="400" frameBorder="0" allowtransparency="true" allow="encrypted-media"></iframe>
						</div>
						: ''}
				</div>
				<div className="row">
					<ButtonContainer inputPlaceholder="Playlist Name" inputText={this.state.playlistTitle} inputChange={this.updatePlaylistTitle} viewState={State.PLAYLIST_VIEW} requestPending={this.state.requestPending}
						artists={this.state.artists} generatePlaylist={() => this.generatePlaylist()} exportPlaylist={() => this.exportPlaylist()} signIntoSpotify={() => this.signIntoSpotify()} signedIntoSpotify={this.state.signedIntoSpotify}
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

