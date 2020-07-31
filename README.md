# Introduction

Pick-Up-Stix allows you to create items as Tokens that players can pick up. It will automatically add the items to the player's inventory.

## Features
- Drop items from the items directory
- Drop items from the compendiums without importing them
- Create containers out of dropped items, lock them, add open and closed images
- Players may pick items up
- Players may drop items from their own inventories onto the map that other players can pick up
- Drop Items directly onto a token to add it to the actor's inventory
- Drag items from an actor's inventory onto another Token or another actor's inventory to transfer the item to that Actor's inventory

## Integrations
- If you have the Lootsheet5eNPC module installed, you can use an actor token and add container properties to it to create a lootable chest that opens the Lootsheet5eNPC actor sheet that players can loot.

## Limitations
- Player's must be within one square of the item in order to pick it up (not configurable at the moment)
- Player's must control one and only one token when picking up an item

## Future Considrations and Plans
- Loot sheet for items.
  - Randomization of items given out
  - Allow players to choose items they want and then click an accept button and when all have accepted, distribute loot
- Loot dead bodies
- Steal from living bodies using DC checks and notifications to GM if it fails
- Filters and search for item selection form including searching compendiums
- Allow players controllling multiple tokens to still interact with items.

## Known Issues

- HUD does not update until you close and re-open the HUD
- Actors dragged directly from the compendium (not impoted and added from the actors directory) will display the pickup HUD option when they should not

### Possible incompatibilies

It has been reported that some modules might be incompatible with Pick-Up-Stix. I will endeavor to fix these issues though I can make no guarantees as to any timelines

- Forien's Quest Log
- Token Animation Tools (confirmed 1.1.0 and below. 1.1.1 and above should work)
- Token Hotbar

# Demos

## Drop an item from the `items directory`

![](demo/01-drop-item-pick-up.gif)

## Disguise magic items as normal items

![](demo/02-disguise-magic-item.gif)

## Allow one item to represent multiple items

![](demo/03-item-representing-multiple-items.gif)

## Drop items directly from compendiums without importing them

![](demo/04-drop-item-from-compendium.gif)

## Create containers that open and close

![](demo/05-create-containers.gif)

## Create containers that can't be closed once opened

![](demo/06-containers-cant-be-closed.gif)

## Create locked containers that must be unlocked before players can open them

![](demo/07-lock-containers.gif)

## Drop Items directly onto Tokens or from an Actor's inventory to the map or other Tokens

![](demo/08-drop-items-on-tokens.gif)

## Integration with Lootsheet5eNPC module

Click to see the video
[![](https://turkeysunite-foundry-modules.s3.amazonaws.com/pick-up-stix/demos/pick-up-stix-loot-sheet.png)](https://turkeysunite-foundry-modules.s3.amazonaws.com/pick-up-stix/demos/pick-up-stix-loot-sheet.webm)
