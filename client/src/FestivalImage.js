import React from 'react';

export class FestivalImage extends React.Component{

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
				<div className="col col-md-5 artist-container-element"><img id="festival-image" className="festival-image" src={this.props.imageUrl} onError={() => this.error()}/></div>
				: <div className="col artist-container-element"><h4 className="no-content-text">Sorry, image couldn't be found.<br/>You could try:<br/>https://pbs.twimg.com/media/Dy16kT4W0AAJ8EW.jpg</h4></div>
			}
			</>
		)
	}
}