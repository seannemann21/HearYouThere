import React from 'react';

export class EditableList extends React.Component{

	constructor(props) {
		super(props);
		this.requestPending = false;
		this.state = {additionInput: "",
					  addRequestInFlight: false}
		this.updateAdditionInput = this.updateAdditionInput.bind(this);
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
		const listItems = this.props.items.map((item) =>
			<li onClick={() => this.props.itemClick(item)} key={item.key} className={this.props.itemClass}><span className={this.props.contentClass + " artist-li-content"}>{item.value}</span><span className="close" onClick={(e) => this.props.remove(e, item.key)}>x</span></li>					
		);

		return (
			<>
				{ this.props.items.length > 0 ?
					<ul className={this.props.listClass}>{listItems}</ul> : ''
				}
			</>

		);
	}

	render() {
		return (
			<div className="artist-container-element">
					{this.renderItems()}
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