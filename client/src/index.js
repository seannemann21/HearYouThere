import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

class ArtistGenerator extends React.Component{

	constructor(props) {
		super(props);

		this.state = {imageUrl:""}
		this.updateImage = this.updateImage.bind(this);
	}

	updateImage(event) {
		const imageUrl = event.target.value;
		this.setState({imageUrl: imageUrl});
	}

	render() {
		return (
			<div>
				<img className="festival-image" src={this.state.imageUrl}/>
				<input type="text" value={this.state.imageUrl} onChange={this.updateImage}/>
			</div>
		)
	}
}

class MainPage extends React.Component{
	render() {
		return(
			<div>
				<ArtistGenerator/>
			</div>
		)
	}
}

ReactDOM.render(<MainPage />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
