/**
 * This is your TypeScript entry file for Foundry VTT.
 * Register custom settings, sheets, and constants using the Foundry API.
 * Change this heading to be more descriptive to your module, or remove it.
 * Author: [your name]
 * Content License: [copyright and-or license] If using an existing system
 * 					you may want to put a (link to a) license or copyright
 * 					notice here (e.g. the OGL).
 * Software License: [your license] Put your desired license here, which
 * 					 determines how others may use and modify your module
 */

// Import TypeScript modules
import { registerSettings } from './module/settings.js';
import { preloadTemplates } from './module/preloadTemplates.js';


let socket: any;
export type FormData = {
	id: string;
	count: number;
	pack?: string;
};

export enum SocketMessageType {
	deleteToken,
	updateToken,
	updateActor,
	createOwnedEntity
}

export interface PickUpStixSocketMessage {
	// user ID of the sender
	sender: string;
	type: SocketMessageType;
	data: any;
}

export interface PickUpStixFlags {
	itemIds?: FormData[];
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

/**
 * Application class to display to select an item that the token is
 * associated with
 */
class SelectItemApplication extends Application {
	static get defaultOptions(): ApplicationOptions {
	  const options = super.defaultOptions;
    options.id = "pick-up-stix-selectItem";
	  options.template = "modules/pick-up-stix/templates/select-item.html";
		options.width = 500;
		options.height = 'auto';
		options.minimizable = false;
		options.title = "Select an Item";
		options.resizable = true;
    return options;
	}

