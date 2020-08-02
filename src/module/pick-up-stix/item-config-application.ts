import ContainerImageSelectionApplication from "../container-image-selection-application";
import { createOwnedEntity } from './main';

/**
 * Application class to display to select an item that the token is
 * associated with
 */
export default class ItemConfigApplication extends FormApplication {
	private _html: any;
	private _loot: {
		[key: string]: any[];
	} = {};

	static get defaultOptions(): ApplicationOptions {
		return mergeObject(super.defaultOptions, {
			closeOnSubmit: false,
			id: "pick-up-stix-item-config",
			template: "modules/pick-up-stix/module/pick-up-stix/templates/item-config.html",
			width: 500,
			height: 'auto',
			minimizable: false,
			title: `${game.user.isGM ? 'Configure Loot Container' : 'Loot Container'}`,
			resizable: true,
			classes: ['dnd5e', 'sheet', 'actor', 'character'],
			dragDrop: [{ dropSelector: null }]
		});
	}

	constructor(private _token: Token) {
		super({});
		console.log(`pick-up-stix | ItemConfigApplication | constructed with args:`)
		console.log(this._token);
	}

	activateListeners(html) {
		console.log(`pick-up-stix | ItemConfigApplication | activateListeners called with args:`);
		console.log(html);

		this._html = html;
		super.activateListeners(this._html);

		$(html).find(`[data-edit="img"]`).click(e => this._onEditImage(e));
		$(html).find(`a.item-take`).click(e => this._onTakeItem(e));
	}

	getData() {
		console.log(`pick-up-stix | ItemConfigApplication | getData`);
		const data = {
			object: this._token.data,
			containerDescription: getProperty(this._token.data, 'flags.pick-up-stix.pick-up-stix.initialState.itemData.data.description.value')?.replace(/font-size:\s*\d*.*;/, 'font-size: 18px;') ?? '',
			loot: Object.entries(this._loot).reduce((prev, [k, v]) => {
				prev[k] = v.reduce((prev, itemData) => {
					const existing = prev.find(i => i._id === itemData._id);
					if (existing) {
						existing.qty = existing.qty + 1;
						existing.price = existing.qty * existing.data.price;
					}
					else {
						prev.push({...itemData, qty: 1, price: itemData.data.price})
					}
					return prev;
				}, []);
				return prev;
			}, {})
		};
		// console.log(data);
		return data;
	}

	protected async _onTakeItem(e) {
		console.log(`pick-up-stix | ItemConfigApplication | _onTakeItem`);
		const itemId = e.currentTarget.dataset.id;
		const actor = canvas.tokens.controlled[0].actor;
		const itemType = $(e.currentTarget).parents(`ol[data-itemType]`).attr('data-itemType');
		const itemData = this._loot?.[itemType]?.findSplice(i => i._id === itemId);
		console.log([itemId, actor, itemType, itemData]);
		await createOwnedEntity(actor, [itemData]);
		this.render();
	}

	protected _onEditImage(e) {
		console.log(`pick-up-stix | ItemConfigApplication | _onEditImage`);
		const f = new ContainerImageSelectionApplication(this._token).render(true);

		Hooks.once('closeContainerImageSelectionApplication', () => {
			console.log(`pick-up-stix | ItemConfigApplication | closeContainerImageSelectionApplication hook`);
			this.render();
		});
	}

	protected async _onDrop(e) {
		console.log(`pick-up-stix | ItemConfigApplication | _onDrop`)
		const data = JSON.parse(e.dataTransfer.getData('text/plain'));

		if (data.type !== "Item") {
			console.log(`pick-up-stix | ItemConfigApplication | _onDrop | item is not 'Item' type`);
			return;
		}

		const itemData = data.data ?? await game.items.get(data.id)?.data ?? await game.packs.get(data.pack).getEntry(data.id);
		const itemType = itemData.type;

		if (!this._loot[itemType]) {
			this._loot[itemType] = [];
		}
		this._loot[itemType].push(itemData);
		this.render();
	}

	protected _updateObject(e, formData) {
		return Promise.resolve(true);
	}
}
