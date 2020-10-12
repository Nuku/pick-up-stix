import { handleItemDropped, drawLockIcon, getLootToken, lootTokens, normalizeDropData } from "../main";
import { DropData, PickUpStixFlags } from "../models";
import { LootHud } from "../loot-hud-application";
import { getLootTokenData } from "../main";
import { LootToken } from "../loot-token";

/**
 * Handler for the dropCanvasData Foundry hook. This is used
 * in Foundry 0.7.0 and above
 * @param canvas
 * @param dropData
 */
const dropCanvasHandler = async (canvas, dropData) => {
	console.log(`pick-up-stix | dropCanvasData | called with args:`);
	console.log(canvas, dropData);

	if (dropData.type === "Item") {
		handleItemDropped(normalizeDropData(dropData));
	}
}

/**
 TODO once 0.7.x hits the stable release channel, this should be deprecated
 * and eventually removed.
 *
 * Handler for the 'drop' event on div#board element. This is used
 * in Foundry version 0.6.9 and below
 *
 * @override
 * @param event
 */
const handleOnDrop = async (event) => {
	console.log(`pick-up-stix | handleOnDrop | called with args:`);
	console.log(event);

	event.preventDefault();

	// Try to extract the data
	let data;
	try {
		data = JSON.parse(event.dataTransfer.getData('text/plain'));
		console.log(`pick-up-stix | handleOnDrop | data from event:`);
		console.log(data);
	}
	catch (err) {
		return false;
	}

	// only entities of type Item can be dropped to the canvas
	if (data.type !== "Item") {
		return;
	}

	handleItemDropped(normalizeDropData(data, event));
}

export async function canvasReadyHook(canvas) {
  console.log(`pick-up-stix | canvasReadyHook`);
  console.log([canvas]);

  const lootTokenData = getLootTokenData();
  const tokens = lootTokenData[canvas.scene.id];
  for (let [tokenId, data] of Object.entries(tokens ?? {})) {
		let token: Token;
		let lootToken = getLootToken(canvas.scene.id, tokenId);

		if (!lootToken) {
			console.log(`pick-up-stix | canvasReadyHook | LootToken instance not found for scene '${canvas.scene.id}' token '${tokenId}'`);
			token = canvas.tokens?.placeables?.find(p => p.id === tokenId);
			if (!token) {
				console.log(`pick-up-stix | canvasReadyHook | Could not find Token '${tokenId}' on scene '${canvas.scene.id}' but it exists in loot token data`);
				continue;
			}
			lootToken = await LootToken.create({ ...token.data, id: tokenId }, data);
			lootTokens.push(lootToken);
		}
		else {
			lootToken.activateListeners();
		}

		for (let i of game.items.values()) {
			if (i.getFlag('pick-up-stix', 'pick-up-stix.isTemplate') === true) {
				console.log('pick-up-stix | canvasReadyHook | founnd template Item, removing it');
				await i.delete();
			}
		}
  }

	// loop through the canvas' tokens and ensure that any that are locked
	// have the lock icon drawn and set up the mouse interactions
  canvas?.tokens?.placeables?.forEach(async (p: PlaceableObject) => {
		const flags: PickUpStixFlags = p.getFlag('pick-up-stix', 'pick-up-stix');

		if (!!getLootTokenData()[p.id]) {
      console.log(`pick-up-stix | canvasReadyHook | found token ${p.id} with loot data`);
			//p.mouseInteractionManager = setupMouseManager.bind(p)();

			if (flags.isLocked) {
				console.log(`pick-up-stix | canvasReadyHook | loot is locked, draw lock icon`);
				await drawLockIcon(p);
			}
		}
  });

	const coreVersion: string = game.data.version;
	if (isNewerVersion(coreVersion, '0.6.9')) {
    console.log(`pick-up-stix | canvasReadyHook | Foundry version newer than 0.6.9. Using dropCanvasData hook`);

		Hooks.off('dropCanvasData', dropCanvasHandler);
		Hooks.on('dropCanvasData', dropCanvasHandler);
	}
	else {
		console.log(`pick-up-stix | canvasReadyHook | Foundry version is 0.6.9 or below. Overriding Canvas._onDrop`);

		const board = document.getElementById('board');
		board.removeEventListener('drop', handleOnDrop);
		board.addEventListener('drop', handleOnDrop);
	}

	canvas.hud.pickUpStixLootHud = new LootHud();
}
