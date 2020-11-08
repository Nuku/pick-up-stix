import { ContainerData, ItemFlags } from "./loot-token";
import { updateEntity } from "./main";

export class ContainerSoundConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['pick-up-stix', 'container-sound-config-sheet'],
      closeOnSubmit: false,
      height: 'auto',
      id: 'pick-up-stix-container-config-sheet',
      minimizable: false,
      resizable: false,
      submitOnChange: true,
      submitOnClose: true,
      width: 350,
      template: 'modules/pick-up-stix/module/pick-up-stix/templates/container-sound-config.html',
      title: 'Configure Container Sounds'
    })
  }

  constructor(object, options) {
    super(object, options);
  }

  protected _openFilePicker(e): void {
    new FilePicker({
      type: "audio",
      current: this.object.getFlag('pick-up-sitx', `pick-up-stix.${e.currentTarget.dataset.edit}`),
      callback: path => {
        e.currentTarget.src = path;
        this._onSubmit(e);
      }
    })
  }

  async _updateObject(e, formData) {
    console.log(`pick-up-stix | ContainerSoundConfigApplication ${this.appId} | _updateObject`);
    console.log([formData]);

    const flags: ItemFlags = duplicate(this.object.getFlag('pick-up-stix', 'pick-up-stix'));

    await updateEntity(this.object.uuid, {
      flags: {
        'pick-up-stix': {
          'pick-up-stix': {
            container: {
              ...formData
            }
          }
        }
      }
    });
  }

  getData(options) {
    console.log(`pick-up-stix | ContainerSoundConfigApplication ${this.appId} | getData`);
    const data = {
      openSoundPath: this.object.getFlag('pick-up-stix', 'pick-up-stix.container.soundOpenPath') ?? '',
      closeSoundPath: this.object.getFlag('pick-up-stix', 'pick-up-stix.container.soundClosePath') ?? ''
    }
    console.log(data);
    return data;
  }
}
