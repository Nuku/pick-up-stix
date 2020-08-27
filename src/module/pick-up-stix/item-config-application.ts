import { getCurrencies } from '../../utils';
import ContainerImageSelectionApplication from "./container-image-selection-application.js";
import {
	createOwnedEntity,
	currencyCollected,
	itemCollected,
	updateActor,
	updateToken
} from './main';
import { ItemType } from "./models";
import { DefaultSetttingKeys } from './settings';

/**
 * Application class to display to select an item that the token is
 * associated with
 */
export default class ItemConfigApplication extends FormApplication {
	private _tokenUpdateHandler;
	private _tokenDeletedHandler;
	private _html: any;
	private _currencyEnabled: boolean;

	/**
	 * This is an object of the loot that this container holds. The keys are the loot type
	 * `weapon`, `equipment`, `consumable`, `backpack`, `tool`, `loot`. The values will
	 * be an array of Item instance data
	 */
	private _loot: {
		[key: string]: any[];
		currency?: any
	};

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			closeOnSubmit: false,
			submitOnClose: false,
			submitOnChange: true,
			id: "pick-up-stix-item-config",
			template: "modules/pick-up-stix/module/pick-up-stix/templates/item-config.html",
			width: 720,
			minimizable: false,
			title: `${game.user.isGM ? 'Configure Loot Container' : 'Loot Container'}`,
			resizable: true,
			classes: ['pick-up-stix', 'item-config-sheet'],
			dragDrop: [{ dropSelector: null }]
		});
	}

	constructor(private _token: Token, private _controlledToken: Token) {
		super({});
		console.log(`pick-up-stix | ItemConfigApplication ${this.appId} | constructor called with:`)
		console.log([this._token, this._controlledToken]);

		this._currencyEnabled = !game.settings.get('pick-up-stix', DefaultSetttingKeys.disableCurrencyLoot);

		this._loot = {
			...duplicate(this._token.getFlag('pick-up-stix', 'pick-up-stix.containerLoot') ?? {})
		}

		if (this._currencyEnabled) {
			this._loot['currency'] = Object.keys(getCurrencies()).reduce((prev, k) => {
				prev[k] = 0;
				return prev;
			}, {});
		}

		console.log(`pick-up-stix | ItemConfigApplication ${this.appId} | constructor | initial loot:`);
		console.log(this._loot);

		this._tokenUpdateHandler = this._tokenUpdated.bind(this);
		this._tokenDeletedHandler = this._tokenDeleted.bind(this);
		Hooks.on('updateToken', this._tokenUpdateHandler);
		Hooks.on('deleteToken', this._tokenDeletedHandler);
	}

	protected _tokenDeleted(scene: Scene, tokenData: any, data: any, userId: string) {
		console.log(`pick-up-stix | ItemConfigApplication ${this.appId} | _tokenDeleted called with args:`);
		console.log([scene, tokenData, data, userId]);

		if (tokenData._id === this._token.id) {
			console.log(`pick-up-stix | ItemConfigApplication ${this.appId} | _tokenDeleted | token ID matches this app's token`)
			this.close();
		}
	}

	protected _tokenUpdated(scene, data, flags, options, userId) {
		console.log(`pick-up-stix | ItemConfigApplication ${this.appId}  | _tokenUpdated called with args:`);
		console.log([scene, data, flags, options, userId]);

		if (data._id === this._token.id) {
			console.log(`pick-up-stix | ItemConfigApplication ${this.appId}  | _tokenUpdated | token has been updated, re-render`);
			this._loot = duplicate(this._token.getFlag('pick-up-stix', 'pick-up-stix.containerLoot') ?? {});
			this.render();
		}
	}

	activateListeners(html) {
		console.log(`pick-up-stix | ItemConfigApplication ${this.appId}  | activateListeners`);
		console.log(this);
		this._html = html;
		super.activateListeners(this._html);

		// set the click listener on the image
		if (this._token.getFlag('pick-up-stix', 'pick-up-stix.itemType') === ItemType.CONTAINER) {
			$(html).find(`[data-edit="img"]`).click(e => this._onEditImage(e));
		}

		// set click listeners on the buttons to pick up individual items
		$(html).find(`a.item-take`).click(e => this._onTakeItem(e));

		// set click listeners on the buttons to pick up individual items
		$(html).find(`a.item-delete`).click(e => this._onDeleteItem(e));

		if (this._currencyEnabled) {
			// set click listener for taking currency
			$(html).find(`a.currency-take`).click(e => this._onTakeCurrency(e));
		}

		$(html).find(`input[type="text"]`).prop('readonly', !game.user.isGM);
		$(html).find(`input[type="text"]`).prop('disabled', 	!game.user.isGM);

		$(html).find('input#canCloseCheckbox').prop('checked', this._token.getFlag('pick-up-stix', 'pick-up-stix.canClose') ?? true);

		if (this._token) {
			$(html).find('input#scale').val(this._token?.data?.width ?? 1);
		}

		if (game.user.isGM) {
			const description = getProperty(this._token.data, 'flags.pick-up-stix.pick-up-stix.initialState.itemData.data.description.value');
			const descriptionText = $(`<span>${description}</span>`).text();
			$(html).find('#description').text(descriptionText ?? '').prop('disabled', !game.user.isGM).prop('readonly', !game.user.isGM);
		}

		if (!game.user.isGM) {
			$(html).find(`input[type="text"]`).addClass('isNotGM');
		}
	}

	getData() {
		console.log(`pick-up-stix | ItemConfigApplication ${this.appId}  | getData:`);
		const itemType = this._token.getFlag('pick-up-stix', 'pick-up-stix.itemType');

		const loot = Object.entries(this._loot).reduce((prev, [lootKey, lootItems]) => {
			if (lootKey === 'currency') {
				prev[lootKey] = lootItems;
				return prev;
			}

			const items = lootItems.map(i => {
				if (!i.data?.hasOwnProperty('price')) {
					i.data.price = 0;
				}

				if (!i.hasOwnProperty('qty')) {
					i.qty = 0;
				}

				return {
					...i,
					price: +i.qty * +i.data?.price
				}
			});

			if (items.length) {
				prev[lootKey] = items;
			}

			return prev;
		}, {});

		const data = {
			currencyEnabled: this._currencyEnabled,
			profileImage: itemType === ItemType.CONTAINER ? this._token.getFlag('pick-up-stix', 'pick-up-stix.imageContainerOpenPath') : this._token.data.img,
			isContainer: itemType === ItemType.CONTAINER,
			isToken: this._token instanceof Token,
			object: this._token.data,
			containerDescription: getProperty(this._token.data, 'flags.pick-up-stix.pick-up-stix.initialState.itemData.data.description.value')?.replace(/font-size:\s*\d*.*;/, 'font-size: 16px;') ?? '',
			lootTypes: Object.keys(loot).filter(lootKey => lootKey !== 'currency'),
			loot,
			user: game.user
		};

		if (this._currencyEnabled) {
			data['currencyTypes'] = Object.entries(getCurrencies()).map(([k, v]) => ({ short: k, long: v }));
		}

		console.log(data);
		return data;
	}

	protected async _onDeleteItem(e) {
		console.log(`pick-up-stix | ItemConfigApplication | _onDeleteItem`);
		const itemId = e.currentTarget.dataset.id;

		Object.entries(this._loot).forEach(([lootKey, loot]) => {
			if (this._currencyEnabled) {
				if (lootKey === 'currency') {
					return;
				}
			}

			loot.findSplice(l => l._id === itemId);
		});

		this.submit({});
	}

	protected async _onTakeCurrency(e) {
		console.log(`pick-up-stix | ItemConfigApplication ${this.appId} | _onTakeCurrency`);
		const actor: Actor = this._controlledToken?.actor;
		if (!actor) {
			ui.notifications.error('You must be controlling only one token to pick up an item');
			return;
		}
		const currentCurrency = { ...getProperty(actor, 'data.data.currency') ?? {} };
		const lootCurrencies = this._loot['currency'];
		if (!Object.values(lootCurrencies).some(c => c > 0)) {
			console.log(`pick-up-stix | ItemCOnfigApplication ${this.appId} | _onTakeCurrency | No currency to loot`);
			return;
		}

		Object.keys(currentCurrency).forEach(k => currentCurrency[k] = +currentCurrency[k] + +lootCurrencies[k]);
		await updateActor(actor, {'data.currency': currentCurrency});

		currencyCollected(this._controlledToken, Object.entries(lootCurrencies).filter(([, v]) => v > 0).reduce((prev, [k, v]) => { prev[k] = v; return prev; }, {}));

		Object.keys(this._loot['currency'])?.forEach(k => this._loot['currency'][k] = 0);
		$(this._html).find('[data-currency-input').val(0);
		await this.submit({});
	}

	protected async _onTakeItem(e) {
		console.log(`pick-up-stix | ItemConfigApplication ${this.appId} | _onTakeItem`);
		const actor = this._controlledToken?.actor;
		if (!actor) {
			ui.notifications.error('You must be controlling only one token to pick up an item');
			return;
		}
		const itemType = $(e.currentTarget).parents(`ol[data-itemType]`).attr('data-itemType');
		const itemId = e.currentTarget.dataset.id;
		const itemData = this._loot?.[itemType]?.find(i => i._id === itemId);
		if (--itemData.qty <= 0) {
			this._loot?.[itemType]?.findSplice(v => v._id === itemId);
		}
		setProperty(itemData, 'flags.pick-up-stix.pick-up-stix', {
			initialState: { id: itemData._id, count: 1, itemData: { ...itemData, flags: {} } },
			itemType: ItemType.ITEM,
			isLocked: false
		});
		setProperty(itemData, '-=qty', null);
		console.log(itemData);
		console.log(this._loot);
		await createOwnedEntity(actor, [itemData]);
		itemCollected(this._controlledToken, itemData);

		await this.submit({});
	}

	protected _onEditImage(e) {
		console.log(`pick-up-stix | ItemConfigApplication ${this.appId}  | _onEditImage`);
		const f = new ContainerImageSelectionApplication(this._token).render(true);

		Hooks.once('closeContainerImageSelectionApplication', () => {
			console.log(`pick-up-stix | ItemConfigApplication ${this.appId}  | closeContainerImageSelectionApplication hook`);
			this.submit({});
		});
	}

	protected async _onDrop(e) {
		console.log(`pick-up-stix | ItemConfigApplication ${this.appId}  | _onDrop with data:`);
		const droppedData = JSON.parse(e.dataTransfer.getData('text/plain'));
		console.log(droppedData);

		if (droppedData.type !== "Item") {
			console.log(`pick-up-stix | ItemConfigApplication ${this.appId}  | _onDrop | item is not 'Item' type`);
			return;
		}

		let itemData = droppedData.data ?? await game.items.get(droppedData.id)?.data ?? await game.packs.get(droppedData.pack).getEntry(droppedData.id);

		if (droppedData.actorId) {
			console.log(`pick-up-stix | ItemConfigApplication ${this.appId}  | _onDrop | drop data contains actor ID '${droppedData.actorId}', delete item from actor`);
			await game.actors.get(droppedData.actorId).deleteOwnedItem(droppedData.data._id);
			itemData = { ...getProperty(itemData, 'flags.pick-up-stix.pick-up-stix.initialState.itemData') };
		}

		const itemType = itemData.type;

		if (!this._loot[itemType]) {
			console.log(`pick-up-stix | ItemConfigApplication ${this.appId}  | _onDrop | no items of type '${itemType}', creating new slot`);
			this._loot[itemType] = [];
		}
		const existingItem = this._loot?.[itemType]?.find(i => i._id === itemData._id);
		if (existingItem) {
			console.log(`pick-up-stix | ItemConfigApplication ${this.appId}  | _onDrop | existing data for type '${itemType}', increase quantity by 1`);
			existingItem.qty++;
		}
		else {
			console.log(`pick-up-stix | ItemConfigApplication ${this.appId}  | _onDrop | existing data for item '${itemData._id}' does not exist, set quantity to 1 and add to slot`);
			itemData.qty = 1;
			this._loot[itemType].push(itemData);
		}

		await this.submit({});
	}

	protected async _updateObject(e, formData) {
		console.log(`pick-up-stix | ItemConfigApplication ${this.appId} | _onUpdateObject`);
		formData.img = this._token.getFlag('pick-up-stix', 'pick-up-stix.isOpen') ? this._token.getFlag('pick-up-stix', 'pick-up-stix.imageContainerOpenPath') : this._token.getFlag('pick-up-stix', 'pick-up-stix.imageContainerClosedPath');

		Object.entries(this._loot).filter(([k,]) => k !== 'currency').forEach(([k, v]) => {
			if (v.length === 0) {
				setProperty(formData, `flags.pick-up-stix.pick-up-stix.containerLoot.-=${k}`, null);
			}
			else {
				setProperty(formData, `flags.pick-up-stix.pick-up-stix.containerLoot.${k}`, Object.entries(v).reduce((prev, [index, v]) => {
					v.qty = e.type === 'change' && e.currentTarget.dataset.hasOwnProperty('quantityInput') && e.currentTarget.dataset.lootType === v.type && e.currentTarget.dataset.lootId === v._id ? +$(e.currentTarget).val() : +v.qty;
					prev.push({
						...v,
						flags: {}
					});
					return prev;
				}, []));
			}
		});

		if (this._currencyEnabled) {
			// when the user is a GM the currency is taken from the inputs on the form, but when the user NOT a GM, there are no inputs
			if (!game.user.isGM) {
				if (this._loot.currency) {
					setProperty(formData, `flags.pick-up-stix.pick-up-stix.containerLoot.currency`, { ...this._loot.currency });
				}
			}
		}

		if (formData.width !== undefined) {
			// we only collect the one size and store it as the width, so here we also store the height to be the same
			formData.height = formData.width;
		}

		const flattendOb = flattenObject(formData);
		console.log(`pick-up-stix | ItemConfigApplication ${this.appId} | _updateObject | flattend 'formData' object:`);
		console.log(flattendOb);
		await updateToken(this._token, flattendOb);
		this.render();
	}

	async close() {
		console.log(`pick-up-stix | ItemConfigApplication ${this.appId} | close`);
		Hooks.off('updateToken', this._tokenUpdateHandler);
		Hooks.off('deleteToken', this._tokenDeletedHandler);
		return super.close();
	}
}
