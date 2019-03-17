import React from 'react';
import { State } from './State.js';

export class ButtonContainer extends React.Component {

	render() {
		return (
			<div className="btn-container container-fluid">
					<div className="row">
						<input disabled={this.props.requestPending && this.props.viewState !== State.PLAYLIST_VIEW} placeholder={this.props.inputPlaceholder} className="image-input col-10 offset-1 col-md-8 offset-md-2" type="text" value={this.props.inputText} onChange={this.props.inputChange}/>
					</div>
					<div className="row btn-row">
						{this.props.viewState === State.TITLE_VIEW || this.props.viewState === State.ARTIST_VIEW ?
							<button className="btn btn-primary" disabled={this.props.requestPending || this.props.artists.length === 0} onClick={() => this.props.generatePlaylist()}>Generate Playlist</button>
							: ''
						}
						{this.props.viewState === State.PLAYLIST_VIEW ?
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