	private _flags: PickUpStixFlags = {
		currency: {
			pp: 0,
			gp: 0,
			ep: 0,
			sp: 0,
			cp: 0
		},
		itemIds: [],
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

	private get selectionData(): FormData[] {
		return this._flags.itemIds;
	}
	private set selectionData(value: FormData[]) {
		this._flags.itemIds = [
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

		const itemFlags = this._token.getFlag('pick-up-stix', 'pick-up-stix');
		this._flags = {
			...this._flags,
			...duplicate(itemFlags)
		}

		console.log(`pick-up-stix | select item form | constructed with flags`);
		console.log(this._flags);
	}

	private async setSelectionAmount(id: string, count: number): Promise<FormData> {
		let currItemData = this.selectionData.find(itemData => itemData.id === id);

		if (currItemData) {
			currItemData.count = count;
			console.log(`Previous value existed, setting ${currItemData.id} to count ${currItemData.count}`);
		}
		else {
			currItemData = { id, count: 1 };
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

		Object.keys(this._flags.currency).forEach(k => {
			$(this._html).find(`.currency-wrapper [data-currency-type="${k}"]`).val(this._flags.currency[k]);
		});

		if (this.isContainer) {
			$(this._html).find(`#isContainerCheckBox`).prop('checked', true);
		}

		if (this._flags.canClose) {
			$(this._html).find(`#canCloseCheckBox`).prop('checked', true);
		}

		this.selectionData?.forEach(itemData => {
			console.log(`pick-up-stix | selection from setup | setting item ${itemData.id} to active and count to ${itemData.count}`);
			const item = $(this._html).find(`[data-item-id="${itemData.id}"]`);
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
			const currency = $(e.currentTarget).attr('data-currency-type');
			const amount = $(e.currentTarget).val();
			console.log(this._flags);
			this._flags.currency[currency] = amount;
			console.log(this._flags.currency);
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

	getData(): any {
		return {
			options: this.options,
			object: {
				items: duplicate(game.items.entities.filter(i => !['class', 'spell', 'feat'].includes(i.type))),
				isContainer: this.isContainer,
				imageContainerOpenPath: this.imageContainerOpenPath,
				imageContainerClosedPath: this.imageContainerClosedPath
			}
		}
	}

	async close() {
		const flags: PickUpStixFlags = {
			...this._flags
		}

		const update = {
			img: flags.isOpen ? flags.imageContainerOpenPath : flags.imageContainerClosedPath,
			flags: {
				'pick-up-stix': {
					'pick-up-stix': {
						...flags
					}
				}
			}
		}
		await this._token.update(update);
		// await this._token.setFlag('pick-up-stix', 'pick-up-stix', flags);
		super.close();
	}
}

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function() {
	console.log('pick-up-stix | init Hook');
	CONFIG.debug.hooks = true;

	// Assign custom classes and constants here

	// Register custom module settings
	registerSettings();

	// Preload Handlebars templates
	await preloadTemplates();

	// Register custom sheets (if any)
});

/* ------------------------------------ */
/* Setup module							*/
/* ------------------------------------ */
Hooks.once('setup', function() {
	// Do anything after initialization but before
	// ready
	console.log(`pick-up-stix | setup Hook`);
});

Hooks.once('canvasReady', function() {
	console.log(`pick-up-stix | Canvas ready, adding PickUpStixItemLayer`);
});

Hooks.on('dropCanvasData', async (canvas, dropData) => {
	console.log(`pick-up-stix | dropCanvasData | called with args:`);
	console.log(canvas, dropData);

	if (dropData.type === "Item") {
		const item: Item = dropData.pack !== undefined ? await game.packs.get(dropData.pack).getEntity(dropData.id) : game.items.get(dropData.id);

		if (!item) {
			console.log(`pick-up-stix | dropCanvasData | item '${dropData.id}' not found in game items or compendium`);
			return;
		}

		const hg = canvas.dimensions.size / 2;
    dropData.x -= (hg);
		dropData.y -= (hg);

		const { x, y } = canvas.grid.getSnappedPosition(dropData.x, dropData.y, 1);
		dropData.x = x;
		dropData.y = y;

		Token.create({
			img: item.img,
			name: item.name,
			x: dropData.x,
			y: dropData.y,
			disposition: 0,
			flags: {
				'pick-up-stix': {
					'pick-up-stix': {
						originalImagePath: item.img,
						itemIds: [
							{ id: dropData.id, count: 1, pack: dropData.pack ? dropData.pack : undefined }
						]
					}
				}
			}
		});
	}
});

/* ------------------------------------ */
/* When ready													  */
/* ------------------------------------ */
Hooks.once('ready', function() {
	// Do anything once the module is ready
	console.log(`pick-up-stix | ready hook`);

	canvas?.tokens?.placeables?.forEach(async (p: PlaceableObject) => {
		const data: PickUpStixFlags = p.getFlag('pick-up-stix', 'pick-up-stix');

		if (data) {
			console.log(`pick-up-stix | ready hook | found token ${p.id} with itemIds`);
			setupMouseManager(p);
		}
	});

	socket = game.socket;

	socket.on('module.pick-up-stix', async (msg: PickUpStixSocketMessage) => {
		console.log(`pick-up-stix | socket.on | received socket message with args:`);
		console.log(msg);

		if (msg.sender === game.user.id) {
			console.log(`pick-up-stix | receieved socket message | i sent this, ignoring`);
			return;
		}

		const firstGm = game.users.find((u) => u.isGM && u.active);
		if (firstGm && game.user !== firstGm) {
   		return;
		}

		let actor;
		let token;

		switch (msg.type) {
			case SocketMessageType.updateActor:
				actor = game.actors.get(msg.data.actorId);
				await actor.update(msg.data.updates);
				break;
			case SocketMessageType.deleteToken:
				await canvas.scene.deleteEmbeddedEntity('Token', msg.data);
				break;
			case SocketMessageType.updateToken:
				token = canvas.tokens.get(msg.data.tokenId);
				await token.update(msg.data.updates);
				break;
			case SocketMessageType.createOwnedEntity:
				actor = game.actors.get(msg.data.actorId);
				await actor.createOwnedItem(msg.data.items);
				break;
		}
	});

	socket.emit('module.pick-up-stix', 'yep you got it!');
});

Hooks.on('renderTokenHUD', (hud: TokenHUD, hudHtml: JQuery, data: any) => {
  if (!data.isGM) {
		console.log(`pick-up-stix | renderTokenHUD | user is not a gm, don't change HUD`);
		return;
	}

	if (data.actorId) {
		console.log(`pick-up-stix | renderTokenHUD | token has an actor associated with it, dont' change HUD`);
		return;
	}

	const flags = data.flags?.['pick-up-stix']?.['pick-up-stix'];

	const containerDiv = document.createElement('div');
	containerDiv.style.display = 'flex';
	containerDiv.style.flexDirection = 'row';

	// create the control icon div and add it to the container div
	const controlIconDiv = document.createElement('div');
	controlIconDiv.className = 'control-icon';
	const controlIconImg = document.createElement('img');
	controlIconImg.src = flags?.['itemIds']?.length
		? 'modules/pick-up-stix/assets/pick-up-stix-icon-white.svg'
		: 'modules/pick-up-stix/assets/pick-up-stix-icon-black.svg';
	controlIconImg.className = "item-pick-up";
	controlIconDiv.appendChild(controlIconImg);
	controlIconDiv.addEventListener('mousedown', displayItemContainerApplication(hud, controlIconImg, data));
	containerDiv.appendChild(controlIconDiv);

	// if the item is a container then add the lock icon
	if (flags?.isContainer) {
		const lockDiv = document.createElement('div');
		lockDiv.style.marginRight = '10px';
		lockDiv.className = 'control-icon';
		const lockImg = document.createElement('img');
		lockImg.src = flags?.['isLocked']
			? 'modules/pick-up-stix/assets/lock-white.svg'
			: 'modules/pick-up-stix/assets/lock-black.svg';
		lockDiv.appendChild(lockImg);
		lockDiv.addEventListener('mousedown', toggleLocked(data));
		containerDiv.prepend(lockDiv);
	}

	// add the container to the hud
	$(hudHtml.children('div')[0]).prepend(containerDiv);
});

function toggleLocked(data): () => void {
	return async () => {
		const token = canvas.tokens.get(data._id);
		const isLocked = token.getFlag('pick-up-stix', 'pick-up-stix.isLocked');
		await token.setFlag('pick-up-stix', 'pick-up-stix.isLocked', !isLocked);
	}
}

Hooks.on('updateToken', (scene: Scene, tokenData: any, tokenFlags: any, userId: string) => {
	console.log(`pick-up-stix | updateToken`)
	const token: Token = canvas?.tokens?.placeables?.find((p: PlaceableObject) => p.id === tokenData._id);

	const flags = token.getFlag('pick-up-stix', 'pick-up-stix');
	if (flags) {
		setTimeout(() => {
			setupMouseManager(token);
			console.log(`pick-up-stix | updateToken hook | itemIds ${flags.itemIds}`);
		}, 100);
	}
});

Hooks.on('createToken', async (scene: Scene, tokenData: any, options: any, userId: string) => {
	console.log(`pick-up-stix | create token`)
	const token: Token = canvas?.tokens?.placeables?.find((p: PlaceableObject) => p.id === tokenData._id);

	const flags = token.getFlag('pick-up-stix', 'pick-up-stix');
	if (flags) {
		setTimeout(() => {
			setupMouseManager(token);
			console.log(`pick-up-stix | createToken | itemIds ${flags.itemIds}`);
		}, 100);
	}
});

function displayItemContainerApplication(hud: TokenHUD, img: HTMLImageElement, tokenData: any): (this: HTMLDivElement, ev: MouseEvent) => any {
	return async function(this, ev: MouseEvent) {
		console.log(`pick-up-sticks | toggle icon clicked`);
		const token: Token = canvas?.tokens?.placeables?.find((p: PlaceableObject) => p.id === tokenData._id);
		if (!token) {
			console.log(`pick-up-stix | Couldn't find token '${tokenData._id}'`);
			return;
		}

		const flags: PickUpStixFlags = token.getFlag('pick-up-stix', 'pick-up-stix')

		let b = new SelectItemApplication(token);
		b.render(true);
	}
}

function setupMouseManager(token: PlaceableObject): void {
	console.log(`pick-up-stix | setupMouseManager with args:`)
	console.log(token);

	const mim = token.mouseInteractionManager;
	const target = mim.target;
	const handlers = mim.handlers;

	target.off('mouseover', handlers.mouseover);
	target.off('mouseout', handlers.mouseout);
	target.off('mousemove', handlers.mouseover);
	target.off('mousedown', handlers.mousedown);

	handlers.mouseover = () => mim.state = mim.states.HOVER;
	handlers.mouseout = () => mim.state = mim.states.NONE;
	handlers.mousedown = handleTokenItemClicked.bind(token);

	(mim as any)._activateClickEvents();
	(mim as any)._activateHoverEvents();
}

async function handleTokenItemClicked(e): Promise<void> {
	console.log(`pick-up-stix | handleTokenItemClicked | ${this.id}`);

	// if the token is hidden just do a normal click
	if (e.currentTarget.data.hidden) {
		console.log(`pick-up-stix | handleTokenItemClicked | token is hidden, handle normal click`);
		this._onClickLeft(e);
		return;
	}

	// get the tokens that the user controls
	const controlledTokens = canvas.tokens.controlled;

	// get the flags on the clicked token
	const flags: PickUpStixFlags = duplicate(this.getFlag('pick-up-stix', 'pick-up-stix'));

	// gm special stuff
	if (game.user.isGM) {
		if (!controlledTokens.length) {
			console.log(`pick-up-stix | handleTokenItemClicked | no controlled tokens, handle normal click`);
			this._onClickLeft(e);
			return;
		}

		const controlledFlags = controlledTokens[0].getFlag('pick-up-stix', 'pick-up-stix')

		// if there is only one controlled token and it's the item itself, don't do anything
		if (controlledTokens.length === 1 && (controlledTokens.includes(this) || controlledFlags)) {
			console.log(`pick-up-stix | handleTokenItemClicked | only controlling the item, handle normal click`);
			this._onClickLeft(e);
			return;
		}
	}

	if (controlledTokens.length !== 1 || controlledTokens[0]?.getFlag('pick-up-stix', 'pick-up-stix.itemIds')?.length > 0) {
		ui.notifications.error('You must be controlling only one token to pick up an item');
		return;
	}

	// get the token the user is controlling
	const userControlledToken: Token = controlledTokens[0];

	// if the item isn't visible can't pick it up
	if (!this.isVisible) {
		console.log(`pick-up-stix | handleTokenItemClicked | item is not visible to user`);
		return;
	}

	// get the distance to the token and if it's too far then can't pick it up
	const dist = Math.hypot(userControlledToken.x - this.x, userControlledToken.y - this.y);
	const maxDist = Math.hypot(canvas.grid.size, canvas.grid.size);
	if (dist > maxDist) {
		console.log(`pick-up-stix | handleTokenItemClicked | item is out of reach`);
		return;
	}

	const isLocked = flags.isLocked;

	// if it's locked then it can't be opened
	if (isLocked) {
		console.log(`pick-up-stix | handleTokenItemClicked | item is locked, play lock sound`);
		var audio = new Audio('sounds/lock.wav');
		audio.play();
		return;
	}

	// if it's a container and it's open and can't be closed then don't do anything
	if (flags.isContainer && flags.isOpen && !flags.canClose) {
		console.log(`pick-up-stix | handleTokenItemClicked | container is open and can't be closed`);
		return;
	}

	let containerUpdates;

	// create an update for the container but don't run update it yet. if it's container then switch then
	// open property
	if(flags.isContainer) {
		console.log(`pick-up-stix | handleTokenItemClicked | item is a container`);
		flags.isOpen = !flags.isOpen;

		containerUpdates = {
			img: flags.isOpen ? flags.imageContainerOpenPath : flags.imageContainerClosedPath,
			flags: {
				'pick-up-stix': {
					'pick-up-stix': {
						...flags
					}
				}
			}
		};
	}

	// if it's not a container or if it is and it's open it's now open (from switching above) then update
	// the actor's currencies if there are any in the container
	if (!flags.isContainer || flags.isOpen) {
		let currencyFound = false;
		let chatContent = '';
		const userCurrencies = userControlledToken?.actor?.data?.data?.currency;
		const actorUpdates = Object.keys(flags?.currency || {})?.reduce((acc, next) => {
			if (flags?.currency?.[next] > 0) {
				currencyFound = true;
				chatContent += `<span class="pick-up-stix-chat-currency ${next}"></span><span>(${next}) ${flags?.currency?.[next]}</span><br />`;
				userCurrencies[next] = userCurrencies[next] ? +userCurrencies[next] + +flags.currency?.[next] : flags.currency?.[next];
			}
			return userCurrencies;
		}, userCurrencies);

		if (currencyFound) {
			let content = `<p>Picked up:</p>${chatContent}`;
			ChatMessage.create({
				content,
				speaker: {
					alias: userControlledToken.actor.name,
					scene: (game.scenes as any).active.id,
					actor: userControlledToken.actor.id,
					token: userControlledToken.id
				}
			});
			await updateActor(userControlledToken.actor, { data: { data: { currency: { ...userCurrencies }}}});
		}
	}

	// get the items from teh container and create an update object if there are any
	if (!flags.isContainer || flags.isOpen) {
		const itemsToCreate = [];

		for (let itemData of flags.itemIds) {
			const item = itemData.pack !== undefined ? await game.packs.get(itemData.pack).getEntity(itemData.id) : game.items.get(itemData.id);
			const datas = [];
			for (let i = 0; i < itemData.count; i++) {
				datas.push({
					...item.data
				});
			}

			itemsToCreate.push(...datas)

			debugger;
			if (itemData.count > 0) {
				ChatMessage.create({
					content: `
						<p>Picked up ${itemData.count} ${item.name}</p>
						<img src="${item.img}" style="width: 40px;" />
					`,
					speaker: {
						alias: userControlledToken.actor.name,
						scene: (game.scenes as any).active.id,
						actor: userControlledToken.actor.id,
						token: userControlledToken.id
					}
				});
			}
		}

		// if it's a container, clear out the items as they've been picked up now
		if (flags.isContainer) {
			containerUpdates.flags['pick-up-stix']['pick-up-stix'].itemIds = [];
			containerUpdates.flags['pick-up-stix']['pick-up-stix'].currency = { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 };
		}

		await createOwnedEntity(userControlledToken.actor, itemsToCreate);
	}

	// if there are any container updates then update the container
	if (containerUpdates) {
		await new Promise(resolve => {
			setTimeout(() => {
				updateToken(this, containerUpdates);
				resolve();
			}, 300);
		});
	}

	if (!flags.isContainer) {
		await deleteToken(this);
	}

	this.mouseInteractionManager._deactivateDragEvents();
}

async function deleteToken(token: Token): Promise<void> {
	console.log(`pick-up-stix | deleteToken with args:`);
	console.log(token);

	if (game.user.isGM) {
		await canvas.scene.deleteEmbeddedEntity('Token', token.id);
		return;
	}

	const msg: PickUpStixSocketMessage = {
		sender: game.user.id,
		type: SocketMessageType.deleteToken,
		data: token.id
	}
	socket.emit('module.pick-up-stix', msg);
}

async function updateToken(token: Token, updates): Promise<void> {
	console.log(`pick-up-stix | updateToken with args:`);
	console.log(token, updates);

	if (game.user.isGM) {
		await token.update(updates);
		return;
	}

	const msg: PickUpStixSocketMessage = {
		sender: game.user.id,
		type: SocketMessageType.updateToken,
		data: {
			tokenId: token.id,
			updates
		}
	};

	socket.emit('module.pick-up-stix', msg);
}

async function updateActor(actor, updates): Promise<void> {
	if (game.user.isGM) {
		await actor.update(updates);
		return;
	}

	const msg: PickUpStixSocketMessage = {
		sender: game.user.id,
		type: SocketMessageType.updateActor,
		data: {
			actorId: actor.id,
			updates
		}
	};

	socket.emit('module.pick-up-stix', msg);
}

async function createOwnedEntity(actor, items) {
	if (game.user.isGM) {
		await actor.createEmbeddedEntity('OwnedItem', items);
		return;
	}

	const msg: PickUpStixSocketMessage = {
		sender: game.user.id,
		type: SocketMessageType.createOwnedEntity,
		data: {
			actorId: actor.id,
			items
		}
	};

	socket.emit('module.pick-up-stix', msg);
}