import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

class FestivalImage extends React.Component{

	constructor(props) {
		super(props);
	}

	render() {
		return (
			<div className="artist-container-element">
				<img className="festival-image" src={this.props.imageUrl}/>
			</div>
		)
	}
}

class RemovableList extends React.Component{

	constructor(props) {
		super(props);
	}

	renderArtistsPane() {
		const rows = [];
		if(this.props.items.length > 0) {
			rows.push(<ul className={this.props.listClass}>{this.renderItems()}</ul>);
		}

		return rows;
	}

	renderItems() {
		const rows = [];
		const listItems = this.props.items.map((item) =>
			<li key={item.key} className={this.props.itemClass}><span className={this.props.contentClass}>{item.value}</span><span className="close" onClick={() => this.props.remove(item.key)}>x</span></li>
		);

		return listItems;
	}

	render() {
		return (
			<div className="artist-container-element">
					{this.renderArtistsPane()}
			</div>
		)
	}
}

class MainWidget extends React.Component{

	constructor(props) {
		super(props);

		this.state = {imageUrl:"",
					  artists:[],
					  tracks:[]
					 };
		this.updateImage = this.updateImage.bind(this);
		//this.axios = require('axios');
	}

	async updateImage(event) {
		const imageUrl = event.target.value;
		if(imageUrl != "") {
			fetch('artists?imageUrl=' + imageUrl).then((response) => response.json()).then((data) => {
				this.setState({
					imageUrl: imageUrl,
					artists: data,
					tracks: []
				});
			});

		}
		
		this.setState({imageUrl: imageUrl,
					   artists: [],
					   tracks: []
					   });
	}

	removeArtist(artistId) {
		const artists = this.state.artists;
		const updatedArtists = artists.filter(function(artist, index, arr){
    		return artist.id !== artistId;
		});
		this.setState({
			imageUrl: this.state.imageUrl,
			artists: updatedArtists,
			tracks: this.state.tracks
		})
	}

	removeTrack(trackId) {
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

	generatePlaylist() {
		const artists = this.state.artists;
		for(let i = 0; i < artists.length; i++) {
			fetch('tracks?artistId=' + artists[i].id + '&limit=5').then((response) => response.json()).then((data) => {
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
		}
	}

	render() {
		return (
			<div>
				<div className="artist-container">
				<FestivalImage imageUrl={this.state.imageUrl}/>
				<RemovableList itemClass="shadows-sm artist-li" contentClass="" listClass="artist-list" items={this.state.artists.map(function(artist){return {key: artist.id, value: artist.name}})} remove={(artistId) => this.removeArtist(artistId)}/>
				</div>
				<input type="text" value={this.state.imageUrl} onChange={this.updateImage}/>
				<button onClick={() => this.generatePlaylist()}>Generate Playlist</button>
				<RemovableList itemClass="shadows-sm artist-li" contentClass="track-content" listClass="track-list" items={this.state.tracks.map(function(track){return {key: track.id, value: + track.artists[0].name + ": " + track.name}})} remove={(trackId) => this.removeTrack(trackId)}/>
			</div>
		)
	}
}

class MainPage extends React.Component{
	render() {
		return(
			<div>
				<MainWidget/>
			</div>
		)
	}
}

ReactDOM.render(<MainPage />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
