export type ItemData = {
	id?: string;
	data: any;
	count: number;
};

export interface PickUpStixFlags {
	initialState?: ItemData;
	itemData?: ItemData[];
	isContainer?: boolean;
	imageContainerClosedPath?: string;
	imageContainerOpenPath?: string;
	isOpen?: boolean;
	canClose?: boolean;
	currency?: {
		pp?: number;
		gp?: number;
		ep?: number;
		sp?: number;
		cp?: number;
	};
	isLocked?: boolean;
}

export enum SocketMessageType {
	deleteToken,
	updateToken,
	updateActor,
	createOwnedEntity,
	createItemToken
}

export interface PickUpStixSocketMessage {
	// user ID of the sender
	sender: string;
	type: SocketMessageType;
	data: any;
}

/**
 * Application class to display to select an item that the token is
 * associated with
 */
export default class ItemSheetApplication extends Application {
	static get defaultOptions(): ApplicationOptions {
	  const options = super.defaultOptions;
    options.id = "pick-up-stix-selectItem";
	  options.template = "modules/pick-up-stix/templates/item-sheet.html";
		options.width = 500;
		options.height = 'auto';
		options.minimizable = false;
		options.title = "Select an Item";
		options.resizable = true;
    return options;
	}

	private _flags: PickUpStixFlags = {
		canClose: true
	};

	private get isContainer(): boolean {
		return this._flags.isContainer;
	}
	private set isContainer(value: boolean) {
		this._flags.isContainer = value;
	}

	private get imageContainerOpenPath(): string {
		return this._flags.imageContainerOpenPath;
	}
	private set imageContainerOpenPath(value: string) {
		this._flags.imageContainerOpenPath = value;
	}

	private get imageContainerClosedPath(): string {
		return this._flags.imageContainerClosedPath;
	}
	private set imageContainerClosedPath(value: string) {
		this._flags.imageContainerClosedPath = value;
	}

	private get selectionData(): ItemData[] {
		return this._flags.itemData;
	}
	private set selectionData(value: ItemData[]) {
		this._flags.itemData = [
			...value
		];
	}

	private get currency(): any {
		return this._flags.currency;
	}
	private set currency(value: any) {
		this._flags.currency = {
			...value
		};
	}

	private _html: any;

	constructor(private _token: Token) {
		super({});
		console.log(`pick-up-stix | select item form | constructed with args:`)
		console.log(this._token);

		this._flags = {
			...duplicate(this._token.getFlag('pick-up-stix', 'pick-up-stix') ?? {})
		}
	}

	private async setSelectionAmount(id: string, count: number): Promise<ItemData> {
		console.log(`pick-up-stix | select item from | setSelectionAmount | called with args`);
		console.log([id, count]);

		let currItemData = this.selectionData.find(itemData => itemData.id === id);

		if (currItemData) {
			currItemData.count = count;
			console.log(`Previous value existed, setting ${currItemData.id} to count ${currItemData.count}`);
		}
		else {
			currItemData = {
				id,
				count: 1,
				data: {
					...this.getData()?.object?.items?.find((i: Item) => i._id === id)
				}
			};
			this.selectionData.push(currItemData);
			console.log(`Adding item ${currItemData.id} with count ${currItemData.count}`);
		}

		return currItemData;
	}

