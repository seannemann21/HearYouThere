import React from 'react';

export class MainTitle extends React.Component {
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