	activateListeners(html) {
		console.log(`pick-up-stix | SelectItemApplication | activateListeners called with args:`);
		console.log(html);

		super.activateListeners(this._html);
		this._html = html;

		$(this._html).find(`.currency-wrapper [data-currency-type]`).each((idx, e) => {
			const currencyType = $(e).attr(`data-currency-type`);
			$(e).val(this._flags?.currency?.[currencyType]);
		});

		// Object.keys(this._flags.currency).forEach(k => {
		// 	$(this._html).find(`.currency-wrapper [data-currency-type="${k}"]`).val(this._flags.currency[k]);
		// });

		if (this.isContainer) {
			$(this._html).find(`#isContainerCheckBox`).prop('checked', true);
		}

		if (this._flags.canClose) {
			$(this._html).find(`#canCloseCheckBox`).prop('checked', true);
		}

		this.selectionData?.forEach(itemData => {
			console.log(`pick-up-stix | selection from setup | setting item ${itemData.data._id} to active and count to ${itemData.count}`);
			const item = $(this._html).find(`[data-item-id="${itemData.data._id}"]`);
			if (itemData.count > 0) {
				item.addClass('active');
			}
			item.find('.count').val(itemData.count);
		});

		/**
		 * Listen on the file input for when it's clicked. prevent the default dialog from
		 * opening and open the Foundry FilePicker
		 */
		$(this._html).find('input[type="file"]').click(e => {
			e.preventDefault();

			const openDialog = $(e.currentTarget).hasClass('open');

			const fp = new FilePicker({
				type: 'image',
				callback: path => {
					console.log(`pick-up-stix | file picker picked | setting container image ${openDialog ? 'open' : 'closed'} path to ${path}`);

					if (openDialog) {
						this.imageContainerOpenPath = path;
					}
					else {
						this.imageContainerClosedPath = path;
					}

					this.render();
				}
			}).browse((openDialog ? this.imageContainerOpenPath : this.imageContainerClosedPath) ?? '');
		});

		/**
		 * Listen for the container checkbox change event
		 */
		$(this._html).find('#isContainerCheckBox').change(async (e) => {
			console.log(`pick-up-stix | select form | file input check box changed`);
			this.isContainer = !this.isContainer;
			this.render();
		});

		if (this.isContainer) {
			/**
			 * Listen for if the can close checkbox is changed
			 */
			$(this._html).find('#canCloseCheckBox').change(async (e) => {
				console.log(`pick-up-stix | SelectItemApplication | canCloseCheckBox changed`);
				this._flags.canClose = !this._flags.canClose;
			});
		}

		/**
		 * Listen for the change event on the count input
		 */
		$(this._html).find('.item .count').change(async (e) => {
			const count = +$(e.currentTarget).val();
			const id = $(e.currentTarget).parent().attr('data-item-id');
			console.log(`pick-up-stix | selection from count input changed | Setting item ${id} to count ${count}`);
			if (count === 0) {
				$(this._html).find(`[data-item-id="${id}"]`).removeClass('active');
			}
			else if(count > 0) {
				$(this._html).find(`[data-item-id="${id}"]`).addClass('active');
			}
			await this.setSelectionAmount(id, count);
		});

		/**
		 * listen for currency input changes
		 */
		$(this._html).find('.currency-wrapper .currency-input').change(e => {
			console.log(`pick-up-stix | select item form | currency input changed with args:`)
			console.log(e);
			const currencyType = $(e.currentTarget).attr('data-currency-type');
			const amount = $(e.currentTarget).val();
			setProperty(this._flags, `currency.${currencyType}`, amount);
		});

		/**
		 * Listen for clicks on each item's image and increment the item's count by one
		 */
		$(this._html).find('.item img').click(async (e) => {
			const item = $(e.currentTarget).parent();
			const itemId = item.attr('data-item-id');

			let currItemData = this.selectionData.find(itemData => itemData.id === itemId);
			currItemData = await this.setSelectionAmount(itemId, currItemData ? currItemData.count + 1 : 1);
			item.find('.count').val(currItemData[1]);
			console.log(`pick-up-stix | selection form image clicked | setting item ${itemId} to count ${currItemData.count}`);
			item.addClass('active');
			this.render();
		});
	}

	getData(): {options: any, object: { items: any[], isContainer: boolean, imageContainerOpenPath: string, imageContainerClosedPath: string, actor: Actor } } {
		return {
			options: this.options,
			object: {
				actor: this._token.actor,
				items: duplicate(game.items.entities.filter(i => !['class', 'spell', 'feat'].includes(i.type))),
				isContainer: this.isContainer,
				imageContainerOpenPath: this.imageContainerOpenPath,
				imageContainerClosedPath: this.imageContainerClosedPath
			}
		}
	}

	async close() {
		const update = {
			img: this._flags.isOpen ? this._flags.imageContainerOpenPath : this._flags.imageContainerClosedPath,
			flags: {
				'pick-up-stix': {
					'pick-up-stix': {
						...this._flags
					}
				}
			}
		}
		await this._token.update(update);
		super.close();
	}
}